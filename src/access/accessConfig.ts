export type AccessRole = 'none' | 'readonly' | 'full'

const TOKEN_KEY = 'engerjordet-access-token'
const ACTOR_KEY = 'engerjordet-access-actor'

export function accessAuthEnabled(): boolean {
  return import.meta.env.VITE_ACCESS_AUTH === 'true'
}

export function loadStoredAccessToken(): string | null {
  try {
    const t = sessionStorage.getItem(TOKEN_KEY)
    return t && t.length > 0 ? t : null
  } catch {
    return null
  }
}

export function storeAccessToken(token: string, actor?: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
    if (actor?.trim()) sessionStorage.setItem(ACTOR_KEY, actor.trim())
  } catch {
    /* ignore */
  }
}

export function loadStoredAccessActor(): string | null {
  try {
    const a = sessionStorage.getItem(ACTOR_KEY)
    return a && a.length > 0 ? a : null
  } catch {
    return null
  }
}

export function clearStoredAccessToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(ACTOR_KEY)
  } catch {
    /* ignore */
  }
}
