import * as football from '../services/apiFootball.js'
import { generateJson } from '../services/gemini.js'
import PredictionSet from '../PredictionSet.js'
import { CATEGORIES, LEAGUES } from './leagues.js'
import { loadOdds, findOdds } from './data.js'
import { buildFacts, legsFor, templateWhy, SELECTIONS } from './facts.js'
import { buildCandidates } from './slips.js'

const MAX_FIXTURES = Number(process.env.MAX_FIXTURES_PER_DAY) || 20

export const lagosToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
export const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi)
const seedFor = (date, c) => Number(date.replace(/-/g, '')) + c

// Every number the AI quotes must exist in that fixture's facts, otherwise we use our own wording.
const grounded = (text, facts) => {
  if (typeof text !== 'string' || text.length < 15 || text.length > 400) return false
  const pool = JSON.stringify(facts)
  return (text.match(/\d+(\.\d+)?/g) || []).every((n) => pool.includes(n))
}

function buildPrompt(items, candidates) {
  const used = new Set(Object.values(candidates).flat().flatMap((c) => c.legs.map((l) => l.fixtureId)))
  const facts = items.filter((i) => used.has(i.fixtureId)).map((i) => i.facts)
  const cands = Object.fromEntries(Object.entries(candidates).map(([c, list]) => [c, list.map((x) => ({ id: x.id, legs: x.legs.map((l) => ({ fixtureId: l.fixtureId, selection: l.key })) }))]))
  return `You are the analyst for Betlyze, a football predictions website.

RULES
- Use ONLY the facts supplied below. Never invent statistics, injuries, line-ups, tactics, news or odds.
- Write each reason in plain English: 1 or 2 sentences, at most 45 words.
- Any number you quote must appear in that fixture's facts exactly as written.
- Do not mention bookmakers or odds. Do not promise a win.

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

async function generateDay(date, oddsFixtures, slug) {
  console.log(`\n== ${date}`)
  const all = (await football.getFixtures(date)).response
  const league = new Map(LEAGUES.map((l) => [l.id, l]))
  const usable = all
    .filter((f) => league.has(f.league.id) && f.fixture.status.short === 'NS')
    .map((f) => ({ f, tier: league.get(f.league.id).tier, odds: findOdds(f, oddsFixtures) }))
    .filter((x) => x.odds)
    .sort((a, b) => a.tier - b.tier || a.f.fixture.timestamp - b.f.fixture.timestamp)
    .slice(0, MAX_FIXTURES)
  console.log(`  ${all.length} fixtures that day, ${usable.length} usable (our leagues, not started, with ${slug} odds)`)

  const items = []
  for (const { f, odds } of usable) {
    try {
      const pred = (await football.getPrediction(f.fixture.id)).response[0]
      if (!pred) continue
      const { facts, probs } = buildFacts(pred, f)
      const legs = legsFor(probs, odds.prices)
      if (legs.length) items.push({ fixtureId: f.fixture.id, f, facts, legs })
    } catch (e) {
      console.log(`  skipped fixture ${f.fixture.id}: ${e.message}`)
      if (/budget/.test(e.message)) break
    }
  }
  console.log(`  ${items.length} fixtures have usable selections (API-Football requests used this run: ${football.budget.used})`)

  const slipInput = items.map((i) => ({ fixtureId: i.fixtureId, legs: i.legs }))
  const candidates = Object.fromEntries(CATEGORIES.map((c) => [c, buildCandidates(slipInput, c, seedFor(date, c))]))
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
          fixtureId: leg.fixtureId, league: it.f.league.name, match: `${it.f.teams.home.name} vs ${it.f.teams.away.name}`,
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
    { date, generatedAt: new Date(), oddsSource: slug, fixtureCount: items.length, categories },
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

  const slug = process.env.ODDS_BOOKMAKER || 'sportybet'
  const oddsFixtures = await loadOdds(slug)
  console.log(`OddsPapi: ${oddsFixtures.length} upcoming fixtures with ${slug} prices`)
  if (!oddsFixtures.length) throw new Error(`No ${slug} odds could be loaded, so nothing was generated and your saved predictions were left alone. Check the messages above, or try another ODDS_BOOKMAKER.`)
  for (const off of offsets) {
    try { await generateDay(addDays(lagosToday(), off), oddsFixtures, slug) } catch (e) { console.log(`  day failed: ${e.message}`) }
  }
  console.log('\nFinished.')
}
