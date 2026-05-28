import { useState } from 'react'
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createSupabaseServerClient } from '#/lib/supabase/server'
import { getSupabaseBrowserClient } from '#/lib/supabase/browser'
import { fetchCurrentUser } from '#/lib/auth'
import { Brand } from '#/components/Brand'
import s from './auth.module.css'

const exchangeCode = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ code: z.string().min(1) }))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(data.code)
    return { ok: !error }
  })

export const Route = createFileRoute('/aterstall-losenord')({
  validateSearch: (search) =>
    ({
      code: typeof search.code === 'string' ? search.code : undefined,
      error: typeof search.error_description === 'string' ? search.error_description : undefined,
    }) as { code?: string; error?: string },
  beforeLoad: async ({ search }) => {
    if (search.error) {
      throw redirect({ to: '/glomt-losenord' })
    }
    if (search.code) {
      const result = await exchangeCode({ data: { code: search.code } })
      if (!result.ok) {
        throw redirect({ to: '/glomt-losenord' })
      }
      // Land on the same route without the code in the URL.
      throw redirect({ to: '/aterstall-losenord' })
    }
    const user = await fetchCurrentUser()
    if (!user) throw redirect({ to: '/glomt-losenord' })
  },
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setError(translateAuthError(error.message))
      return
    }
    await router.invalidate()
    router.navigate({ to: '/' })
  }

  return (
    <div className={s.shell}>
      <div className={s.card}>
        <div className={s.brand}>
          <Brand />
        </div>
        <h1 className={s.title}>Välj ett nytt lösenord.</h1>
        <p className={s.sub}>Minst 8 tecken. Du loggas in direkt efteråt.</p>

        {error ? <div className={s.error}>{error}</div> : null}

        <form className={s.form} onSubmit={onSubmit} style={{ marginTop: error ? 12 : 0 }}>
          <div className={s.field}>
            <label htmlFor="password">Nytt lösenord</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={busy} className={`${s.btn} ${s.btnPrimary}`}>
            {busy ? 'Sparar…' : 'Spara nytt lösenord'}
          </button>
        </form>

        <p className={s.foot}>
          <Link to="/logga-in">Tillbaka till inloggning</Link>
        </p>
      </div>
    </div>
  )
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('password')) return 'Lösenordet uppfyller inte kraven (minst 8 tecken).'
  if (m.includes('same as the old')) return 'Det nya lösenordet får inte vara samma som det gamla.'
  if (m.includes('rate limit')) return 'För många försök. Vänta en stund och prova igen.'
  return 'Något gick fel. Försök igen.'
}
