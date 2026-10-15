import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000

type Role = "readonly" | "full"

type Body =
  | { action: "login"; password: string }
  | { action: "validate"; token: string }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function timingEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function resolveRole(password: string): Role | null {
  const full = Deno.env.get("ACCESS_PASSWORD_FULL") ?? ""
  const ro = Deno.env.get("ACCESS_PASSWORD_READONLY") ?? ""
  if (full.length > 0 && timingEqual(password, full)) return "full"
  if (ro.length > 0 && timingEqual(password, ro)) return "readonly"
  return null
}

function base64UrlEncode(bytes: Uint8Array): string {
  const bin = String.fromCharCode(...bytes)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4))
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function signPayload(payloadB64: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64),
  )
  return base64UrlEncode(new Uint8Array(sig))
}

async function createToken(role: Role, secret: string): Promise<string> {
  const payload = {
    role,
    exp: Date.now() + SESSION_TTL_MS,
  }
  const payloadB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  )
  const sig = await signPayload(payloadB64, secret)
  return `${payloadB64}.${sig}`
}

async function verifyToken(
  token: string,
  secret: string,
): Promise<Role | null> {
  const dot = token.indexOf(".")
  if (dot <= 0) return null
  const payloadB64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = await signPayload(payloadB64, secret)
  if (!timingEqual(sig, expected)) return null
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64)),
    ) as { role?: Role; exp?: number }
    if (payload.role !== "readonly" && payload.role !== "full") return null
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null
    return payload.role
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405)
  }

  const sessionSecret = Deno.env.get("ACCESS_SESSION_SECRET") ?? ""
  const full = Deno.env.get("ACCESS_PASSWORD_FULL") ?? ""
  const ro = Deno.env.get("ACCESS_PASSWORD_READONLY") ?? ""
  if (!sessionSecret || (!full && !ro)) {
    return json({ error: "not_configured" }, 503)
  }
  if (full.length > 0 && ro.length > 0 && timingEqual(full, ro)) {
    return json({ error: "passwords_must_differ" }, 503)
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return json({ error: "invalid_json" }, 400)
  }

  if (body.action === "login") {
    const password = body.password ?? ""
    if (!password) return json({ error: "missing_password" }, 400)
    const role = resolveRole(password)
    if (!role) {
      await new Promise((r) => setTimeout(r, 400))
      return json({ error: "invalid_credentials" }, 401)
    }
    const token = await createToken(role, sessionSecret)
    return json({ role, token })
  }

  if (body.action === "validate") {
    const token = body.token ?? ""
    if (!token) return json({ error: "missing_token" }, 400)
    const role = await verifyToken(token, sessionSecret)
    if (!role) return json({ error: "invalid_token" }, 401)
    return json({ role })
  }

  return json({ error: "unknown_action" }, 400)
})
