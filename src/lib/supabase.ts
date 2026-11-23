import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Mangler VITE_SUPABASE_URL eller VITE_SUPABASE_ANON_KEY. Kopier .env.local.example til .env.local og fyll inn verdiene.',
  )
}

// The access login hands back a Supabase session for the password's role;
// row level security only lets that session read or write. Keep it in
// sessionStorage, like the access token, so a closed tab means a new login.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window === 'undefined' ? undefined : window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})
