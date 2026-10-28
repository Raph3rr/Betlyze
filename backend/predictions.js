// SAMPLE data only. Replaced later by real fixtures + odds + Gemini analysis.
export const CATEGORIES = [2, 3, 5, 10]
export const FREE = [2, 3]

const POOL = [
  ['Premier League', 'Arsenal vs Chelsea', 'Home or draw', 1.35, '12:30'],
  ['Premier League', 'Liverpool vs Wolves', 'Home win', 1.55, '15:00'],
  ['Premier League', 'Man City vs Brentford', 'Over 1.5 goals', 1.25, '17:30'],
  ['La Liga', 'Real Madrid vs Getafe', 'Home win', 1.5, '16:00'],
  ['La Liga', 'Barcelona vs Sevilla', 'Home win', 1.7, '18:30'],
  ['La Liga', 'Atlético vs Valencia', 'Home or draw', 1.3, '20:00'],
  ['Serie A', 'Inter vs Torino', 'Over 1.5 goals', 1.38, '13:00'],
  ['Serie A', 'Napoli vs Genoa', 'Home win', 1.6, '15:00'],
  ['Serie A', 'Juventus vs Verona', 'Home win', 1.45, '19:45'],
  ['Bundesliga', 'Bayern vs Mainz', 'Home win', 1.3, '14:30'],
  ['Bundesliga', 'Dortmund vs Bochum', 'Both teams to score', 1.75, '16:30'],
  ['Bundesliga', 'Leverkusen vs Köln', 'Home win', 1.5, '18:30'],
  ['Ligue 1', 'PSG vs Nantes', 'Over 2.5 goals', 1.65, '20:00'],
  ['Ligue 1', 'Lyon vs Brest', 'Home or draw', 1.4, '17:00'],
  ['Eredivisie', 'Ajax vs PSV', 'Both teams to score', 1.85, '13:30'],
  ['Eredivisie', 'Feyenoord vs Utrecht', 'Home win', 1.8, '15:30'],
  ['Primeira Liga', 'Benfica vs Braga', 'Home win', 2.0, '21:00'],
  ['Premier League', 'Newcastle vs Everton', 'Home win', 2.1, '14:00'],
].map(([league, match, pick, odds, t]) => ({ league, match, pick, odds, t }))

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Builds up to 5 different picks whose combined odds land within +/-10% of the target.
export function samplePicks(target, seed) {
  const rand = rng(seed)
  const seen = new Set()
  const picks = []
  for (let attempt = 0; attempt < 1500 && picks.length < 5; attempt++) {
    const games = []
    let total = 1
    for (const g of [...POOL].sort(() => rand() - 0.5)) {
      games.push(g)
      total *= g.odds
      if (total >= target * 0.9) break
    }
    if (total > target * 1.1 || games.length > 7) continue
    const key = games.map((g) => g.match).sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)
    picks.push({
      id: `${target}-${picks.length + 1}`,
      odds: Number(total.toFixed(2)),
      start: games.map((g) => g.t).sort()[0],
      games,
    })
  }
  return picks
}
