import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { Brand } from './Brand'
import { signOutServer } from '#/lib/auth'
import s from './Sidebar.module.css'

type SidebarUser = {
  email?: string | null
  user_metadata?: { name?: string; full_name?: string }
}

export type SidebarKey = 'oversikt' | 'historik' | 'insikter' | 'dagbok' | 'installningar' | 'konto'

type NavItem = {
  key: SidebarKey
  label: string
  to?: '/' | '/historik' | '/insikter' | '/konto'
}

const ITEMS: NavItem[] = [
  { key: 'oversikt', label: 'Översikt', to: '/' },
  { key: 'historik', label: 'Historik', to: '/historik' },
  { key: 'insikter', label: 'Insikter', to: '/insikter' },
  { key: 'dagbok', label: 'Dagbok' },
  { key: 'installningar', label: 'Inställningar' },
  { key: 'konto', label: 'Konto', to: '/konto' },
]

export function Sidebar({ user, active }: { user: SidebarUser; active: SidebarKey }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const displayName =
    user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email ?? 'Du'
  const initial = displayName.trim().charAt(0).toUpperCase() || '·'

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function onSignOut() {
    await signOutServer()
    await router.invalidate()
    router.navigate({ to: '/logga-in' })
  }

  return (
    <>
      <button
        type="button"
        className={s.hamburger}
        aria-label="Öppna meny"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">☰</span>
      </button>
      {open ? (
        <div className={s.backdrop} role="presentation" onClick={() => setOpen(false)} />
      ) : null}
      <aside className={`${s.sidebar} ${open ? s.sidebarOpen : ''}`}>
        <div className={s.brand}>
          <Brand />
        </div>
        <nav className={s.nav}>
          {ITEMS.map((it) => {
            const isActive = it.key === active
            const className = isActive ? s.navActive : undefined
            if (it.to) {
              return (
                <Link
                  key={it.key}
                  to={it.to}
                  className={className}
                  onClick={() => setOpen(false)}
                >
                  <span className={s.navIco} />
                  {it.label}
                </Link>
              )
            }
            return (
              <a key={it.key} href="#" className={className}>
                <span className={s.navIco} />
                {it.label}
              </a>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={onSignOut}
          className={s.sidebarFoot}
          style={{ font: 'inherit', cursor: 'pointer', textAlign: 'left' }}
        >
          <div className={s.avatar}>{initial}</div>
          <div className={s.who}>
            <span>{displayName}</span>
            <small>Logga ut</small>
          </div>
        </button>
      </aside>
    </>
  )
}
