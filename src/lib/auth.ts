import { createServerFn } from '@tanstack/react-start'
import { createSupabaseServerClient } from './supabase/server'

export const fetchCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) return null
  return user
})

export const signOutServer = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  return { ok: true as const }
})
