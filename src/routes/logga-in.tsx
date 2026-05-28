import { useState } from 'react'
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { getSupabaseBrowserClient } from '#/lib/supabase/browser'
import { fetchCurrentUser } from '#/lib/auth'
import googleIcon from '#/assets/icons/google.svg'
import { Brand } from '#/components/Brand'
import s from './auth.module.css'

export const Route = createFileRoute('/logga-in')({
  beforeLoad: async () => {
    const user = await fetchCurrentUser()
    if (user) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(translateAuthError(error.message))
      setBusy(false)
      return
    }
    await router.invalidate()
    router.navigate({ to: '/' })
  }

  async function onGoogle() {
    setBusy(true)
    setError(null)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(translateAuthError(error.message))
      setBusy(false)
    }
  }

  return (
    <div className={s.shell}>
      <div className={s.card}>
        <div className={s.brand}>
          <Brand />
        </div>
        <h1 className={s.title}>Välkommen tillbaka.</h1>
        <p className={s.sub}>Logga in för att fortsätta följa hur du mår.</p>

        {error ? <div className={s.error}>{error}</div> : null}

        <form className={s.form} onSubmit={onPasswordSubmit} style={{ marginTop: error ? 12 : 0 }}>
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
          <div className={s.field}>
            <label htmlFor="password">Lösenord</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={busy} className={`${s.btn} ${s.btnPrimary}`}>
            {busy ? 'Loggar in…' : 'Logga in'}
          </button>
        </form>

        <div className={s.divider}>eller</div>

        <button type="button" disabled={busy} onClick={onGoogle} className={s.btn}>
          <img src={googleIcon} alt="" width={16} height={16} />
          Fortsätt med Google
        </button>

        <p className={s.foot}>
          <Link to="/glomt-losenord">Glömt lösenordet?</Link>
        </p>
        <p className={s.foot} style={{ marginTop: 6 }}>
          Ny här? <Link to="/skapa-konto">Skapa ett konto</Link>
        </p>
      </div>
    </div>
  )
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'Fel e-post eller lösenord.'
  if (m.includes('email not confirmed')) return 'Din e-post är inte bekräftad än. Kolla inkorgen.'
  if (m.includes('rate limit')) return 'För många försök. Vänta en stund och prova igen.'
  return 'Något gick fel. Försök igen.'
}
