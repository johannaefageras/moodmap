import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createSupabaseServerClient } from '#/lib/supabase/server'

const exchangeCode = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ code: z.string().min(1) }))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(data.code)
    return { ok: !error, message: error?.message ?? null }
  })

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search) =>
    ({
      code: typeof search.code === 'string' ? search.code : undefined,
      error: typeof search.error_description === 'string' ? search.error_description : undefined,
    }) as { code?: string; error?: string },
  beforeLoad: async ({ search }) => {
    if (search.error) {
      throw redirect({ to: '/logga-in' })
    }
    if (search.code) {
      const result = await exchangeCode({ data: { code: search.code } })
      if (!result.ok) {
        throw redirect({ to: '/logga-in' })
      }
    }
    throw redirect({ to: '/' })
  },
  component: () => null,
})
