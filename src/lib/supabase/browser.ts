import { createBrowserClient } from '@supabase/ssr'
import { env } from '#/env'

let cached: ReturnType<typeof createBrowserClient> | undefined

export function getSupabaseBrowserClient() {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
    )
  }
  if (!cached) {
    cached = createBrowserClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
  }
  return cached
}
