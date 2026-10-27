import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

// Placeholder list. The final list follows the bookies our converter API supports.
const bookies = ['SportyBet Nigeria', 'SportyBet Ghana', 'SportyBet Zambia', 'MSport Nigeria', 'MSport Ghana', 'Bet9ja', '1xBet Nigeria', 'BetKing Nigeria', 'Betway Nigeria', 'NairaBet']
const field = 'w-full rounded-lg border border-line bg-panel px-4 py-3 outline-none focus:border-brand'

export default function Converter() {
  const { user, setUser, loading } = useAuth()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  async function convert(e) {
    e.preventDefault()
    setError(''); setResult(null); setCopied(false)
    if (from === to) return setError('Choose two different bookies.')
    setBusy(true)
    try {
      const d = await api('/api/convert', { from, to, code })
      setResult(d)
      setUser((u) => ({ ...u, ...d.usage }))
    } catch (err) {
      setError(err.message)
      if (err.data?.usage) setUser((u) => ({ ...u, ...err.data.usage }))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => { await navigator.clipboard.writeText(result.newCode); setCopied(true) }
  const resets = user?.resetsAt && new Date(user.resetsAt).toLocaleString('en-NG', { weekday: 'short', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Bet code converter</h1>
      <p className="mt-3 text-paper/70">
        Convert a booking code from one bookie to another. Enter the code, choose the bookie it came from, choose the one you want to use, and we rebuild the slip there.
      </p>

      {!loading && !user ? (
        <div className="mt-8 rounded-2xl border border-brand/40 bg-panel p-6">
          <h2 className="font-display text-xl font-bold">Create a free account to convert</h2>
          <p className="mt-2 text-paper/70">Every account gets 3 free conversions a day.</p>
          <div className="mt-4 flex gap-3">
            <Link to="/signup" className="rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-brand">Sign up</Link>
            <Link to="/login" className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold hover:border-brand">Log in</Link>
          </div>
        </div>
      ) : (
        user && (
          <>
            <p className="mt-6 text-sm text-paper/70">
              {user.plan === 'pro' ? 'Unlimited conversions.' : `${user.left} of ${user.limit} free conversions left.${resets ? ` Resets ${resets}.` : ''}`}
            </p>
            <form onSubmit={convert} className="mt-3 space-y-5 rounded-2xl border border-line bg-panel p-5 sm:p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Convert from
                  <select className={`${field} mt-1 font-normal`} value={from} onChange={(e) => setFrom(e.target.value)} required>
                    <option value="" disabled>Enter bookie</option>
                    {bookies.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold">Convert to
                  <select className={`${field} mt-1 font-normal`} value={to} onChange={(e) => setTo(e.target.value)} required>
                    <option value="" disabled>Enter bookie</option>
                    {bookies.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-semibold">Booking code
                <input className={`${field} mt-1 font-normal uppercase tracking-wider`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter bookie code" required />
              </label>
              {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
              <button disabled={busy} className="w-full rounded-lg bg-brand-deep px-5 py-3 font-bold text-white hover:bg-brand disabled:opacity-60">
                {busy ? 'Converting…' : 'Convert'}
              </button>
            </form>
          </>
        )
      )}

      {result && (
        <div className="mt-6 rounded-2xl border border-brand p-5 sm:p-6" aria-live="polite">
          <p className="text-sm text-paper/60">Your {result.to} code</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-3xl font-bold tracking-wider text-brand">{result.newCode}</p>
            <button onClick={copy} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-brand">{copied ? 'Copied' : 'Copy code'}</button>
          </div>
          <p className="mt-3 text-sm text-paper/70">{result.converted} of {result.total} games converted.</p>
          {result.missing.length > 0 && (
            <div className="mt-4 rounded-xl border border-line bg-panel p-4">
              <p className="text-sm font-semibold">Not converted</p>
              <ul className="mt-2 space-y-2">
                {result.missing.map((m) => (
                  <li key={m.match} className="text-sm">
                    <span className="font-semibold">{m.match}</span> <span className="text-paper/60">({m.league}) · {m.pick}</span>
                    <p className="text-paper/60">{m.reason}.</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs text-paper/50">Sample result. Real conversions arrive when we connect the converter API.</p>
        </div>
      )}

      <p className="mt-6 text-xs text-paper/50">
        Bookies change their terms, markets and codes without notice, so some games may not convert. Always check your slip on the bookie before you place a bet. Bet responsibly. 18+.
      </p>
    </div>
  )
}
