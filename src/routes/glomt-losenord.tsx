import { useState } from 'react'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { getSupabaseBrowserClient } from '#/lib/supabase/browser'
import { fetchCurrentUser } from '#/lib/auth'
import { Brand } from '#/components/Brand'
import s from './auth.module.css'

export const Route = createFileRoute('/glomt-losenord')({
  beforeLoad: async () => {
    const user = await fetchCurrentUser()
    if (user) throw redirect({ to: '/' })
  },
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/aterstall-losenord`,
    })
    setBusy(false)
    if (error) {
      setError(translateAuthError(error.message))
      return
    }
    setInfo(
      'Om e-posten finns hos oss har vi skickat en länk för att återställa lösenordet. Kolla din inkorg.',
    )
  }

  return (
    <div className={s.shell}>
      <div className={s.card}>
        <div className={s.brand}>
          <Brand />
        </div>
        <h1 className={s.title}>Glömt lösenordet?</h1>
        <p className={s.sub}>
          Skriv in din e-post så skickar vi en länk för att välja ett nytt.
        </p>

        {error ? <div className={s.error}>{error}</div> : null}
        {info ? <div className={s.info}>{info}</div> : null}

        <form className={s.form} onSubmit={onSubmit} style={{ marginTop: error || info ? 12 : 0 }}>
          <div className={s.field}>
            <label htmlFor="email">E-post</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" disabled={busy} className={`${s.btn} ${s.btnPrimary}`}>
            {busy ? 'Skickar…' : 'Skicka återställningslänk'}
          </button>
        </form>

        <p className={s.foot}>
          Kom du på det? <Link to="/logga-in">Tillbaka till inloggning</Link>
        </p>
      </div>
    </div>
  )
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('rate limit')) return 'För många försök. Vänta en stund och prova igen.'
  return 'Något gick fel. Försök igen.'
}
