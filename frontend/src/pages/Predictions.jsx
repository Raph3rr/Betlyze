import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { dayTabs } from '../components/PicksByDay'

const clock = (t) => {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

function Pick({ n, pick, open, onToggle }) {
  return (
    <li className="rounded-2xl border border-line bg-panel">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-4 p-4 text-left sm:px-6">
        <div>
          <p className="font-display text-lg font-bold">Pick {n}</p>
          <p className="text-sm text-paper/60">Starts {clock(pick.start)} · {pick.games.length} {pick.games.length === 1 ? 'game' : 'games'}</p>
        </div>
        <span className="rounded-lg bg-brand/15 px-3 py-1 font-display font-bold text-brand">{pick.odds.toFixed(2)} odds</span>
      </button>
      {open && (
        <div className="border-t border-line p-4 sm:px-6">
          <ul className="divide-y divide-line">
            {pick.games.map((g) => (
              <li key={g.match} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-xs text-brand">{g.league} · {clock(g.t)}</p>
                  <p className="font-semibold">{g.match}</p>
                  <p className="text-sm text-paper/60">{g.pick}</p>
                </div>
                <span className="font-semibold">{g.odds.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <Link to="/converter" className="mt-4 inline-block rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-brand">Book these games</Link>
        </div>
      )}
    </li>
  )
}

export default function Predictions() {
  const { user } = useAuth()
  const tabs = dayTabs()
  const [day, setDay] = useState(1)
  const [cat, setCat] = useState(2)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    if (day === 0) return setData(null)
    let live = true
    setLoading(true); setError(''); setOpenId(null)
    api(`/api/predictions?day=${day - 1}`)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false))
    return () => { live = false }
  }, [day, user?.plan])

  const current = data?.categories.find((c) => c.odds === cat)

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">AI predictions</h1>
      <p className="mt-3 max-w-xl text-paper/70">Pick a day, pick an odds category, then open a pick to see its games and book them.</p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t, i) => (
          <button key={t.label} onClick={() => setDay(i)} className={`shrink-0 rounded-lg border px-4 py-2 text-left text-sm ${day === i ? 'border-brand bg-brand-deep text-white' : 'border-line hover:border-brand'}`}>
            <span className="block font-semibold">{t.label}</span>
            <span className={day === i ? 'text-white/70' : 'text-paper/60'}>{t.date}</span>
          </button>
        ))}
      </div>

      {day === 0 ? (
        <p className="mt-6 rounded-2xl border border-line bg-panel p-6 text-paper/70">
          Yesterday’s results show here once the games finish, so you can check every pick against the final score.
        </p>
      ) : (
        <>
          {data && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Odds categories">
              {data.categories.map((c) => (
                <button key={c.odds} role="tab" aria-selected={cat === c.odds} onClick={() => { setCat(c.odds); setOpenId(null) }}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold ${cat === c.odds ? 'border-brand bg-brand/15 text-brand' : 'border-line text-paper/70 hover:border-brand'}`}>
                  {c.odds} odds{c.locked && <span className="ml-1.5 text-xs font-normal text-paper/50">Pro</span>}
                </button>
              ))}
            </div>
          )}

          {error && <p role="alert" className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          {loading && !data && <p className="mt-6 text-paper/60">Loading predictions…</p>}
          {current && !current.locked && (current.picks.length === 0
            ? <p className="mt-6 text-paper/70">No picks available for this category yet.</p>
            : <ul className="mt-5 space-y-3">{current.picks.map((p, i) => <Pick key={p.id} n={i + 1} pick={p} open={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} />)}</ul>)}
          {current?.locked && (
            <div className="relative mt-5">
              <ul className="pointer-events-none select-none space-y-3 blur-sm" aria-hidden="true">
                {Array.from({ length: current.count }, (_, i) => (
                  <li key={i} className="flex items-center justify-between rounded-2xl border border-line bg-panel p-4 sm:px-6">
                    <div><p className="font-display text-lg font-bold">Pick {i + 1}</p><p className="text-sm text-paper/60">Starts 3:00 PM · 4 games</p></div>
                    <span className="rounded-lg bg-brand/15 px-3 py-1 font-bold text-brand">{current.odds}.00 odds</span>
                  </li>
                ))}
              </ul>
              <div className="absolute inset-0 flex items-center justify-center">
                <Link to={user ? '/settings' : '/signup'} className="rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-brand">Pro members only</Link>
              </div>
            </div>
          )}
        </>
      )}
      <p className="mt-6 text-xs text-paper/50">Sample data for design only. Predictions are probabilities, not guarantees. Bet responsibly. 18+.</p>
    </div>
  )
}
