import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2"

export type Role = "readonly" | "full"

/**
 * One Supabase Auth user per access role. Row level security reads the role
 * from `app_metadata.access_role`, which only the service role can set, so a
 * session is the only way to read or write project data.
 */
const ROLE_EMAIL: Record<Role, string> = {
  readonly: "readonly@access.engerjordet-118.invalid",
  full: "full@access.engerjordet-118.invalid",
}

function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

/**
 * Password for the role's auth user, derived from the session secret and the
 * role's access password. Rotating either one makes the next login miss, which
 * recreates the user and so revokes every session issued before.
 */
async function rolePassword(role: Role, secret: string): Promise<string> {
  const accessPassword =
    Deno.env.get(role === "full" ? "ACCESS_PASSWORD_FULL" : "ACCESS_PASSWORD_READONLY") ?? ""
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
    new TextEncoder().encode(`auth-user:${role}:${accessPassword}`),
  )
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

export type RoleSession = {
  access_token: string
  refresh_token: string
}

async function findUserId(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const hit = data.users.find((u) => u.email === email)
    if (hit) return hit.id
    if (data.users.length < 100) return null
  }
  return null
}

/** Create or repair the role's auth user, then sign in as it. */
export async function createRoleSession(
  role: Role,
  secret: string,
): Promise<RoleSession> {
  const admin = adminClient()
  const email = ROLE_EMAIL[role]
  const password = await rolePassword(role, secret)

  const signIn = () =>
    createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    ).auth.signInWithPassword({ email, password })

  let { data, error } = await signIn()
  // Only a wrong password means the user is missing or stale. Anything else
  // (rate limit, outage) must not delete it and log everyone out.
  if (error && error.code !== "invalid_credentials") throw error
  if (error || !data.session) {
    // Recreate rather than update: deleting the user revokes its sessions, so
    // a rotated password or a tampered account leaves no session behind.
    const existing = await findUserId(admin, email)
    if (existing) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(existing)
      if (deleteError) throw deleteError
    }
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { access_role: role },
    })
    // A concurrent login may have recreated it already; its password is the
    // same, so signing in below still works.
    if (createError && createError.code !== "email_exists") throw createError
    ;({ data, error } = await signIn())
    if (error || !data.session) throw error ?? new Error("no_session")
  }
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  }
}

/** Role from the caller's Supabase session, or null when it has none. */
export async function callerRole(req: Request): Promise<Role | null> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "")
  if (!jwt) return null
  const { data, error } = await adminClient().auth.getUser(jwt)
  if (error || !data.user) return null
  const role = data.user.app_metadata?.access_role
  return role === "readonly" || role === "full" ? role : null
}
