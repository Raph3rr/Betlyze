export const SELECTIONS = {
  home: ['Match result', 'Home win'],
  away: ['Match result', 'Away win'],
  dc1x: ['Double chance', 'Home or draw'],
  dcx2: ['Double chance', 'Away or draw'],
  o15: ['Goals', 'Over 1.5 goals'],
  o25: ['Goals', 'Over 2.5 goals'],
  u35: ['Goals', 'Under 3.5 goals'],
  btts: ['Both teams to score', 'Yes'],
  bttsNo: ['Both teams to score', 'No'],
  u25: ['Goals', 'Under 2.5 goals'],
  u45: ['Goals', 'Under 4.5 goals'],
  o35: ['Goals', 'Over 3.5 goals'],
  dc12: ['Double chance', 'Home or away'],
}
export const GOALS_KEYS = ['o15', 'o25', 'u35', 'btts', 'bttsNo', 'u25', 'u45', 'o35']

// Which legs are allowed into a slip. Tune these to be stricter or looser.
// value = probability x odds. Level 0 is strict. Levels 1 and 2 are only used when a day has too few usable games.
export const LEVELS = [
  { minOdds: 1.15, maxOdds: 2.5, minProb: 0.5, minValue: 0.92, goals: 1.0 },
  { minOdds: 1.1, maxOdds: 3.0, minProb: 0.45, minValue: 0.85, goals: 0.85 },
  { minOdds: 1.08, maxOdds: 3.5, minProb: 0.4, minValue: 0.8, goals: 0 },
]

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null }
const frac = (v) => { const n = num(String(v ?? '').replace('%', '')); return n == null ? null : n / 100 }
const blend = (a, b) => (a != null && b != null ? (a + b) / 2 : a ?? b)
const poissonCdf = (k, lam) => { let term = Math.exp(-lam), sum = term; for (let i = 1; i <= k; i++) { term *= lam / i; sum += term } return sum }
const int = (x) => (x == null ? null : Math.round(x * 100))
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10)

const count = (str, ch) => (str.match(new RegExp(ch, 'g')) || []).length

// Game-by-game numbers from a team's last 5 finished games (any competition).
function gameStats(teamId, matches) {
  const rows = (matches || [])
    .filter((m) => m.goals?.home != null && m.goals?.away != null)
    .slice(0, 5)
    .map((m) => { const h = m.teams.home.id === teamId; return { gf: h ? m.goals.home : m.goals.away, ga: h ? m.goals.away : m.goals.home } })
  if (!rows.length) return null
  const c = (f) => rows.filter(f).length
  const sum = (k) => rows.reduce((t, r) => t + r[k], 0)
  return {
    games: rows.length, wins: c((r) => r.gf > r.ga), draws: c((r) => r.gf === r.ga), losses: c((r) => r.gf < r.ga),
    goalsScored: sum('gf'), goalsConceded: sum('ga'),
    gamesScoring2OrMore: c((r) => r.gf >= 2), gamesScoring1OrFewer: c((r) => r.gf <= 1), gamesFailedToScore: c((r) => r.gf === 0),
    cleanSheets: c((r) => r.ga === 0), gamesConceding1OrMore: c((r) => r.ga >= 1), gamesConceding2OrMore: c((r) => r.ga >= 2),
    gamesWith3OrMoreTotalGoals: c((r) => r.gf + r.ga >= 3), gamesWith3OrFewerTotalGoals: c((r) => r.gf + r.ga <= 3), gamesBothTeamsScored: c((r) => r.gf > 0 && r.ga > 0),
  }
}

// Turns API-Football's /predictions response into compact facts plus our own probabilities.
export function buildFacts(pred, fx, recent = {}, news = {}) {
  const t = pred.teams
  const side = (s) => ({
    form: (t[s].league?.form || '').slice(-5),
    gf5: num(t[s].last_5?.goals?.for?.average), ga5: num(t[s].last_5?.goals?.against?.average),
    gfTot5: num(t[s].last_5?.goals?.for?.total), gaTot5: num(t[s].last_5?.goals?.against?.total),
    gfSeason: num(t[s].league?.goals?.for?.average?.total), gaSeason: num(t[s].league?.goals?.against?.average?.total),
    played: num(t[s].league?.fixtures?.played?.total), failed: num(t[s].league?.failed_to_score?.total), clean: num(t[s].league?.clean_sheet?.total),
  })
  const h = side('home'), a = side('away')
  const pc = pred.predictions?.percent || {}
  const pHome = frac(pc.home), pDraw = frac(pc.draw), pAway = frac(pc.away)

  // head-to-head: results AND goals
  const hid = fx.teams.home.id
  let w = 0, d = 0, l = 0, goals = 0, big = 0, both = 0
  for (const m of (pred.h2h || []).slice(0, 6)) {
    if (m.goals?.home == null || m.goals?.away == null) continue
    const mine = m.teams.home.id === hid ? m.goals.home : m.goals.away
    const theirs = m.teams.home.id === hid ? m.goals.away : m.goals.home
    mine > theirs ? w++ : mine < theirs ? l++ : d++
    goals += mine + theirs
    if (mine + theirs >= 3) big++
    if (mine > 0 && theirs > 0) both++
  }
  const meetings = w + d + l

  const lamH = blend(blend(h.gf5, h.gfSeason), blend(a.ga5, a.gaSeason))
  const lamA = blend(blend(a.gf5, a.gfSeason), blend(h.ga5, h.gaSeason))
  const lh = lamH == null ? null : Math.min(Math.max(lamH, 0.3), 3.5)
  const la = lamA == null ? null : Math.min(Math.max(lamA, 0.3), 3.5)
  const probs = {}
  if (pHome != null && pDraw != null && pAway != null) {
    probs.home = pHome; probs.away = pAway; probs.dc1x = pHome + pDraw; probs.dcx2 = pAway + pDraw; probs.dc12 = pHome + pAway
  }
  if (lh != null && la != null) {
    const lam = lh + la
    probs.o15 = 1 - poissonCdf(1, lam); probs.o25 = 1 - poissonCdf(2, lam); probs.u35 = poissonCdf(3, lam)
    probs.btts = (1 - Math.exp(-lh)) * (1 - Math.exp(-la)); probs.bttsNo = 1 - probs.btts
    probs.u25 = poissonCdf(2, lam); probs.u45 = poissonCdf(4, lam); probs.o35 = 1 - poissonCdf(3, lam)
  }

  const split = (side_, venue) => {
    const f = t[side_].league?.fixtures
    const played = f?.played?.[venue]
    return played ? { played, wins: f.wins?.[venue], draws: f.draws?.[venue], losses: f.loses?.[venue] } : null
  }
  const formCount = (f) => (f ? { wins: count(f, 'W'), draws: count(f, 'D'), losses: count(f, 'L') } : null)

  const cmp = pred.comparison || {}
  const pair = (k) => (cmp[k] ? { home: int(frac(cmp[k].home)), away: int(frac(cmp[k].away)) } : null)
  const facts = {
    id: fx.fixture.id, league: fx.league.name, home: fx.teams.home.name, away: fx.teams.away.name, kickoff: fx.fixture.date,
    // evidence for Match result and Double chance selections
    resultsEvidence: {
      providerWinPercent: { home: int(pHome), draw: int(pDraw), away: int(pAway) },
      lastLeagueResults: { home: h.form || null, away: a.form || null },
      lastFiveLeagueGames: { home: formCount(h.form), away: formCount(a.form) },
      homeTeamRecordInHomeLeagueGames: split('home', 'home'),
      awayTeamRecordInAwayLeagueGames: split('away', 'away'),
      lastFiveGamesAnyCompetition: { home: gameStats(fx.teams.home.id, recent.home), away: gameStats(fx.teams.away.id, recent.away) },
      headToHead: { meetings, homeWins: w, draws: d, awayWins: l },
      comparisonPercent: { form: pair('form'), attack: pair('att'), defence: pair('def'), headToHead: pair('h2h') },
    },
    // evidence for Goals and Both-teams-to-score selections
    goalsEvidence: {
      lastFiveGamesGameByGame: { home: gameStats(fx.teams.home.id, recent.home), away: gameStats(fx.teams.away.id, recent.away) },
      goalsScoredInLast5Games: { home: h.gfTot5, away: a.gfTot5 },
      goalsConcededInLast5Games: { home: h.gaTot5, away: a.gaTot5 },
      goalsScoredPerGameLast5: { home: r1(h.gf5), away: r1(a.gf5) },
      goalsConcededPerGameLast5: { home: r1(h.ga5), away: r1(a.ga5) },
      goalsScoredPerGameSeason: { home: r1(h.gfSeason), away: r1(a.gfSeason) },
      goalsConcededPerGameSeason: { home: r1(h.gaSeason), away: r1(a.gaSeason) },
      gamesWithoutScoringThisSeason: { home: h.failed, away: a.failed, outOfHome: h.played, outOfAway: a.played },
      cleanSheetsThisSeason: { home: h.clean, away: a.clean },
      headToHeadGoals: { meetings, averageGoalsPerMeeting: meetings ? r1(goals / meetings) : null, meetingsWith3OrMoreGoals: big, meetingsBothTeamsScored: both },
      ourExpectedGoals: { home: r1(lh), away: r1(la), total: lh != null && la != null ? r1(lh + la) : null },
    },
    // absences, rest and previous lineups. null means we have no data (NOT that nothing is wrong)
    teamNews: { absences: news.absences ?? null, playedDayBefore: news.playedDayBefore ?? null, previousLineups: news.previousLineups ?? null },
    ourModelPercent: Object.fromEntries(Object.entries(probs).map(([k, v]) => [k, int(v)])),
  }
  return { facts, probs }
}

// Goals picks must be backed by goals evidence, not just a good probability. `k` loosens the bar at looser levels (0 = no bar).
function goalsSupported(key, facts, k) {
  const g = facts.goalsEvidence.ourExpectedGoals
  if (g.total == null) return false
  if (k === 0) return true
  if (key === 'o15') return g.total >= 2.0 * k
  if (key === 'o25') return g.total >= 2.7 * k
  if (key === 'o35') return g.total >= 3.3 * k
  if (key === 'u25') return g.total <= 2.4 / k
  if (key === 'u35') return g.total <= 2.8 / k
  if (key === 'u45') return g.total <= 3.4 / k
  if (key === 'btts') return g.home >= 1.1 * k && g.away >= 1.1 * k
  if (key === 'bttsNo') return Math.min(g.home, g.away) <= 0.9 / k
  return true
}

// Which selections of a game may enter slips at a given strictness level. `rejects` (optional) counts why selections were dropped.
export function legsFor(probs, prices, facts, sources = {}, level = 0, rejects = null) {
  const L = LEVELS[level]
  const legs = []
  const no = (why) => { if (rejects) rejects[why] = (rejects[why] || 0) + 1 }
  for (const [key, p] of Object.entries(probs)) {
    const odds = prices[key]
    if (!odds) { no('no bookmaker price'); continue }
    if (odds < L.minOdds || odds > L.maxOdds) { no('odds out of range'); continue }
    if (p < L.minProb) { no('chance too low'); continue }
    if (p * odds < L.minValue) { no('value too low'); continue }
    if (GOALS_KEYS.includes(key) && !goalsSupported(key, facts, L.goals)) { no('goals evidence too weak'); continue }
    legs.push({ key, odds, p, source: sources[key] })
  }
  return legs
}

// Plain-English reason built only from the facts, matched to the market. Used when the AI's reason fails our checks.
export function templateWhy(leg, facts) {
  const bits = []
  const { home, away } = facts
  if (GOALS_KEYS.includes(leg.key)) {
    const g = facts.goalsEvidence
    const gb = g.lastFiveGamesGameByGame
    if (gb.home && gb.away)
      bits.push(`${home} scored 2 or more goals in ${gb.home.gamesScoring2OrMore} of their last ${gb.home.games} games and conceded ${gb.home.goalsConceded} in total, while ${away} scored 2 or more in ${gb.away.gamesScoring2OrMore} of their last ${gb.away.games} and conceded ${gb.away.goalsConceded} in total.`)
    else if (g.goalsScoredInLast5Games.home != null && g.goalsScoredInLast5Games.away != null)
      bits.push(`In their last 5 games ${home} scored ${g.goalsScoredInLast5Games.home} and conceded ${g.goalsConcededInLast5Games.home}, while ${away} scored ${g.goalsScoredInLast5Games.away} and conceded ${g.goalsConcededInLast5Games.away}.`)
    if ((leg.key === 'btts' || leg.key === 'bttsNo') && g.gamesWithoutScoringThisSeason.home != null)
      bits.push(`${home} have failed to score in ${g.gamesWithoutScoringThisSeason.home} of ${g.gamesWithoutScoringThisSeason.outOfHome} league games and ${away} in ${g.gamesWithoutScoringThisSeason.away} of ${g.gamesWithoutScoringThisSeason.outOfAway}.`)
    if (g.headToHeadGoals.meetings)
      bits.push(`Their last ${g.headToHeadGoals.meetings} meetings averaged ${g.headToHeadGoals.averageGoalsPerMeeting} goals, with ${g.headToHeadGoals.meetingsWith3OrMoreGoals} having 3 or more.`)
    if (g.ourExpectedGoals.total != null) bits.push(`Our model expects ${g.ourExpectedGoals.total} goals in this match.`)
  } else {
    const r = facts.resultsEvidence
    const f5 = r.lastFiveLeagueGames
    if (f5.home && f5.away) bits.push(`In their last 5 league games ${home} won ${f5.home.wins}, drew ${f5.home.draws} and lost ${f5.home.losses}, while ${away} won ${f5.away.wins}, drew ${f5.away.draws} and lost ${f5.away.losses}.`)
    const hr = r.homeTeamRecordInHomeLeagueGames, ar = r.awayTeamRecordInAwayLeagueGames
    if (hr && ar) bits.push(`${home} have won ${hr.wins} of ${hr.played} home league games and ${away} have won ${ar.wins} of ${ar.played} away.`)
    if (r.headToHead.meetings)
      bits.push(`In their last ${r.headToHead.meetings} meetings, ${home} won ${r.headToHead.homeWins}, ${r.headToHead.draws} were drawn and ${away} won ${r.headToHead.awayWins}.`)
  }
  const ab = facts.teamNews?.absences
  if (!GOALS_KEYS.includes(leg.key) && ab && (ab.home.length || ab.away.length)) {
    const fmt = (list) => list.map((x) => `${x.player} (${x.status})`).join(', ')
    bits.push(`Listed absences: ${home}: ${ab.home.length ? fmt(ab.home) : 'none listed'}; ${away}: ${ab.away.length ? fmt(ab.away) : 'none listed'}.`)
  }
  bits.push(`Our statistical model rates this selection at ${Math.round(leg.p * 100)}%.`)
  return bits.join(' ')
}
