export type AccessRole = 'readonly' | 'full'

type LoginOk = { role: AccessRole; token: string; actor: string }

export type LoginResult = LoginOk | 'unavailable' | null

async function callVerifyAccess(
  body: Record<string, string>,
): Promise<Response> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  return fetch(`${url}/functions/v1/verify-access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    },
    body: JSON.stringify(body),
  })
}

export async function loginWithPassword(password: string): Promise<LoginResult> {
  let res: Response
  try {
    res = await callVerifyAccess({ action: 'login', password })
  } catch {
    return 'unavailable'
  }
  if (res.status === 503) return 'unavailable'
  if (res.status === 401) return null
  if (!res.ok) return 'unavailable'
  const data = (await res.json()) as LoginOk
  if (
    (data.role !== 'readonly' && data.role !== 'full') ||
    typeof data.token !== 'string' ||
    typeof data.actor !== 'string'
  ) {
    return null
  }
  return data
}

export type ValidatedSession = { role: AccessRole; actor: string }

export async function validateSessionToken(
  token: string,
): Promise<ValidatedSession | null> {
  let res: Response
  try {
    res = await callVerifyAccess({ action: 'validate', token })
  } catch {
    return null
  }
  if (!res.ok) return null
  const data = (await res.json()) as { role?: AccessRole; actor?: string }
  if (data.role !== 'readonly' && data.role !== 'full') return null
  if (typeof data.actor !== 'string' || !data.actor.trim()) return null
  return { role: data.role, actor: data.actor.trim() }
}
