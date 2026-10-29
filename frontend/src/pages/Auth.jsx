import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import PasswordInput from '../components/PasswordInput'

const field = 'w-full rounded-lg border border-line bg-panel px-4 py-3 outline-none focus:border-brand'

export default function Auth({ mode }) {
  const isSignup = mode === 'signup'
  const { signup, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await (isSignup ? signup : login)(form)
      navigate('/converter')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-bold">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
      <p className="mt-2 text-paper/70">
        {isSignup ? 'Sign up to get 3 free conversions every day.' : 'Log in to convert codes and see your picks.'}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {isSignup && (
          <label className="block text-sm font-semibold">Username
            <input className={`${field} mt-1 font-normal`} value={form.username} onChange={set('username')} autoComplete="username" required />
          </label>
        )}
        <label className="block text-sm font-semibold">Email
          <input type="email" className={`${field} mt-1 font-normal`} value={form.email} onChange={set('email')} autoComplete="email" required />
        </label>
        <label className="block text-sm font-semibold">Password
          <PasswordInput className={`${field} font-normal`} value={form.password} onChange={set('password')} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={isSignup ? 8 : undefined} required />
        </label>
        {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-brand-deep px-5 py-3 font-bold text-white hover:bg-brand disabled:opacity-60">
          {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
        </button>
      </form>
      <p className="mt-5 text-sm text-paper/70">
        {isSignup ? 'Already have an account? ' : 'New to Betlyze? '}
        <Link to={isSignup ? '/login' : '/signup'} className="font-semibold text-brand hover:underline">{isSignup ? 'Log in' : 'Sign up'}</Link>
      </p>
    </div>
  )
}
