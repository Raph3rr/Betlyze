import * as football from '../services/apiFootball.js'
import PredictionSet from '../PredictionSet.js'
import { SELECTIONS } from './facts.js'

const FINISHED = ['FT', 'AET', 'PEN']
const VOID = ['PST', 'CANC', 'ABD', 'AWD', 'WO', 'SUSP']
const KEY_BY_LABEL = Object.fromEntries(Object.entries(SELECTIONS).map(([k, [m, p]]) => [`${m}|${p}`, k]))
const WINS = {
  home: (h, a) => h > a, away: (h, a) => a > h, dc1x: (h, a) => h >= a, dcx2: (h, a) => a >= h,
  o15: (h, a) => h + a >= 2, o25: (h, a) => h + a >= 3, u35: (h, a) => h + a <= 3, btts: (h, a) => h > 0 && a > 0,
}

// Checks every saved pick of a day against the real final scores (90 minutes, as bookmakers settle).
// Always asks the API fresh (not from cache). Returns that day's fixtures so callers can reuse them.
export async function settleDay(date) {
  const all = (await football.rawCall('/fixtures', { date, timezone: 'Africa/Lagos' })).response
  const set = await PredictionSet.findOne({ date })
  if (!set) { console.log(`  settle ${date}: no saved predictions for that day`); return all }

  const byId = new Map(all.map((f) => [f.fixture.id, f]))
  const count = { won: 0, lost: 0, pending: 0, void: 0 }
  for (const cat of set.categories) {
    for (const pick of cat.picks || []) {
      let lost = false, pending = false, won = false
      for (const g of pick.games) {
        const f = byId.get(g.fixtureId)
        const short = f?.fixture?.status?.short
        const key = g.key || KEY_BY_LABEL[`${g.market}|${g.pick}`]
        if (f && FINISHED.includes(short) && key) {
          const h = f.score?.fulltime?.home ?? f.goals.home
          const a = f.score?.fulltime?.away ?? f.goals.away
          g.score = { home: h, away: a }
          g.status = WINS[key](h, a) ? 'won' : 'lost'
        } else if (f && VOID.includes(short)) g.status = 'void'
        else g.status = 'pending'
        if (g.status === 'lost') lost = true
        else if (g.status === 'pending') pending = true
        else if (g.status === 'won') won = true
      }
      pick.result = lost ? 'lost' : pending ? 'pending' : won ? 'won' : 'void'
      count[pick.result]++
    }
  }
  set.markModified('categories')
  set.settledAt = new Date()
  await set.save()
  console.log(`  settle ${date}: ${count.won} picks won, ${count.lost} lost, ${count.pending} still pending, ${count.void} void`)
  return all
}
