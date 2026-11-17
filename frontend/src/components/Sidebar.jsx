import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../AuthContext'

const links = [
  { to: '/', label: 'Home' },
  { to: '/converter', label: 'Bet Converter' },
  { to: '/predictions', label: 'AI Predictions' },
  { to: '/settings', label: 'Settings' },
]

function ThemeButton({ theme, onClick }) {
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button onClick={onClick} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-paper/80 transition-colors hover:border-brand hover:bg-paper/5">
      {theme === 'dark' ? (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
      ) : (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.8 14.2A8.5 8.5 0 0 1 9.8 3.2 8.6 8.6 0 1 0 20.8 14.2Z" />
        </svg>
      )}
    </button>
  )
}

export default function Sidebar({ theme = 'dark', onToggleTheme = () => {} }) {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const close = () => setOpen(false)

  return (
    <>
      {/* Phone and tablet: top bar with hamburger */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-ink px-5 lg:hidden">
        <Link to="/" onClick={close} aria-label="Betlyze home">
          <Logo size={32} />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeButton theme={theme} onClick={onToggleTheme} />
          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="rounded-lg p-2 hover:bg-paper/5"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </header>

      {/* Sidebar on desktop, slide-in drawer on phone */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-64 flex-col justify-between border-r border-line bg-ink p-5 pt-20 transition-transform lg:translate-x-0 lg:pt-8 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-8">
          <Link to="/" aria-label="Betlyze home" className="hidden lg:block">
            <Logo />
          </Link>
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={close}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-brand-deep text-white' : 'text-paper/70 hover:bg-paper/5 hover:text-paper'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-2">
          <ThemeButton theme={theme} onClick={onToggleTheme} />
          {user ? (
            <>
              <p className="truncate px-1 text-sm text-paper/70">Signed in as <span className="font-semibold text-paper">{user.username}</span></p>
              <button onClick={() => { logout(); close() }} className="rounded-lg border border-line px-4 py-3 text-center text-sm font-semibold hover:border-brand">Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={close} className="rounded-lg border border-line px-4 py-3 text-center text-sm font-semibold hover:border-brand">Log in</Link>
              <Link to="/signup" onClick={close} className="rounded-lg bg-brand-deep px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand">Sign up</Link>
            </>
          )}
        </div>
      </aside>

      {open && <button aria-label="Close menu" onClick={close} className="fixed inset-0 z-10 bg-black/70 lg:hidden" />}
    </>
  )
}
