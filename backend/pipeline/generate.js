import * as football from '../services/apiFootball.js'
import { generateJson } from '../services/gemini.js'
import PredictionSet from '../PredictionSet.js'
import { CATEGORIES, LEAGUES } from './leagues.js'
import { loadOdds, findOdds } from './data.js'
import { buildFacts, legsFor, templateWhy, SELECTIONS } from './facts.js'
import { buildWithCap, pickDiverse } from './slips.js'
import { settleDay } from './results.js'
import { loadInjuries, previousLineups, adjustForAbsences } from './news.js'

const BOOKMAKER_NAMES = { '1xbet': '1xBet' }
const MAX_FIXTURES = Number(process.env.MAX_FIXTURES_PER_DAY) || 40

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

// Kickoff window in Lagos time: 0 = before 2pm, 1 = 2-6pm, 2 = 6-10pm, 3 = 10pm or later.
// Only games that kick off inside this window (Lagos time) are used, so nobody has to stay up for a 1am kickoff.
const WINDOW = (process.env.KICKOFF_WINDOW || '06:00-22:30').split('-')
const toMinutes = (t) => { const [h, m = 0] = t.split(':').map(Number); return h * 60 + m }
const lagosMinutes = (f) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(f.fixture.timestamp * 1000))
  return Number(parts.find((p) => p.type === 'hour').value) * 60 + Number(parts.find((p) => p.type === 'minute').value)
}
export const inWindow = (f) => { const m = lagosMinutes(f); return m >= toMinutes(WINDOW[0]) && m <= toMinutes(WINDOW[1]) }

export const bucketOf = (f) => {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', hourCycle: 'h23' }).format(new Date(f.fixture.timestamp * 1000)))
  return h < 14 ? 0 : h < 18 ? 1 : h < 22 ? 2 : 3
}

// Takes games in league order, but rotates through the four kickoff windows so night games are never squeezed out.
export function spread(list, limit) {
  const q = [[], [], [], []]
  for (const x of [...list].sort((a, b) => a.rank - b.rank || a.f.fixture.timestamp - b.f.fixture.timestamp)) q[bucketOf(x.f)].push(x)
  const out = []
  while (out.length < limit && q.some((b) => b.length)) for (const b of q) if (b.length && out.length < limit) out.push(b.shift())
  return out
}

async function generateDay(date, oddsFixtures, slugs, playedOn) {
  const slugLabel = slugs.join('/')
  console.log(`\n== ${date}`)
  const all = (await football.getFixtures(date)).response
  playedOn.set(date, new Set(all.flatMap((f) => [f.teams.home.id, f.teams.away.id])))
  const league = new Map(LEAGUES.map((l) => [l.id, l]))
  // A day's picks are created once. Later runs never replace them, so they stay complete all day.
  const existing = await PredictionSet.findOne({ date }).lean()
  if (existing?.categories?.some((c) => (c.picks || []).length) && process.env.FORCE_REGENERATE !== 'true') {
    console.log(`  picks for ${date} already exist, so they are locked and left untouched (FORCE_REGENERATE=true rebuilds them)`)
    return
  }

  const ours = all.filter((f) => league.has(f.league.id))
  const notStarted = ours.filter((f) => f.fixture.status.short === 'NS')
  const upcoming = notStarted.filter(inWindow)
  if (notStarted.length > upcoming.length) console.log(`  ${notStarted.length - upcoming.length} games skipped: kickoff outside ${WINDOW.join(' to ')} (Lagos time)`)
  const matched = upcoming.map((f) => ({ f, tier: league.get(f.league.id).tier, odds: findOdds(f, oddsFixtures) }))
  const noOdds = matched.filter((x) => !x.odds && x.tier === 1)
  if (noOdds.length) console.log(`  major-league games with no ${slugLabel} odds match (${noOdds.length}): ${noOdds.slice(0, 8).map((x) => `${x.f.teams.home.name} vs ${x.f.teams.away.name}`).join('; ')}`)
  // Major leagues first (every game that has odds, up to the cap), then other leagues fill the rest.
  const withOdds = matched.filter((x) => x.odds).map((x) => ({ ...x, rank: LEAGUES.findIndex((l) => l.id === x.f.league.id) }))
  const majors = spread(withOdds.filter((x) => x.tier === 1), MAX_FIXTURES)
  const usable = [...majors, ...spread(withOdds.filter((x) => x.tier !== 1), MAX_FIXTURES - majors.length)]
  console.log(`  major-league games with odds: ${withOdds.filter((x) => x.tier === 1).length}, used: ${majors.length}. Other leagues used: ${usable.length - majors.length}`)
  console.log(`  kickoff spread used (before 2pm / 2-6pm / 6-10pm / after 10pm, Lagos time): ${[0, 1, 2, 3].map((k) => usable.filter((x) => bucketOf(x.f) === k).length).join(' / ')}`)
  console.log(`  ${all.length} fixtures that day: ${ours.length} in our leagues, ${upcoming.length} not started, ${usable.length} with ${slugLabel} odds (max ${MAX_FIXTURES})`)

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
  const absencesOf = process.env.INJURIES === 'true' && staged.length ? await loadInjuries(staged.map((s) => s.f), date) : () => null

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
    const legs = legsFor(adjustForAbsences(probs, news.absences), odds.prices, facts, odds.sources)
    facts.league = league.get(f.league.id).label
    if (legs.length) items.push({ fixtureId: f.fixture.id, f, facts, legs, tier: league.get(f.league.id).tier })
  }
  console.log(`  ${items.length} fixtures have usable selections (API-Football requests used this run: ${football.budget.used})`)

  const slipInput = items.map((i) => ({ fixtureId: i.fixtureId, legs: i.legs, tier: i.tier }))
  const candidates = {}
  const reserved = new Map() // games our own top picks of earlier levels would use, so later levels look elsewhere
  for (const c of CATEGORIES) {
    candidates[c] = buildWithCap(slipInput, c, seedFor(date, c), reserved)
    pickDiverse(candidates[c], 5, reserved)
  }
  console.log('  candidate slips:', CATEGORIES.map((c) => `${c} odds: ${candidates[c].length}`).join(', '))

  let ai = null
  if (Object.values(candidates).some((l) => l.length) && process.env.GEMINI_API_KEY) {
    try { ai = await generateJson(buildPrompt(items, candidates)) } catch (e) { console.log('  Gemini failed, using our own ranking and wording:', e.message) }
  }
  const reasons = new Map((Array.isArray(ai?.reasons) ? ai.reasons : []).map((r) => [`${r.fixtureId}|${r.selection}`, r.why]))
  const byFixture = new Map(items.map((i) => [i.fixtureId, i]))

  const used = new Map() // how many picks today already use each game, across all odds levels
  const categories = CATEGORIES.map((c) => {
    const byId = new Map(candidates[c].map((x) => [x.id, x]))
    const aiIds = (Array.isArray(ai?.choices?.[c]) ? ai.choices[c] : []).filter((id, i, a) => byId.has(id) && a.indexOf(id) === i)
    const order = [...aiIds, ...candidates[c].map((x) => x.id).filter((id) => !aiIds.includes(id))].map((id) => byId.get(id))
    const picks = pickDiverse(order, 5, used).map((cand, n) => {
      const games = cand.legs.map((leg) => {
        const it = byFixture.get(leg.fixtureId)
        const [market, pick] = SELECTIONS[leg.key]
        const pct = clamp(Math.round(leg.p * 100), 50, 92)
        const ai_why = reasons.get(`${leg.fixtureId}|${leg.key}`)
        return {
          fixtureId: leg.fixtureId, key: leg.key, leagueId: it.f.league.id, bookmaker: BOOKMAKER_NAMES[leg.source] || leg.source || null,
          league: it.facts.league, match: `${it.f.teams.home.name} vs ${it.f.teams.away.name}`,
          market, pick, odds: leg.odds, kickoff: it.f.fixture.date,
          conf: pct >= 75 ? 'High' : pct >= 60 ? 'Medium' : 'Low', pct,
          why: grounded(ai_why, it.facts) ? ai_why : templateWhy(leg, it.facts),
        }
      }).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
      return { id: `${date}-${c}-${n + 1}`, odds: cand.odds, chance: Math.min(95, Math.round(cand.p * 100)), start: games[0].kickoff, games }
    })
    return { odds: c, picks }
  })

  if (!items.length) { console.log('  nothing usable for this day, so any saved predictions were left alone'); return }

  await PredictionSet.findOneAndUpdate(
    { date },
    { date, generatedAt: new Date(), oddsSource: slugs.map((x) => BOOKMAKER_NAMES[x] || x).join(', '), fixtureCount: items.length, categories },
    { upsert: true },
  )
  console.log('  saved:', categories.map((c) => `${c.odds} odds: ${c.picks.length} picks`).join(', '))
}

// Generates today, tomorrow and the day after (Lagos dates).
// DAYS_AHEAD=1 means today and tomorrow (all a free API-Football plan can see). Use 2 on a paid plan.
export async function generateForDays(offsets = Array.from({ length: (Number(process.env.DAYS_AHEAD ?? 1) || 0) + 1 }, (_, i) => i)) {
  football.budget.used = 0
  try {
    const { requests } = (await football.rawCall('/status')).response
    football.budget.limit = Math.min(football.budget.limit, Math.max(0, requests.limit_day - requests.current - 3))
  } catch (e) { console.log('Could not read API-Football quota:', e.message) }
  console.log(`API-Football request budget for this run: ${football.budget.limit}`)

  const slugs = (process.env.ODDS_BOOKMAKERS || process.env.ODDS_BOOKMAKER || '1xbet,bet365,pinnacle').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 3)
  const slugLabel = slugs.join(', ')

  // Check yesterday's picks against the real scores first (this also tells us who played yesterday)
  const playedOn = new Map()
  const y = addDays(lagosToday(), -1)
  try {
    const yesterday = await settleDay(y)
    playedOn.set(y, new Set(yesterday.flatMap((f) => [f.teams.home.id, f.teams.away.id])))
  } catch (e) { console.log(`  could not check yesterday's results: ${e.message}`) }
  try { await settleDay(addDays(lagosToday(), -2), { onlyIfPending: true }) } catch (e) { console.log(`  could not re-check the day before yesterday: ${e.message}`) }

  const open = []
  for (const off of offsets) {
    const d = addDays(lagosToday(), off)
    const ex = await PredictionSet.findOne({ date: d }).lean()
    if (!ex?.categories?.some((c) => (c.picks || []).length) || process.env.FORCE_REGENERATE === 'true') open.push(d)
  }
  if (!open.length) { console.log('Every day already has picks (locked), nothing to generate.\n\nFinished.'); return }

  const oddsFixtures = await loadOdds(slugs)
  console.log(`OddsPapi: ${oddsFixtures.length} upcoming fixtures with prices from ${slugLabel}`)
  if (!oddsFixtures.length) throw new Error(`No odds could be loaded from ${slugLabel}, so nothing was generated and your saved predictions were left alone. Check the messages above.`)
  for (const off of offsets) {
    try { await generateDay(addDays(lagosToday(), off), oddsFixtures, slugs, playedOn) } catch (e) { console.log(/access to this date/i.test(e.message) ? `  skipped: your API-Football plan cannot see this date (${e.message})` : `  day failed: ${e.message}`) }
  }
  console.log('\nFinished.')
}
