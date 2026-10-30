export const SELECTIONS = {
  home: ['Match result', 'Home win'],
  away: ['Match result', 'Away win'],
  dc1x: ['Double chance', 'Home or draw'],
  dcx2: ['Double chance', 'Away or draw'],
  o15: ['Goals', 'Over 1.5 goals'],
  o25: ['Goals', 'Over 2.5 goals'],
  u35: ['Goals', 'Under 3.5 goals'],
  btts: ['Both teams to score', 'Yes'],
}

// Which legs are allowed into a slip. Tune these to be stricter or looser.
const MIN_ODDS = 1.15, MAX_ODDS = 2.5, MIN_PROB = 0.5, MIN_VALUE = 0.92 // value = probability x odds

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null }
const frac = (v) => { const n = num(String(v ?? '').replace('%', '')); return n == null ? null : n / 100 }
const blend = (a, b) => (a != null && b != null ? (a + b) / 2 : a ?? b)
const poissonCdf = (k, lam) => { let term = Math.exp(-lam), sum = term; for (let i = 1; i <= k; i++) { term *= lam / i; sum += term } return sum }
const int = (x) => (x == null ? null : Math.round(x * 100))

// Turns API-Football's /predictions response into compact facts plus our own probabilities.
export function buildFacts(pred, fx) {
  const t = pred.teams
  const side = (s) => ({
    form: (t[s].league?.form || '').slice(-5),
    gf5: num(t[s].last_5?.goals?.for?.average), ga5: num(t[s].last_5?.goals?.against?.average),
    gfSeason: num(t[s].league?.goals?.for?.average?.total), gaSeason: num(t[s].league?.goals?.against?.average?.total),
  })
  const h = side('home'), a = side('away')
  const pc = pred.predictions?.percent || {}
  const pHome = frac(pc.home), pDraw = frac(pc.draw), pAway = frac(pc.away)

  const hid = fx.teams.home.id
  let w = 0, d = 0, l = 0
  for (const m of (pred.h2h || []).slice(0, 6)) {
    if (m.goals?.home == null || m.goals?.away == null) continue
    const mine = m.teams.home.id === hid ? m.goals.home : m.goals.away
    const theirs = m.teams.home.id === hid ? m.goals.away : m.goals.home
    mine > theirs ? w++ : mine < theirs ? l++ : d++
  }

  const lamH = blend(blend(h.gf5, h.gfSeason), blend(a.ga5, a.gaSeason))
  const lamA = blend(blend(a.gf5, a.gfSeason), blend(h.ga5, h.gaSeason))
  const probs = {}
  if (pHome != null && pDraw != null && pAway != null) {
    probs.home = pHome; probs.away = pAway; probs.dc1x = pHome + pDraw; probs.dcx2 = pAway + pDraw
  }
  if (lamH != null && lamA != null) {
    const lh = Math.min(Math.max(lamH, 0.3), 3.5), la = Math.min(Math.max(lamA, 0.3), 3.5), lam = lh + la
    probs.o15 = 1 - poissonCdf(1, lam); probs.o25 = 1 - poissonCdf(2, lam); probs.u35 = poissonCdf(3, lam)
    probs.btts = (1 - Math.exp(-lh)) * (1 - Math.exp(-la))
  }

  const cmp = pred.comparison || {}
  const pair = (k) => (cmp[k] ? { home: int(frac(cmp[k].home)), away: int(frac(cmp[k].away)) } : null)
  const facts = {
    id: fx.fixture.id, league: fx.league.name, home: fx.teams.home.name, away: fx.teams.away.name, kickoff: fx.fixture.date,
    providerWinPercent: { home: int(pHome), draw: int(pDraw), away: int(pAway) },
    lastLeagueResults: { home: h.form || null, away: a.form || null },
    goalsPerGameLast5: { homeScored: h.gf5, homeConceded: h.ga5, awayScored: a.gf5, awayConceded: a.ga5 },
    headToHead: { meetings: w + d + l, homeWins: w, draws: d, awayWins: l },
    comparisonPercent: { form: pair('form'), attack: pair('att'), defence: pair('def'), headToHead: pair('h2h') },
    ourModelPercent: Object.fromEntries(Object.entries(probs).map(([k, v]) => [k, int(v)])),
  }
  return { facts, probs }
}

export function legsFor(probs, prices) {
  const legs = []
  for (const [key, p] of Object.entries(probs)) {
    const odds = prices[key]
    if (odds && odds >= MIN_ODDS && odds <= MAX_ODDS && p >= MIN_PROB && p * odds >= MIN_VALUE) legs.push({ key, odds, p })
  }
  return legs
}

// Plain-English reason built only from the facts, used when the AI's reason fails our checks.
export function templateWhy(leg, facts) {
  const bits = []
  const { lastLeagueResults: r, headToHead: h } = facts
  if (r.home || r.away) bits.push(`Recent league results (oldest to newest): ${facts.home} ${r.home || 'n/a'}, ${facts.away} ${r.away || 'n/a'}.`)
  if (h.meetings) bits.push(`In their last ${h.meetings} meetings, ${facts.home} won ${h.homeWins}, ${h.draws} were drawn and ${facts.away} won ${h.awayWins}.`)
  bits.push(`Our statistical model rates this selection at ${Math.round(leg.p * 100)}%.`)
  return bits.join(' ')
}
