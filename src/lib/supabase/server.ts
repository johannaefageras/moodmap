import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import { getRequest, setCookie } from '@tanstack/react-start/server'
import { env } from '#/env'

export function createSupabaseServerClient() {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
    )
  }
  const request = getRequest()
  return createServerClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        const header = request.headers.get('cookie') ?? ''
        return parseCookieHeader(header).map(({ name, value }) => ({
          name,
          value: value ?? '',
        }))
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          setCookie(name, value, options)
        }
      },
    },
  })
}
