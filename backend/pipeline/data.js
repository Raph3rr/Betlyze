import * as bsd from '../services/bsd.js'
import * as theOdds from '../services/theOddsApi.js'
import { LEAGUES } from './leagues.js'

const oddsApiRunData = new Map()
const REQUIRED_PRICE_KEYS = ['home', 'draw', 'away', 'dc1x', 'dcx2', 'dc12', 'o15', 'o25', 'o35', 'u25', 'u35', 'u45', 'btts', 'bttsNo']

const strip = (s = '') => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const flat = (s) => strip(s).replace(/[^a-z0-9]/g, '')
const norm = (s) => strip(s).replace(/\b(fc|cf|afc|sc|ac|as|ssc|rc|cd|ud|sk|fk|fsv|tsg|vfb|vfl|rb)\b/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

export function sim(a, b) {
  a = norm(a).replace(/\bman\b/, 'manchester').replace(/\butd\b/, 'united').replace(/\bpsg\b/, 'paris saint germain')
  b = norm(b).replace(/\bman\b/, 'manchester').replace(/\butd\b/, 'united').replace(/\bpsg\b/, 'paris saint germain')
  if (!a || !b) return 0
  if (a === b) return 1
  if ((a.includes(b) || b.includes(a)) && Math.min(a.length, b.length) >= 4) return 0.9
  const ta = new Set(a.split(' ')), tb = new Set(b.split(' '))
  return Math.max([...ta].filter((t) => tb.has(t)).length / Math.max(ta.size, tb.size), 1 - lev(a, b) / Math.max(a.length, b.length))
}

export function leagueMatches(f, l) {
  const got = flat(f.league.name), want = flat(l.name)
  return (got.includes(want) || want.includes(got)) && (!l.country || flat(f.league.country) === flat(l.country))
}

const team = (x) => typeof x === 'string' ? x : x?.name || x?.title || ''
const time = (x) => Date.parse(x || '')
const number = (x) => { const n = Number(x); return Number.isFinite(n) && n > 1 ? n : null }
const set = (prices, sources, key, value, source) => { const n = number(value); if (n && !prices[key]) { prices[key] = n; sources[key] = source } }

function fromBsdEvent(event, summary, dcRows = []) {
  const prices = {}, sources = {}
  const fields = summary?.odds || summary || {}
  set(prices, sources, 'home', fields.home_win, 'consensus')
  set(prices, sources, 'draw', fields.draw, 'consensus')
  set(prices, sources, 'away', fields.away_win, 'consensus')
  for (const [key, field] of [['o15','over_15_goals'],['o25','over_25_goals'],['o35','over_35_goals'],['u25','under_25_goals'],['u35','under_35_goals'],['u45','under_45_goals'],['btts','btts_yes'],['bttsNo','btts_no']]) set(prices, sources, key, fields[field], 'consensus')
  for (const row of dcRows.filter((r) => String(r.event_id) === String(event.id))) {
    const outcome = String(row.outcome || row.outcome_name || '').toLowerCase().replace(/\s/g, '')
    const key = ({ '1x':'dc1x', 'homeordraw':'dc1x', '12':'dc12', 'homeoraway':'dc12', 'x2':'dcx2', 'awayordraw':'dcx2' })[outcome]
    if (key) set(prices, sources, key, row.decimal_odds, row.bookmaker_slug || 'consensus')
  }
  const home = team(event.home_team), away = team(event.away_team)
  const start = time(event.event_date || event.start_time || event.date)
  return home && away && Number.isFinite(start) ? { id: `bsd-${event.id}`, home, away, start, prices, sources } : null
}

function fromOddsApi(event) {
  const prices = {}, sources = {}
  for (const bookmaker of event.bookmakers || []) for (const market of bookmaker.markets || []) {
    const source = bookmaker.key || bookmaker.title || 'theoddsapi'
    if (market.key === 'h2h') for (const o of market.outcomes || []) {
      if (o.name === event.home_team) set(prices, sources, 'home', o.price, source)
      else if (o.name === event.away_team) set(prices, sources, 'away', o.price, source)
      else if (/draw/i.test(o.name)) set(prices, sources, 'draw', o.price, source)
    }
    if (market.key === 'totals') for (const o of market.outcomes || []) {
      if (Number(o.point) === 1.5 && o.name === 'Over') set(prices, sources, 'o15', o.price, source)
      if (Number(o.point) === 2.5 && o.name === 'Over') set(prices, sources, 'o25', o.price, source)
      if (Number(o.point) === 2.5 && o.name === 'Under') set(prices, sources, 'u25', o.price, source)
      if (Number(o.point) === 3.5 && o.name === 'Over') set(prices, sources, 'o35', o.price, source)
      if (Number(o.point) === 3.5 && o.name === 'Under') set(prices, sources, 'u35', o.price, source)
      if (Number(o.point) === 4.5 && o.name === 'Under') set(prices, sources, 'u45', o.price, source)
    }
  }
  const start = time(event.commence_time)
  return event.home_team && event.away_team && Number.isFinite(start) ? { id: `oddsapi-${event.id}`, home: event.home_team, away: event.away_team, start, prices, sources } : null
}

// BSD consensus is preferred; The Odds API fills gaps when its event/market prices are available.
export async function loadOdds(fixtures, date) {
  const merged = []
  const failures = []
  const coverage = new Map(fixtures.map((f) => [f.fixture.id, {
    fixture: f,
    BSD: { event: false, keys: new Set(), status: process.env.BSD_API_KEY ? 'event lookup pending' : 'key not configured' },
    'The Odds API': {
      event: false, keys: new Set(), sportKey: LEAGUES.find((l) => l.id === f.league.id)?.oddsApi || null,
      status: LEAGUES.find((l) => l.id === f.league.id)?.oddsApi ? 'competition lookup pending' : 'no competition key mapped',
    },
  }]))
  const bestFixture = (item) => {
    let best = null, score = 0
    for (const f of fixtures) {
      if (Math.abs(f.fixture.timestamp * 1000 - item.start) > 3 * 3600e3) continue
      const home = sim(f.teams.home.name, item.home), away = sim(f.teams.away.name, item.away)
      if (home >= 0.6 && away >= 0.6 && home + away > score) { best = f; score = home + away }
    }
    return best
  }
  const recordProvider = (fixture, name, item) => {
    const record = coverage.get(fixture.fixture.id)?.[name]
    if (!record) return
    record.event = true
    for (const key of Object.keys(item.prices)) record.keys.add(key)
  }
  if (process.env.BSD_API_KEY) {
    try {
      const rows = await bsd.getEvents(date)
      const pairs = []
      for (const event of rows) {
        const item = fromBsdEvent(event, null)
        if (!item) continue
        const fx = bestFixture(item)
        if (fx) pairs.push({ event, item })
      }
      for (const f of fixtures) coverage.get(f.fixture.id).BSD.status = 'checked'
      for (const { event, item } of pairs) {
        const fixture = bestFixture(item)
        if (fixture) recordProvider(fixture, 'BSD', item)
        try {
          const [summary, dcBody] = await Promise.all([bsd.getEventOdds(event.id), bsd.getEventMarket(event.id, 'double_chance')])
          const dc = Array.isArray(dcBody) ? dcBody : dcBody?.results || dcBody?.data || []
          const priced = fromBsdEvent(event, summary, dc)
          Object.assign(item.prices, priced?.prices || {})
          Object.assign(item.sources, priced?.sources || {})
        } catch (e) { console.log(`  BSD prices unavailable for ${item.home} vs ${item.away}: ${e.message}`) }
        if (fixture) recordProvider(fixture, 'BSD', item)
        merged.push(item)
      }
      console.log(`  BSD: ${pairs.length} matching events; consensus prices loaded where available`)
    } catch (e) {
      failures.push(`BSD: ${e.message}`)
      for (const f of fixtures) coverage.get(f.fixture.id).BSD.status = 'request failed'
      console.log(`  BSD odds unavailable: ${e.message}`)
    }
  } else console.log('  BSD skipped: BSD_API_KEY is not configured')

  if (process.env.ODDSAPI_KEY) {
    try {
      const sports = await theOdds.getSports()
      const upcoming = fixtures.filter((f) => f.fixture.date.startsWith(date))
      const active = new Set(sports.filter((s) => s.active).map((s) => s.key))
      const cap = Number(process.env.ODDS_API_MAX_SPORTS_PER_RUN) || 8
      const keyStats = new Map()
      for (const f of upcoming) {
        const league = LEAGUES.find((l) => l.id === f.league.id)
        if (!league?.oddsApi) continue
        const stat = keyStats.get(league.oddsApi) || { key: league.oddsApi, tier: league.tier, fixtures: 0, rank: LEAGUES.indexOf(league) }
        stat.tier = Math.min(stat.tier, league.tier)
        stat.fixtures++
        keyStats.set(league.oddsApi, stat)
      }
      const prioritized = [...keyStats.values()].filter((x) => active.has(x.key))
        .sort((a, b) => a.tier - b.tier || b.fixtures - a.fixtures || a.rank - b.rank)
      const cachedKeys = prioritized.filter((x) => oddsApiRunData.has(x.key))
      const newKeySlots = Math.max(0, cap - oddsApiRunData.size)
      const newKeys = prioritized.filter((x) => !oddsApiRunData.has(x.key)).slice(0, newKeySlots)
      const selected = [...cachedKeys, ...newKeys].map((x) => x.key)
      for (const f of upcoming) {
        const record = coverage.get(f.fixture.id)['The Odds API']
        record.status = !record.sportKey ? 'no competition key mapped'
          : !active.has(record.sportKey) ? 'competition key inactive'
            : selected.includes(record.sportKey) ? 'queried' : 'skipped: per-run key cap'
      }
      for (const key of selected) {
        try {
          let result = oddsApiRunData.get(key)
          if (!result) { result = await theOdds.getSoccerOdds(key); oddsApiRunData.set(key, result) }
          for (const raw of result.data) {
            const item = fromOddsApi(raw)
            if (!item) continue
            const fixture = bestFixture(item)
            if (fixture) recordProvider(fixture, 'The Odds API', item)
            const old = merged.find((o) => sim(o.home, item.home) >= 0.8 && sim(o.away, item.away) >= 0.8 && Math.abs(o.start - item.start) <= 3 * 3600e3)
            if (old) { for (const [k,v] of Object.entries(item.prices)) if (!old.prices[k]) { old.prices[k] = v; old.sources[k] = item.sources[k] } }
            else merged.push(item)
          }
          console.log(`  The Odds API ${key}: ${result.data.length} events; remaining monthly credits=${result.remaining ?? 'unknown'}, last request cost=${result.lastCost ?? 'unknown'}`)
        } catch (e) {
          failures.push(`The Odds API ${key}: ${e.message}`)
          for (const f of upcoming) if (coverage.get(f.fixture.id)['The Odds API'].sportKey === key) coverage.get(f.fixture.id)['The Odds API'].status = 'request failed'
          console.log(`  The Odds API ${key} failed: ${e.message}`)
        }
      }
      if (!selected.length) console.log('  The Odds API: no active configured competition keys for this date')
    } catch (e) {
      failures.push(`The Odds API: ${e.message}`)
      for (const f of fixtures) coverage.get(f.fixture.id)['The Odds API'].status = 'provider lookup failed'
      console.log(`  The Odds API unavailable: ${e.message}`)
    }
  } else console.log('  The Odds API skipped: ODDSAPI_KEY is not configured')

  if (!merged.length && failures.length) throw new Error(failures.join('; '))

  const diagnostics = []
  const leagues = new Map()
  for (const f of fixtures) {
    const id = f.league.id
    if (!leagues.has(id)) leagues.set(id, { id, label: LEAGUES.find((l) => l.id === id)?.label || f.league.name, fixtures: [] })
    leagues.get(id).fixtures.push(f)
  }
  for (const league of leagues.values()) {
    const rows = league.fixtures
    const sources = {}
    for (const name of ['BSD', 'The Odds API']) {
      const events = rows.filter((f) => coverage.get(f.fixture.id)[name].event)
      const missing = REQUIRED_PRICE_KEYS.map((key) => [key, events.filter((f) => !coverage.get(f.fixture.id)[name].keys.has(key)).length]).filter(([, count]) => count)
      const unmatchedFixtures = rows.filter((f) => !coverage.get(f.fixture.id)[name].event).map((f) => `${f.teams.home.name} vs ${f.teams.away.name}`)
      const statuses = [...new Set(rows.map((f) => coverage.get(f.fixture.id)[name].status))]
      const sportKeys = [...new Set(rows.map((f) => coverage.get(f.fixture.id)[name].sportKey).filter(Boolean))]
      sources[name] = { matched: events.length, missing, unmatched: rows.length - events.length, unmatchedFixtures, statuses, sportKeys }
    }
    const combinedMissing = REQUIRED_PRICE_KEYS.map((key) => [key, rows.filter((f) => !findOdds(f, merged)?.prices?.[key]).length]).filter(([, count]) => count)
    diagnostics.push({ league: league.label, fixtures: rows.length, sources, combinedMissing })
  }
  return { odds: merged, diagnostics }
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
