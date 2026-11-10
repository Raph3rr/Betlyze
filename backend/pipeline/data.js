import * as odds from '../services/oddsPapi.js'
import { cached } from '../services/cache.js'
import { LEAGUES } from './leagues.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const strip = (s = '') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const flat = (s) => strip(s).replace(/[^a-z0-9]/g, '')
const norm = (s) => strip(s).replace(/\b(fc|cf|afc|sc|ac|as|ssc|rc|cd|ud|sk|fk|fsv|tsg|vfb|vfl|rb)\b/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

export function sim(a, b) {
  a = norm(a).replace(/\bman\b/, 'manchester').replace(/\butd\b/, 'united').replace(/\bpsg\b/, 'paris saint germain')
  b = norm(b).replace(/\bman\b/, 'manchester').replace(/\butd\b/, 'united').replace(/\bpsg\b/, 'paris saint germain')
  if (!a || !b) return 0
  if (a === b) return 1
  if ((a.includes(b) || b.includes(a)) && Math.min(a.length, b.length) >= 4) return 0.9
  const ta = new Set(a.split(' ')), tb = new Set(b.split(' '))
  const tokens = [...ta].filter((t) => tb.has(t)).length / Math.max(ta.size, tb.size)
  return Math.max(tokens, 1 - lev(a, b) / Math.max(a.length, b.length))
}

export function matchTournament(league, tournaments) {
  const ok = (t) => (league.odds ? league.odds.test(t.tournamentName) : flat(t.tournamentName) === flat(league.name))
  const inCountry = (t) => !league.country || flat(t.categoryName).includes(flat(league.country)) || (league.country === 'USA' && /usa|unitedstates/.test(flat(t.categoryName))) || (league.country === 'Turkey' && /turkey|turkiye/.test(flat(t.categoryName)))
  return tournaments.filter((t) => ok(t) && inCountry(t)).sort((a, b) => b.futureFixtures - a.futureFixtures)[0]
}

// Finds which OddsPapi market/outcome ids mean what, using the /v4/markets list.
export function buildMarketIndex(markets) {
  const idx = {}
  for (const m of markets) {
    if (m.sportId !== 10 || m.period !== 'fulltime' || m.playerProp) continue
    const out = (re) => m.outcomes?.find((o) => re.test(o.outcomeName))?.outcomeId
    if (m.marketType === '1x2' && /full time result/i.test(m.marketName)) { idx.home = [m.marketId, out(/^1$/)]; idx.away = [m.marketId, out(/^2$/)] }
    else if (/both teams to score/i.test(m.marketName) && !/half|and|\//i.test(m.marketName)) { idx.btts = [m.marketId, out(/^yes$/i)]; idx.bttsNo = [m.marketId, out(/^no$/i)] }
    else if (/^over under full time$/i.test(m.marketName)) {
      const over = out(/^over$/i), under = out(/^under$/i)
      if (m.handicap === 1.5) idx.o15 = [m.marketId, over]
      if (m.handicap === 2.5) { idx.o25 = [m.marketId, over]; idx.u25 = [m.marketId, under] }
      if (m.handicap === 3.5) { idx.o35 = [m.marketId, over]; idx.u35 = [m.marketId, under] }
      if (m.handicap === 4.5) idx.u45 = [m.marketId, under]
    } else if (/^double chance/i.test(m.marketName) && !/half/i.test(m.marketName)) {
      idx.dc1x = [m.marketId, out(/^1x$|home or draw/i)]
      idx.dcx2 = [m.marketId, out(/^x2$|away or draw/i)]
      idx.dc12 = [m.marketId, out(/^12$|home or away/i)]
    }
  }
  return idx
}

// Is the league API-Football returned really the one we configured? (protects against a wrong id showing a wrong label)
export function leagueMatches(f, l) {
  const got = flat(f.league.name), want = flat(l.name)
  const nameOk = got.includes(want) || want.includes(got)
  const countryOk = !l.country || flat(f.league.country) === flat(l.country)
  return nameOk && countryOk
}

// For every market we take the first bookmaker (in priority order) that has a price for it.
export function reduceFixture(f, slugs, idx, names) {
  const prices = {}, sources = {}
  for (const slug of slugs) {
    const b = f.bookmakerOdds?.[slug]
    if (!b || b.bookmakerIsActive === false || b.suspended) continue
    for (const [key, ref] of Object.entries(idx)) {
      if (prices[key] || !ref || ref[1] == null) continue
      const market = b.markets?.[ref[0]]
      const p = market?.outcomes?.[ref[1]]?.players?.['0']
      if (market && market.marketActive !== false && p && p.active !== false && p.price > 1) { prices[key] = p.price; sources[key] = slug }
    }
  }
  if (!Object.keys(prices).length) return null
  return { id: f.fixtureId, home: names[f.participant1Id], away: names[f.participant2Id], start: Date.parse(f.startTime), prices, sources }
}

// OddsPapi lists can arrive as an array or as an object of items; accept both.
const toList = (x) => (Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : x && typeof x === 'object' ? Object.values(x) : [])

// OddsPapi accepts exactly ONE bookmaker per request, so each bookmaker gets its own request and the answers are merged.
export async function fetchGroup(ids, slugs) {
  const merged = new Map()
  let failed = false
  for (const slug of slugs) {
    try {
      const data = await odds.rawCall('/v4/odds-by-tournaments', { bookmaker: slug, tournamentIds: ids.join(',') })
      for (const f of Array.isArray(data) ? data : data?.fixtureId ? [data] : []) {
        const have = merged.get(f.fixtureId)
        if (have) Object.assign(have.bookmakerOdds, f.bookmakerOdds)
        else merged.set(f.fixtureId, f)
      }
    } catch (e) {
      if (/Invalid bookmaker/.test(e.message)) console.log(`  ${slug} has no fixtures for tournaments ${ids.join(',')} (skipped)`)
      else { failed = true; console.log(`  ${slug}: odds request for tournaments ${ids.join(',')} failed: ${e.message}`) }
    }
    await sleep(1100) // OddsPapi allows one request a second per endpoint
  }
  return { fixtures: [...merged.values()], failed }
}

// Loads every upcoming fixture (with prices from the bookmakers, in priority order) for the leagues we cover.
// Cached for 3 hours, but an empty or incomplete result is never cached.
export async function loadOdds(slugs) {
  let tournaments = toList(await odds.getTournaments())
  if (!tournaments[0]?.tournamentId) tournaments = toList(await odds.rawCall('/v4/tournaments', { sportId: odds.SOCCER_SPORT_ID })) // bad cache: fetch fresh
  const ids = []
  const missing = []
  for (const l of LEAGUES) {
    const t = matchTournament(l, tournaments)
    if (t) ids.push(t.tournamentId)
    else missing.push(l.label)
  }
  if (missing.length) console.log(`  no OddsPapi tournament found for ${missing.length} leagues (their games are skipped): ${missing.join(', ')}`)
  let marketList = toList(await odds.getMarkets())
  if (!marketList[0]?.marketId) marketList = toList(await odds.rawCall('/v4/markets')) // bad cache: fetch fresh
  if (!marketList[0]?.marketId) throw new Error(`OddsPapi /v4/markets returned an unexpected shape: ${JSON.stringify(marketList).slice(0, 200)}`)
  const idx = buildMarketIndex(marketList)
  console.log(`  OddsPapi markets found: ${Object.keys(idx).join(', ')}`)
  let failed = false
  return odds.cachedReduced(`reduced3:${slugs.join('+')}:${ids.join(',')}`, async () => {
    const names = await odds.getParticipants()
    const out = []
    for (let i = 0; i < ids.length; i += 5) {
      const group = await fetchGroup(ids.slice(i, i + 5), slugs)
      if (group.failed) failed = true
      for (const f of group.fixtures) { const r = reduceFixture(f, slugs, idx, names); if (r) out.push(r) }
    }
    return out
  }, (d) => !failed && Array.isArray(d) && d.length > 0)
}

export function findOdds(fx, list) {
  const ts = fx.fixture.timestamp * 1000
  let best = null, bestScore = 0
  for (const o of list) {
    if (!o.home || !o.away || Math.abs(o.start - ts) > 3 * 3600e3) continue
    const s1 = sim(fx.teams.home.name, o.home), s2 = sim(fx.teams.away.name, o.away)
    if (s1 >= 0.6 && s2 >= 0.6 && s1 + s2 > bestScore) { best = o; bestScore = s1 + s2 }
  }
  return best
}
