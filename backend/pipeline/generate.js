import * as football from '../services/apiFootball.js'
import { generateJson } from '../services/gemini.js'
import PredictionSet from '../PredictionSet.js'
import { CATEGORIES, LEAGUES } from './leagues.js'
import { loadOdds, findOdds } from './data.js'
import { buildFacts, legsFor, templateWhy, SELECTIONS } from './facts.js'
import { buildTiered } from './slips.js'
import { loadInjuries, previousLineups, adjustForAbsences } from './news.js'

const BOOKMAKER_NAMES = { '1xbet': '1xBet', sportybet: 'SportyBet', msport: 'MSport', bet365: 'bet365', betway: 'Betway', pinnacle: 'Pinnacle' }
const MAX_FIXTURES = Number(process.env.MAX_FIXTURES_PER_DAY) || 20

export const lagosToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
export const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi)
const seedFor = (date, c) => Number(date.replace(/-/g, '')) + c

// Every number the AI quotes must exist in that fixture's facts, and it may only talk about absences,
// lineups or rest if we actually supplied them. Otherwise we use our own wording.
export const grounded = (text, facts) => {
  if (typeof text !== 'string' || text.length < 15 || text.length > 450) return false
  const pool = JSON.stringify(facts)
  if (!(text.match(/\d+(\.\d+)?/g) || []).every((n) => pool.includes(n))) return false
  const n = facts.teamNews || {}
  const hasAbsences = n.absences && (n.absences.home.length || n.absences.away.length)
  if (/injur|suspen|ruled out|unavailable|absen|missing/i.test(text) && !hasAbsences) return false
  if (/formation|line-?up|starting (xi|eleven)|rotat/i.test(text) && !n.previousLineups) return false
  if (/yesterday|day before|fatigue|\brest(ed)?\b/i.test(text) && !(n.playedDayBefore && (n.playedDayBefore.home || n.playedDayBefore.away))) return false
  return true
}

function buildPrompt(items, candidates) {
  const used = new Set(Object.values(candidates).flat().flatMap((c) => c.legs.map((l) => l.fixtureId)))
  const facts = items.filter((i) => used.has(i.fixtureId)).map((i) => i.facts)
  const cands = Object.fromEntries(Object.entries(candidates).map(([c, list]) => [c, list.map((x) => ({ id: x.id, legs: x.legs.map((l) => ({ fixtureId: l.fixtureId, selection: l.key })) }))]))
  return `You are the analyst for Betlyze, a football predictions website.

RULES
- Use ONLY the facts supplied below. Never invent statistics, injuries, line-ups, tactics, coaches, news or odds. Do not discuss tactics. Mention absences, formations, lineups, coaches or rest ONLY if they appear in that fixture's teamNews.
- Every number you quote must appear in that fixture's facts exactly as written. Do not mention bookmakers or odds, and do not promise a win.
- Each reason is 2 or 3 plain-English sentences, at most 60 words, and must clearly show why THAT market is likely. If the evidence is only moderate, say so honestly.
- Match the evidence to the market:

  A) home, away, dc1x, dcx2 (results markets). Use resultsEvidence only: wins, draws and losses in recent games ("won 4 of their last 5"), home or away record ("won 6 of 9 home league games"), head-to-head record ("won 3 of the last 5 meetings"), providerWinPercent and comparisonPercent. For a double chance, say what it covers, for example "Home or draw: they have lost only <N> of <M> home league games". Never justify a results market with goals totals.

  B) o15, o25 (over goals). Use goalsEvidence only. Show that the teams score and concede enough: how many of their last games the team scored 2 or more, goals scored and conceded in the last 5, how many goals the opponent has conceded, head-to-head goals. Example of the style only (use real numbers): "<Team> scored 2 or more goals in <N> of their last 5 games, and <Opponent> have conceded <M> in their last 5, so goals are likely at both ends."

  C) u35 (under 3.5 goals). Use goalsEvidence only. Show that goals are scarce: games where a team scored 1 or fewer, clean sheets, few goals conceded, low head-to-head totals. Example of the style only: "<Team> scored 1 or fewer goals in <N> of their last 5 games and <Opponent> have kept <M> clean sheets, so more than 3 goals looks unlikely."

  D) btts (both teams to score). Use goalsEvidence only. Show that BOTH sides score and concede: games each team failed to score, games each conceded, head-to-head games where both scored.

  TEAM NEWS (teamNews). If absences list players, you may say they are "listed as missing" or "doubtful" and name them; if a missing player weakens the team we back, say so honestly. NEVER say a team has no injuries or is at full strength: an empty or null list only means we have no data, so say nothing. If previousLineups is present you may state the formation used in recent games and how many starters changed (rotation) as plain facts, without predicting tactical outcomes. If playedDayBefore is true for a team you may say it played the day before.

  Never use win/draw form or head-to-head wins to justify a goals market. If a field you would need is null, use another supplied field instead of guessing.

FIXTURE FACTS (JSON):
${JSON.stringify(facts)}

CANDIDATE ACCUMULATORS (combined odds are already calculated, do not change them). Each leg is {fixtureId, selection}:
${JSON.stringify(cands)}

SELECTION KEYS: home = Home win, away = Away win, dc1x = Home or draw, dcx2 = Away or draw, o15 = Over 1.5 goals, o25 = Over 2.5 goals, u35 = Under 3.5 goals, btts = Both teams to score.

TASK
1. For each category (${CATEGORIES.join(', ')}), choose up to 5 candidate ids that the facts support best, best first. Prefer candidates that do not reuse the same fixtures.
2. For every leg of every candidate you chose, write one reason.

Return only JSON in this shape:
{"choices":{"2":["c2-1"],"3":[],"5":[],"10":[]},"reasons":[{"fixtureId":123,"selection":"home","why":"..."}]}`
}

async function generateDay(date, oddsFixtures, slug, playedOn) {
  console.log(`\n== ${date}`)
  const all = (await football.getFixtures(date)).response
  playedOn.set(date, new Set(all.flatMap((f) => [f.teams.home.id, f.teams.away.id])))
  const league = new Map(LEAGUES.map((l) => [l.id, l]))
  const ours = all.filter((f) => league.has(f.league.id))
  const upcoming = ours.filter((f) => f.fixture.status.short === 'NS')
  const matched = upcoming.map((f) => ({ f, tier: league.get(f.league.id).tier, odds: findOdds(f, oddsFixtures) }))
  const noOdds = matched.filter((x) => !x.odds && x.tier === 1)
  if (noOdds.length) console.log(`  major-league games with no ${slug} odds match (${noOdds.length}): ${noOdds.slice(0, 8).map((x) => `${x.f.teams.home.name} vs ${x.f.teams.away.name}`).join('; ')}`)
  const usable = matched
    .filter((x) => x.odds)
    .sort((a, b) => a.tier - b.tier || a.f.fixture.timestamp - b.f.fixture.timestamp)
    .slice(0, MAX_FIXTURES)
  console.log(`  tier 1 (major) games used: ${usable.filter((x) => x.tier === 1).length}, tier 2: ${usable.filter((x) => x.tier === 2).length}`)
  console.log(`  ${all.length} fixtures that day: ${ours.length} in our leagues, ${upcoming.length} not started, ${usable.length} with ${slug} odds (max ${MAX_FIXTURES})`)

  // 1) predictions (and recent games if needed)
  const wantRecent = process.env.RECENT_GAMES === 'true' || process.env.LINEUPS === 'true'
  const staged = []
  for (const { f, odds } of usable) {
    try {
      const pred = (await football.getPrediction(f.fixture.id)).response[0]
      if (!pred) continue
      const recent = {}
      if (wantRecent) {
        for (const side of ['home', 'away']) {
          try { recent[side] = (await football.getTeamLast(f.teams[side].id, 5)).response } catch (e) { if (/budget/.test(e.message)) break }
        }
      }
      staged.push({ f, odds, pred, recent })
    } catch (e) {
      console.log(`  skipped fixture ${f.fixture.id}: ${e.message}`)
      if (/budget/.test(e.message)) break
    }
  }

  // 2) absences for those fixtures: one request per league
  const absencesOf = staged.length ? await loadInjuries(staged.map((s) => s.f), date) : () => null

  // 3) facts, probabilities and usable selections
  const dayBefore = playedOn.get(addDays(date, -1))
  const items = []
  for (const { f, odds, pred, recent } of staged) {
    const news = {
      absences: absencesOf(f),
      playedDayBefore: dayBefore ? { home: dayBefore.has(f.teams.home.id), away: dayBefore.has(f.teams.away.id) } : null,
      previousLineups: process.env.LINEUPS === 'true' ? await previousLineups(f, recent) : null,
    }
    const { facts, probs } = buildFacts(pred, f, recent, news)
    const legs = legsFor(adjustForAbsences(probs, news.absences), odds.prices, facts)
    facts.league = league.get(f.league.id).label
    if (legs.length) items.push({ fixtureId: f.fixture.id, f, facts, legs, tier: league.get(f.league.id).tier })
  }
  console.log(`  ${items.length} fixtures have usable selections (API-Football requests used this run: ${football.budget.used})`)

  const slipInput = items.map((i) => ({ fixtureId: i.fixtureId, legs: i.legs, tier: i.tier }))
  const candidates = Object.fromEntries(CATEGORIES.map((c) => [c, buildTiered(slipInput, c, seedFor(date, c))]))
  console.log('  candidate slips:', CATEGORIES.map((c) => `${c} odds: ${candidates[c].length}`).join(', '))

  let ai = null
  if (Object.values(candidates).some((l) => l.length) && process.env.GEMINI_API_KEY) {
    try { ai = await generateJson(buildPrompt(items, candidates)) } catch (e) { console.log('  Gemini failed, using our own ranking and wording:', e.message) }
  }
  const reasons = new Map((Array.isArray(ai?.reasons) ? ai.reasons : []).map((r) => [`${r.fixtureId}|${r.selection}`, r.why]))
  const byFixture = new Map(items.map((i) => [i.fixtureId, i]))

  const categories = CATEGORIES.map((c) => {
    const byId = new Map(candidates[c].map((x) => [x.id, x]))
    let ids = (Array.isArray(ai?.choices?.[c]) ? ai.choices[c] : []).filter((id, i, a) => byId.has(id) && a.indexOf(id) === i).slice(0, 5)
    ids = [...ids, ...candidates[c].map((x) => x.id).filter((id) => !ids.includes(id))].slice(0, 5) // top up from our ranking
    const picks = ids.map((id, n) => {
      const cand = byId.get(id)
      const games = cand.legs.map((leg) => {
        const it = byFixture.get(leg.fixtureId)
        const [market, pick] = SELECTIONS[leg.key]
        const pct = clamp(Math.round(leg.p * 100), 50, 92)
        const ai_why = reasons.get(`${leg.fixtureId}|${leg.key}`)
        return {
          fixtureId: leg.fixtureId, league: it.facts.league, match: `${it.f.teams.home.name} vs ${it.f.teams.away.name}`,
          market, pick, odds: leg.odds, kickoff: it.f.fixture.date,
          conf: pct >= 75 ? 'High' : pct >= 60 ? 'Medium' : 'Low', pct,
          why: grounded(ai_why, it.facts) ? ai_why : templateWhy(leg, it.facts),
        }
      }).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
      return { id: `${date}-${c}-${n + 1}`, odds: cand.odds, start: games[0].kickoff, games }
    })
    return { odds: c, picks }
  })

  if (!items.length) { console.log('  nothing usable for this day, so any saved predictions were left alone'); return }

  await PredictionSet.findOneAndUpdate(
    { date },
    { date, generatedAt: new Date(), oddsSource: BOOKMAKER_NAMES[slug] || slug, fixtureCount: items.length, categories },
    { upsert: true },
  )
  console.log('  saved:', categories.map((c) => `${c.odds} odds: ${c.picks.length} picks`).join(', '))
}

// Generates today, tomorrow and the day after (Lagos dates).
export async function generateForDays(offsets = [0, 1, 2]) {
  football.budget.used = 0
  try {
    const { requests } = (await football.rawCall('/status')).response
    football.budget.limit = Math.min(football.budget.limit, Math.max(0, requests.limit_day - requests.current - 3))
  } catch (e) { console.log('Could not read API-Football quota:', e.message) }
  console.log(`API-Football request budget for this run: ${football.budget.limit}`)

  const slug = process.env.ODDS_BOOKMAKER || '1xbet'
  const oddsFixtures = await loadOdds(slug)
  console.log(`OddsPapi: ${oddsFixtures.length} upcoming fixtures with ${slug} prices`)
  if (!oddsFixtures.length) throw new Error(`No ${slug} odds could be loaded, so nothing was generated and your saved predictions were left alone. Check the messages above, or try another ODDS_BOOKMAKER.`)
  const playedOn = new Map()
  try {
    const y = addDays(lagosToday(), -1)
    playedOn.set(y, new Set((await football.getFixtures(y)).response.flatMap((f) => [f.teams.home.id, f.teams.away.id])))
  } catch (e) { console.log(`  could not load yesterday's fixtures (rest info skipped): ${e.message}`) }
  for (const off of offsets) {
    try { await generateDay(addDays(lagosToday(), off), oddsFixtures, slug, playedOn) } catch (e) { console.log(/access to this date/i.test(e.message) ? `  skipped: your API-Football plan cannot see this date (${e.message})` : `  day failed: ${e.message}`) }
  }
  console.log('\nFinished.')
}
