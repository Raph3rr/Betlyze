import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import PasswordInput from '../components/PasswordInput'

const field = 'w-full rounded-lg border border-line bg-panel px-4 py-3 outline-none focus:border-brand'

function Section({ title, children }) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
    <span className="text-paper/60">{label}</span>
    <span className="break-all text-right font-semibold">{value}</span>
  </div>
)

export default function Settings() {
  const { user, loading, logout } = useAuth()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return null
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Settings</h1>
        <p className="mt-3 text-paper/70">Log in to see your account and plan.</p>
        <div className="mt-5 flex gap-3">
          <Link to="/login" className="rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-brand">Log in</Link>
          <Link to="/signup" className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold hover:border-brand">Sign up</Link>
        </div>
      </div>
    )
  }

  const resets = user.resetsAt && new Date(user.resetsAt).toLocaleString('en-NG', { weekday: 'short', hour: 'numeric', minute: '2-digit' })

  async function change(e) {
    e.preventDefault()
    setMsg(''); setError(''); setBusy(true)
    try {
      await api('/api/password', form)
      setMsg('Password changed.')
      setForm({ currentPassword: '', newPassword: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Settings</h1>

      <Section title="Account">
        <Row label="Username" value={user.username} />
        <Row label="Email" value={user.email} />
      </Section>

      <Section title="Plan and usage">
        <Row label="Plan" value={user.plan === 'pro' ? 'Pro' : 'Free'} />
        {user.plan === 'pro' ? (
          <Row label="Conversions" value="Unlimited" />
        ) : (
          <>
            <Row label="Conversions left" value={`${user.left} of ${user.limit}`} />
            <Row label="Resets" value={resets || 'After your next conversion'} />
            <p className="mt-3 text-sm text-paper/60">Pro subscriptions are not available yet. We will announce them here.</p>
          </>
        )}
      </Section>

      <Section title="Change password">
        <form onSubmit={change} className="space-y-4">
          <label className="block text-sm font-semibold">Current password
            <PasswordInput className={`${field} font-normal`} value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} autoComplete="current-password" required />
          </label>
          <label className="block text-sm font-semibold">New password
            <PasswordInput className={`${field} font-normal`} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} autoComplete="new-password" minLength={8} required />
          </label>
          {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          {msg && <p role="status" className="rounded-lg border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-brand">{msg}</p>}
          <button disabled={busy} className="rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-brand disabled:opacity-60">{busy ? 'Saving…' : 'Change password'}</button>
        </form>
      </Section>

      <button onClick={logout} className="mt-6 rounded-lg border border-line px-5 py-2.5 text-sm font-semibold hover:border-brand">Log out</button>
    </div>
  )
}
