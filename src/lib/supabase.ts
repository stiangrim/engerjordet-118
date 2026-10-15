import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Mangler VITE_SUPABASE_URL eller VITE_SUPABASE_ANON_KEY. Kopier .env.local.example til .env.local og fyll inn verdiene.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
