import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { deleteAccountServer, fetchCurrentUser } from '#/lib/auth'
import { getSupabaseBrowserClient } from '#/lib/supabase/browser'
import { Sidebar } from '#/components/Sidebar'
import s from './index.module.css'
import c from './konto.module.css'

export const Route = createFileRoute('/konto')({
  beforeLoad: async () => {
    const user = await fetchCurrentUser()
    if (!user) throw redirect({ to: '/logga-in' })
    return { user }
  },
  component: KontoPage,
})

function KontoPage() {
  const { user } = Route.useRouteContext()
  return (
    <div className={`${s.app} ${s.appTwoCol}`}>
      <Sidebar user={user} active="konto" />
      <main className={s.main}>
        <div className={c.wrap}>
          <header className={c.head}>
            <h1>Konto</h1>
            <p>Hantera dina uppgifter, ditt lösenord och ditt konto.</p>
          </header>
          <ProfileSection
            initialName={
              (user.user_metadata?.name as string | undefined) ??
              (user.user_metadata?.full_name as string | undefined) ??
              ''
            }
            initialEmail={user.email ?? ''}
          />
          <PasswordSection />
          <AccountInfoSection
            provider={providerLabel(user)}
            createdAt={user.created_at ?? null}
          />
          <DangerSection />
        </div>
      </main>
    </div>
  )
}

function providerLabel(user: { app_metadata?: { provider?: string } }): string {
  const p = user.app_metadata?.provider
  if (p === 'google') return 'Google'
  if (p === 'email') return 'E-post och lösenord'
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : 'E-post och lösenord'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function Status({ error, info }: { error: string | null; info: string | null }) {
  if (error) return <div className={c.error}>{error}</div>
  if (info) return <div className={c.info}>{info}</div>
  return null
}

function ProfileSection({
  initialName,
  initialEmail,
}: {
  initialName: string
  initialEmail: string
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const dirty = name.trim() !== initialName.trim() || email.trim() !== initialEmail.trim()
  const emailChanged = email.trim() !== initialEmail.trim()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({
      data: { name: name.trim() },
      ...(emailChanged ? { email: email.trim() } : {}),
    })
    setBusy(false)
    if (error) {
      setError(translateAuthError(error.message))
      return
    }
    setInfo(
      emailChanged
        ? 'Sparat. Bekräfta din nya e-post via länken vi skickat till både den gamla och nya adressen.'
        : 'Dina uppgifter är sparade.',
    )
    await router.invalidate()
  }

  return (
    <section className={c.card}>
      <div className={c.cardHead}>
        <h2>Profil</h2>
        <p>Ditt namn visas i appen. E-posten används för att logga in.</p>
      </div>
      <Status error={error} info={info} />
      <form className={c.form} onSubmit={onSubmit}>
        <div className={c.field}>
          <label htmlFor="name">Namn</label>
          <input
            id="name"
            type="text"
            className={c.input}
            value={name}
            placeholder="Ditt namn"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className={c.field}>
          <label htmlFor="email">E-post</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={c.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={c.actions}>
          <button
            type="submit"
            disabled={busy || !dirty}
            className={`${c.btn} ${c.btnPrimary}`}
          >
            {busy ? 'Sparar…' : 'Spara ändringar'}
          </button>
        </div>
      </form>
    </section>
  )
}

function PasswordSection() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (password !== confirm) {
      setError('Lösenorden matchar inte.')
      return
    }
    setBusy(true)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setError(translateAuthError(error.message))
      return
    }
    setPassword('')
    setConfirm('')
    setInfo('Ditt lösenord är uppdaterat.')
  }

  return (
    <section className={c.card}>
      <div className={c.cardHead}>
        <h2>Lösenord</h2>
        <p>Välj ett nytt lösenord, minst 8 tecken.</p>
      </div>
      <Status error={error} info={info} />
      <form className={c.form} onSubmit={onSubmit}>
        <div className={c.field}>
          <label htmlFor="new-password">Nytt lösenord</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={c.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className={c.field}>
          <label htmlFor="confirm-password">Bekräfta lösenord</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={c.input}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <div className={c.actions}>
          <button
            type="submit"
            disabled={busy || password.length === 0}
            className={`${c.btn} ${c.btnPrimary}`}
          >
            {busy ? 'Sparar…' : 'Uppdatera lösenord'}
          </button>
        </div>
      </form>
    </section>
  )
}

function AccountInfoSection({
  provider,
  createdAt,
}: {
  provider: string
  createdAt: string | null
}) {
  return (
    <section className={c.card}>
      <div className={c.cardHead}>
        <h2>Kontoinformation</h2>
      </div>
      <dl className={c.infoList}>
        <div className={c.infoRow}>
          <dt>Inloggningsmetod</dt>
          <dd>{provider}</dd>
        </div>
        <div className={c.infoRow}>
          <dt>Medlem sedan</dt>
          <dd>{createdAt ? formatDate(createdAt) : '—'}</dd>
        </div>
      </dl>
    </section>
  )
}

function DangerSection() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete() {
    setBusy(true)
    setError(null)
    try {
      await deleteAccountServer()
      await router.invalidate()
      router.navigate({ to: '/logga-in' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
      setBusy(false)
    }
  }

  return (
    <section className={`${c.card} ${c.danger}`}>
      <div className={c.cardHead}>
        <h2>Radera konto</h2>
        <p>Detta tar bort ditt konto och all din data permanent. Det går inte att ångra.</p>
      </div>
      {error ? <div className={c.error}>{error}</div> : null}
      {confirming ? (
        <div className={c.actions}>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className={`${c.btn} ${c.btnDanger}`}
          >
            {busy ? 'Raderar…' : 'Ja, radera mitt konto'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            className={c.btn}
          >
            Avbryt
          </button>
        </div>
      ) : (
        <div className={c.actions}>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`${c.btn} ${c.btnDangerOutline}`}
          >
            Radera konto
          </button>
        </div>
      )}
    </section>
  )
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('password') && m.includes('should be')) return 'Lösenordet måste vara minst 8 tecken.'
  if (m.includes('same as the old')) return 'Det nya lösenordet får inte vara samma som det gamla.'
  if (m.includes('email') && m.includes('already')) return 'Den här e-posten används redan.'
  if (m.includes('invalid') && m.includes('email')) return 'Ogiltig e-postadress.'
  if (m.includes('rate limit')) return 'För många försök. Vänta en stund och prova igen.'
  return 'Något gick fel. Försök igen.'
}
