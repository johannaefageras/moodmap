import { useState } from 'react'
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { getSupabaseBrowserClient } from '#/lib/supabase/browser'
import { fetchCurrentUser } from '#/lib/auth'
import googleIcon from '#/assets/icons/google.svg'
import { Brand } from '#/components/Brand'
import s from './auth.module.css'

export const Route = createFileRoute('/skapa-konto')({
  beforeLoad: async () => {
    const user = await fetchCurrentUser()
    if (user) throw redirect({ to: '/' })
  },
  component: SignupPage,
})

function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(translateAuthError(error.message))
      setBusy(false)
      return
    }
    // If email confirmations are on, the user must verify before a session exists.
    if (!data.session) {
      setInfo('Konto skapat. Kolla din inkorg — vi har skickat en bekräftelse-länk.')
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
        <h1 className={s.title}>Skapa ditt konto.</h1>
        <p className={s.sub}>Det tar en halv minut. Ingen data delas med någon.</p>

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
          <div className={s.field}>
            <label htmlFor="password">Lösenord (minst 8 tecken)</label>
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
            {busy ? 'Skapar konto…' : 'Skapa konto'}
          </button>
        </form>

        <div className={s.divider}>eller</div>

        <button type="button" disabled={busy} onClick={onGoogle} className={s.btn}>
          <img src={googleIcon} alt="" width={16} height={16} />
          Fortsätt med Google
        </button>

        <p className={s.foot}>
          Har du redan ett konto? <Link to="/logga-in">Logga in</Link>
        </p>
      </div>
    </div>
  )
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('already registered') || m.includes('user already'))
    return 'Den här e-posten finns redan. Försök logga in istället.'
  if (m.includes('password')) return 'Lösenordet uppfyller inte kraven (minst 8 tecken).'
  if (m.includes('rate limit')) return 'För många försök. Vänta en stund och prova igen.'
  return 'Något gick fel. Försök igen.'
}
