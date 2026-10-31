import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const BOOKIES = ['SportyBet Nigeria', 'MSport Nigeria', 'Bet9ja', '1xBet Nigeria', 'BetKing Nigeria', 'Betway Nigeria', 'NairaBet']
const clock = (iso) => new Date(iso).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })

export default function Book() {
  const { state } = useLocation()
  const pick = state?.pick
  const { user, loading } = useAuth()
  const [bookie, setBookie] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  if (!pick) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Book your games</h1>
        <p className="mt-3 text-paper/70">Open a pick on the AI predictions page and tap “Book these games”.</p>
        <Link to="/predictions" className="mt-5 inline-block rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-brand">Go to predictions</Link>
      </div>
    )
  }

  async function generate() {
    setError(''); setResult(null); setCopied(false); setBusy(true)
    try {
      setResult(await api('/api/book', { bookie, games: pick.games.map((g) => ({ fixtureId: g.fixtureId, match: g.match, market: g.market, pick: g.pick, odds: g.odds })) }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => { await navigator.clipboard.writeText(result.code); setCopied(true) }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Book your games</h1>
      <p className="mt-3 text-paper/70">Choose your bookie and we’ll build one betslip code. Enter it on the bookie to load all the games at once.</p>

      <section className="mt-6 rounded-2xl border border-line bg-panel p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold">{pick.games.length} {pick.games.length === 1 ? 'game' : 'games'}</p>
          <span className="rounded-lg bg-brand/15 px-3 py-1 font-display font-bold text-brand">{pick.odds.toFixed(2)} odds</span>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {pick.games.map((g) => (
            <li key={g.fixtureId ?? g.match} className="py-3">
              <p className="text-xs text-brand">{g.league} · {clock(g.kickoff)}</p>
              <p className="font-semibold">{g.match}</p>
              <p className="text-sm text-paper/60">{g.market}: {g.pick}</p>
            </li>
          ))}
        </ul>
      </section>

      {!loading && !user ? (
        <div className="mt-6 rounded-2xl border border-brand/40 bg-panel p-6">
          <h2 className="font-display text-xl font-bold">Create a free account to book</h2>
          <div className="mt-4 flex gap-3">
            <Link to="/signup" className="rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-brand">Sign up</Link>
            <Link to="/login" className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold hover:border-brand">Log in</Link>
          </div>
        </div>
      ) : (
        <>
          <h2 className="mt-6 font-display text-xl font-bold">Choose your bookie</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Bookie">
            {BOOKIES.map((b) => (
              <button key={b} role="radio" aria-checked={bookie === b} onClick={() => setBookie(b)}
                className={`rounded-lg border px-3 py-3 text-sm font-semibold ${bookie === b ? 'border-brand bg-brand/15 text-brand' : 'border-line hover:border-brand'}`}>{b}</button>
            ))}
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          <button disabled={!bookie || busy} onClick={generate} className="mt-4 w-full rounded-lg bg-brand-deep px-5 py-3 font-bold text-white hover:bg-brand disabled:opacity-50">
            {busy ? 'Building your betslip…' : 'Generate betslip code'}
          </button>
        </>
      )}

      {result && (
        <div className="mt-6 rounded-2xl border border-brand p-5 sm:p-6" aria-live="polite">
          <p className="mb-2 inline-block rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-300">Demo result, not a real code</p>
          <p className="text-sm text-paper/60">Example {result.bookie} code</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-3xl font-bold tracking-wider text-brand">{result.code}</p>
            <button onClick={copy} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-brand">{copied ? 'Copied' : 'Copy code'}</button>
          </div>
          <p className="mt-3 text-xs text-paper/50">This demo code will not work on {result.bookie}. Real codes arrive once a betslip service is connected.</p>
        </div>
      )}

      <p className="mt-6 text-xs text-paper/50">Odds on your bookie may differ from the ones shown. Always check your slip before you place a bet. Bet responsibly. 18+.</p>
    </div>
  )
}
