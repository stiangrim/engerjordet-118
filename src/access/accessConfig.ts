export type AccessRole = 'none' | 'readonly' | 'full'

const TOKEN_KEY = 'engerjordet-access-token'

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

export function storeAccessToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* ignore */
  }
}

export function clearStoredAccessToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}
