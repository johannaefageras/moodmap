import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import { env } from '#/env'
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

export const deleteAccountServer = createServerFn({ method: 'POST' }).handler(async () => {
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Kontoradering är inte konfigurerad.')
  }
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Inte inloggad')

  const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  // entries has no guaranteed ON DELETE CASCADE, so clear it first; ai_outputs cascades.
  await admin.from('entries').delete().eq('user_id', user.id)
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) throw new Error(deleteError.message)

  await supabase.auth.signOut()
  return { ok: true as const }
})
