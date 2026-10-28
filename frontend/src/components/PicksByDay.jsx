import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

// Sample data only. Real accumulators come later from football data + AI models.
const accas = [
  { id: 1, time: '9:00 AM', games: [
    { league: 'Premier League', match: 'Arsenal vs Chelsea', pick: 'Home or draw', odds: 1.45 },
    { league: 'La Liga', match: 'Real Madrid vs Getafe', pick: 'Home win', odds: 1.5 },
    { league: 'Serie A', match: 'Inter vs Torino', pick: 'Over 1.5 goals', odds: 1.38 } ] },
  { id: 2, time: '9:00 AM', games: [
    { league: 'Bundesliga', match: 'Bayern vs Mainz', pick: 'Home win', odds: 1.6 },
    { league: 'Eredivisie', match: 'Ajax vs PSV', pick: 'Both teams to score', odds: 1.55 },
    { league: 'Ligue 1', match: 'PSG vs Nantes', pick: 'Over 1.5 goals', odds: 1.5 },
    { league: 'Serie A', match: 'Napoli vs Genoa', pick: 'Home or draw', odds: 1.4 } ] },
  { id: 3, time: '12:30 PM', games: [
    { league: 'Premier League', match: 'Liverpool vs Wolves', pick: 'Home win', odds: 1.7 },
    { league: 'La Liga', match: 'Barcelona vs Sevilla', pick: 'Home win', odds: 1.6 },
    { league: 'Bundesliga', match: 'Leverkusen vs Köln', pick: 'Home win', odds: 1.55 },
    { league: 'Serie A', match: 'Roma vs Lecce', pick: 'Over 1.5 goals', odds: 1.5 },
    { league: 'Ligue 1', match: 'Lyon vs Brest', pick: 'Home or draw', odds: 1.6 } ] },
  { id: 4, time: '4:00 PM', games: [
    { league: 'Premier League', match: 'Man City vs Brentford', pick: 'Home win', odds: 1.8 },
    { league: 'La Liga', match: 'Atlético vs Valencia', pick: 'Home win', odds: 1.7 },
    { league: 'Serie A', match: 'Juventus vs Verona', pick: 'Home win', odds: 1.6 },
    { league: 'Bundesliga', match: 'Dortmund vs Bochum', pick: 'Home win', odds: 1.5 },
    { league: 'Eredivisie', match: 'Feyenoord vs Utrecht', pick: 'Home win', odds: 1.4 },
    { league: 'Ligue 1', match: 'Monaco vs Reims', pick: 'Home or draw', odds: 1.45 } ] },
]

const totalOdds = (games) => games.reduce((t, g) => t * g.odds, 1).toFixed(2)

export function dayTabs() {
  return [-1, 0, 1, 2, 3].map((offset) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    const label = offset === -1 ? 'Yesterday' : offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-NG', { weekday: 'long' })
    return { label, date: d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) }
  })
}

function AccaHeader({ n, acca }) {
  return (
    <>
      <div>
        <p className="font-display text-lg font-bold">Pick {n}</p>
        <p className="text-sm text-paper/60">Starts {acca.time} · {acca.games.length} games</p>
      </div>
      <span className="rounded-lg bg-brand/15 px-3 py-1 font-display font-bold text-brand">{totalOdds(acca.games)} odds</span>
    </>
  )
}

function Acca({ n, acca, open, onToggle }) {
  return (
    <li className="rounded-2xl border border-line bg-panel">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-4 p-4 text-left sm:px-6">
        <AccaHeader n={n} acca={acca} />
      </button>
      {open && (
        <div className="border-t border-line p-4 sm:px-6">
          <ul className="divide-y divide-line">
            {acca.games.map((g) => (
              <li key={g.match} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-xs text-brand">{g.league}</p>
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

export default function PicksByDay() {
  const { user } = useAuth()
  const tabs = dayTabs()
  const [day, setDay] = useState(1)
  const [openId, setOpenId] = useState(null)
  const unlocked = user?.plan === 'pro' ? accas.length : 2 // free: the 3-odds and 5-odds picks

  return (
    <>
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
          <ul className="mt-6 space-y-3">
            {accas.slice(0, unlocked).map((a, i) => (
              <Acca key={a.id} n={i + 1} acca={a} open={openId === a.id} onToggle={() => setOpenId(openId === a.id ? null : a.id)} />
            ))}
          </ul>
          {unlocked < accas.length && (
            <div className="relative mt-3">
              <ul className="pointer-events-none select-none space-y-3 blur-sm" aria-hidden="true">
                {accas.slice(unlocked).map((a, i) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-panel p-4 sm:px-6">
                    <AccaHeader n={i + unlocked + 1} acca={a} />
                  </li>
                ))}
              </ul>
              <div className="absolute inset-0 flex items-center justify-center">
                <Link to={user ? '/settings' : '/signup'} className="rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-brand">Subscribe to unlock all picks</Link>
              </div>
            </div>
          )}
        </>
      )}
      <p className="mt-3 text-xs text-paper/50">Sample data for design only. Predictions are probabilities, not guarantees.</p>
    </>
  )
}
