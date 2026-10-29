// SAMPLE data only: made-up clubs and made-up reasoning. Replaced later by real fixtures + odds + Gemini analysis.
export const CATEGORIES = [2, 3, 5, 10]
export const FREE = [2, 3]

const POOL = [
  ['Premier League', 'Northgate vs Eastbridge', 'Double chance', 'Home or draw', 1.35, '12:30', 'High', 86, 'Northgate are hard to beat at home and Eastbridge struggle to score away, so avoiding a home defeat looks very likely.'],
  ['Premier League', 'Kingsfield vs Oakham', 'Match result', 'Home win', 1.55, '15:00', 'Medium', 72, 'Kingsfield have the better recent form and head-to-head record, but a few injuries leave some doubt.'],
  ['Premier League', 'Marlow vs Stonebay', 'Goals', 'Over 1.5 goals', 1.25, '17:30', 'High', 82, 'Both teams score often and concede often, so at least two goals is the likely outcome.'],
  ['La Liga', 'Redhill vs Westport', 'Match result', 'Home win', 1.5, '16:00', 'Medium', 68, 'Redhill are strong at home and Westport have lost most of their recent away games.'],
  ['La Liga', 'Ashford United vs Lakeside', 'Match result', 'Home win', 1.7, '18:30', 'Medium', 70, 'Ashford sit higher in the table and have scored in every home game lately, though Lakeside defend well.'],
  ['La Liga', 'Brackley vs Hartwell', 'Double chance', 'Home or draw', 1.3, '20:00', 'High', 84, 'Brackley are unbeaten at home this season and Hartwell rarely win away.'],
  ['Serie A', 'Dunmore vs Fairview', 'Goals', 'Over 1.5 goals', 1.38, '13:00', 'High', 80, 'Dunmore score in nearly every match and Fairview have conceded in most of theirs.'],
  ['Serie A', 'Cresthaven vs Millbrook', 'Match result', 'Home win', 1.6, '15:00', 'Medium', 66, 'Cresthaven have won their last meetings with Millbrook and have the stronger squad.'],
  ['Serie A', 'Highcliff vs Pinewood', 'Double chance', 'Away or draw', 1.45, '19:45', 'Medium', 74, 'Pinewood have strong away results and Highcliff have been inconsistent at home.'],
  ['Bundesliga', 'Thornbury vs Wexley', 'Goals', 'Under 3.5 goals', 1.3, '14:30', 'High', 85, 'Both teams play cautiously and their recent matches have rarely produced more than three goals.'],
  ['Bundesliga', 'Sutton Park vs Ironvale', 'Both teams to score', 'Yes', 1.75, '16:30', 'Medium', 69, 'Both sides attack well and have weak defensive records, so each is likely to find the net.'],
  ['Bundesliga', 'Greymoor vs Calder', 'Match result', 'Home win', 1.5, '18:30', 'Medium', 71, 'Greymoor have the better form and Calder are missing key players.'],
  ['Ligue 1', 'Foxhall vs Penrose', 'Goals', 'Over 2.5 goals', 1.65, '20:00', 'Medium', 65, 'Foxhall and Penrose average plenty of goals between them, and their past meetings were high scoring.'],
  ['Ligue 1', 'Alderton vs Whitby Rovers', 'Double chance', 'Home or draw', 1.4, '17:00', 'High', 78, 'Alderton are solid at home while Whitby Rovers have a poor away record.'],
  ['Eredivisie', 'Larkspur vs Moorgate', 'Both teams to score', 'Yes', 1.85, '13:30', 'Medium', 73, 'Neither team keeps many clean sheets, and both have scored in most recent matches.'],
  ['Eredivisie', 'Stanmore vs Valebrook', 'Match result', 'Home win', 1.8, '15:30', 'Low', 58, 'Stanmore are slight favourites on form, but the sides are closely matched.'],
  ['Primeira Liga', 'Ravenhill vs Seaford', 'Match result', 'Home win', 2.0, '21:00', 'Low', 54, 'Ravenhill have a small edge at home, but Seaford have been improving and the match could go either way.'],
  ['Premier League', 'Elmstead vs Craigmore', 'Match result', 'Away win', 2.1, '14:00', 'Low', 56, 'Craigmore have the better recent results, though Elmstead are dangerous at home.'],
].map(([league, match, market, pick, odds, t, conf, pct, why]) => ({ league, match, market, pick, odds, t, conf, pct, why }))

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
    picks.push({ id: `${target}-${picks.length + 1}`, odds: Number(total.toFixed(2)), start: games.map((g) => g.t).sort()[0], games })
  }
  return picks
}
