// Run with: npm run calibration
// Compares what our model PREDICTED with what actually happened, using every settled day in the database.
// No API requests. Use it to see where the percentages are too optimistic.
import 'dotenv/config'
import dns from 'node:dns'
if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',').map((x) => x.trim()))
import mongoose from 'mongoose'
import PredictionSet from '../PredictionSet.js'

const DONE = ['won', 'lost']
const rate = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '-')

await mongoose.connect(process.env.MONGODB_URI)
const sets = await PredictionSet.find({}).lean()

const byLevel = {}, byMarket = {}, byBucket = {}, seen = new Set()
for (const set of sets) {
  for (const cat of set.categories || []) {
    for (const pick of cat.picks || []) {
      if (!DONE.includes(pick.result)) continue
      const lv = (byLevel[cat.odds] ||= { picks: 0, won: 0, expected: 0 })
      lv.picks++; lv.won += pick.result === 'won'; lv.expected += (pick.chance ?? 0) / 100
      for (const g of pick.games) {
        const id = `${set.date}|${g.fixtureId}|${g.key || g.pick}`
        if (!DONE.includes(g.status) || seen.has(id)) continue // each game counted once, even if it is in several picks
        seen.add(id)
        const mk = (byMarket[g.key ? `${g.market}: ${g.pick}` : g.pick] ||= { games: 0, won: 0, predicted: 0 })
        const b = Math.min(90, Math.floor(g.pct / 10) * 10)
        const bk = (byBucket[`${b}-${b + 9}%`] ||= { games: 0, won: 0, predicted: 0 })
        for (const t of [mk, bk]) { t.games++; t.won += g.status === 'won'; t.predicted += g.pct }
      }
    }
  }
}

const show = (title, obj, cols) => {
  console.log(`\n${title}`)
  console.table(Object.fromEntries(Object.entries(obj).sort().map(([k, v]) => [k, cols(v)])))
}
show('By odds level (expected wins = sum of our estimated chances)', byLevel, (v) => ({ picks: v.picks, won: v.won, actual: rate(v.won, v.picks), expectedWins: v.expected.toFixed(1) }))
show('By single game, grouped by the confidence we showed', byBucket, (v) => ({ games: v.games, won: v.won, predicted: `${Math.round(v.predicted / v.games)}%`, actual: rate(v.won, v.games) }))
show('By market', byMarket, (v) => ({ games: v.games, won: v.won, predicted: `${Math.round(v.predicted / v.games)}%`, actual: rate(v.won, v.games) }))
console.log(`\nDays settled: ${sets.filter((s) => (s.categories || []).some((c) => (c.picks || []).some((p) => DONE.includes(p.result)))).length}. Fewer than ~100 games per row means the numbers are still mostly luck.`)
await mongoose.disconnect()
process.exit(0)
