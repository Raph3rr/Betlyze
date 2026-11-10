function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// The math lives here, in code: slips whose combined odds land within +/-10% of the target, ranked by joint probability.
export function buildCandidates(fixtures, target, seed, { tries = 3000, maxLegs = 8, keep = 10 } = {}) {
  const rand = rng(seed)
  const seen = new Set()
  const found = []
  for (let a = 0; a < tries; a++) {
    const legs = []
    let odds = 1, p = 1
    for (const f of [...fixtures].sort(() => rand() - 0.5)) {
      const l = f.legs[Math.floor(rand() * f.legs.length)]
      legs.push({ fixtureId: f.fixtureId, ...l })
      odds *= l.odds; p *= l.p
      if (odds >= target * 0.9 || legs.length >= maxLegs) break
    }
    if (odds < target * 0.9 || odds > target * 1.1) continue
    const key = legs.map((l) => `${l.fixtureId}:${l.key}`).sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)
    found.push({ odds: Number(odds.toFixed(2)), p, legs })
  }
  found.sort((x, y) => y.p - x.p)
  // Prefer slips that share no game with the ones already kept; only then allow some overlap.
  const chosen = []
  for (const maxOverlap of [0, 0.34, 0.5]) {
    for (const c of found) {
      if (chosen.length >= keep) break
      if (chosen.includes(c)) continue
      const ids = new Set(c.legs.map((l) => l.fixtureId))
      if (chosen.every((o) => o.legs.filter((l) => ids.has(l.fixtureId)).length / Math.max(ids.size, o.legs.length) <= maxOverlap)) chosen.push(c)
    }
  }
  return chosen.map((c, i) => ({ id: `c${target}-${i + 1}`, ...c }))
}

const sharedGames = (a, b) => a.legs.filter((l) => b.legs.some((m) => m.fixtureId === l.fixtureId)).length
const slipKey = (c) => c.legs.map((l) => `${l.fixtureId}:${l.key}`).sort().join('|')

// Lowest chance a single game may have to enter a pick of that odds level. Lower odds levels must be safer.
// If there are not enough games that clear the bar, the bar is lowered step by step down to `floor`.
const MIN_LEG_PROB = { 2: 0.7, 3: 0.68, 5: 0.65, 10: 0.6 }
const LEVEL_FLOOR = [0.5, 0.45, 0.4] // the lowest chance allowed at strictness level 0, 1 and 2

export function buildSafest(items, target, seed, floor = 0.5) {
  const base = Math.max(MIN_LEG_PROB[target] ?? 0.6, floor)
  let best = []
  for (let minP = base; minP >= floor - 1e-9; minP -= 0.05) {
    const pool = items.map((i) => ({ ...i, legs: i.legs.filter((l) => l.p >= minP) })).filter((i) => i.legs.length)
    const list = buildCandidates(pool, target, seed, { keep: 10 })
    if (list.length >= 5) return list
    if (list.length > best.length) best = list
  }
  return best
}

// Builds a level's candidates while respecting the day-wide cap: first from games not used yet today,
// then from games used once, and only as a last resort from any game.
function buildWithCap(items, target, seed, used, floor) {
  let best = []
  for (const maxUsed of [0, 1, 99]) {
    const pool = items.filter((i) => (used.get(i.fixtureId) || 0) <= maxUsed)
    const list = buildSafest(pool, target, seed, floor)
    if (list.length >= 5) return list
    if (list.length > best.length) best = list
  }
  return best
}

const STRICT = [[0, 0], [0, 1]] // no game shared inside the level, and each game used at most twice in the day
const RELAXED = [[1, 1], [2, 1], [1, 99], [2, 99], [99, 99]] // only used to reach the minimum number of picks

// Picks up to `want` slips in the given order. Strict rules first. If that gives fewer than `minWant`, repeats are
// allowed step by step until `minWant` is reached. `used` counts how many picks already use each game today.
export function pickDiverse(order, want = 5, used = new Map(), { minWant = 0, commit = true } = {}) {
  const chosen = []
  const fresh = (c, maxUsed) => c.legs.every((l) => (used.get(l.fixtureId) || 0) <= maxUsed)
  const run = (passes, limit) => {
    for (const [maxShared, maxUsed] of passes) {
      for (const c of order) {
        if (chosen.length >= limit) return
        if (!chosen.includes(c) && chosen.every((o) => sharedGames(o, c) <= maxShared) && fresh(c, maxUsed)) chosen.push(c)
      }
    }
  }
  run(STRICT, want)
  if (chosen.length < minWant) run(RELAXED, minWant)
  if (commit) for (const c of chosen) for (const l of c.legs) used.set(l.fixtureId, (used.get(l.fixtureId) || 0) + 1)
  return chosen
}

// [majors only?, strictness level]. Major competitions get loosened once before any smaller league is added.
const STEPS = [[true, 0], [true, 1], [false, 0], [false, 1], [true, 2], [false, 2]]

// items: [{ fixtureId, tier, legsByLevel: [strict legs, looser legs, loosest legs] }]. Stops as soon as 5 picks sharing no game are possible.
export function buildLadder(items, target, seed, used) {
  const seen = new Set()
  const merged = []
  let stepUsed = null
  for (const [majorsOnly, level] of STEPS) {
    const pool = items.filter((i) => !majorsOnly || i.tier === 1).map((i) => ({ fixtureId: i.fixtureId, tier: i.tier, legs: i.legsByLevel[level] })).filter((i) => i.legs.length)
    if (!pool.length) continue
    for (const c of buildWithCap(pool, target, seed + level * 31 + (majorsOnly ? 0 : 7), used, LEVEL_FLOOR[level])) {
      if (!seen.has(slipKey(c))) { seen.add(slipKey(c)); merged.push(c) }
    }
    stepUsed = { majorsOnly, level }
    if (pickDiverse(merged, 5, used, { commit: false }).length >= 5) break
  }
  return { candidates: merged.slice(0, 12).map((c, i) => ({ ...c, id: `c${target}-${i + 1}` })), stepUsed }
}
