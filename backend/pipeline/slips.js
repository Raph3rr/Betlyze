function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// The math lives here, in code: slips whose combined odds land within +/-10% of the target, ranked by joint probability.
export function buildCandidates(fixtures, target, seed, { tries = 2500, maxLegs = 8, keep = 8 } = {}) {
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
  const chosen = []
  for (const c of found) {
    const ids = new Set(c.legs.map((l) => l.fixtureId))
    const tooSimilar = chosen.some((o) => o.legs.filter((l) => ids.has(l.fixtureId)).length / Math.max(ids.size, o.legs.length) > 0.5)
    if (!tooSimilar) chosen.push(c)
    if (chosen.length >= keep) break
  }
  return chosen.map((c, i) => ({ id: `c${target}-${i + 1}`, ...c }))
}

// Builds slips from tier-1 (major) fixtures first and only adds other leagues when there are not enough.
export function buildTiered(items, target, seed, keep = 8) {
  const key = (c) => c.legs.map((l) => `${l.fixtureId}:${l.key}`).sort().join('|')
  let list = buildCandidates(items.filter((i) => i.tier === 1), target, seed, { keep })
  if (list.length < 5) {
    const have = new Set(list.map(key))
    list = [...list, ...buildCandidates(items, target, seed + 1000, { keep }).filter((c) => !have.has(key(c)))].slice(0, keep)
  }
  return list.map((c, i) => ({ ...c, id: `c${target}-${i + 1}` }))
}

const sharedGames = (a, b) => a.legs.filter((l) => b.legs.some((m) => m.fixtureId === l.fixtureId)).length

// Lowest chance a single game may have to enter a pick of that odds level. Lower odds levels must be safer.
// If there are not enough games that clear the bar, the bar is lowered step by step (never below 50%).
const MIN_LEG_PROB = { 2: 0.7, 3: 0.68, 5: 0.65, 10: 0.6 }

export function buildSafest(items, target, seed) {
  const base = MIN_LEG_PROB[target] ?? 0.6
  let best = []
  for (let minP = base; minP >= 0.5 - 1e-9; minP -= 0.05) {
    const pool = items.map((i) => ({ ...i, legs: i.legs.filter((l) => l.p >= minP) })).filter((i) => i.legs.length)
    const list = buildTiered(pool, target, seed)
    if (list.length >= 5) return list
    if (list.length > best.length) best = list
  }
  return best
}

// Picks up to `want` slips in the given order. Preference order:
//  1) no game shared with an earlier pick of this level AND no game already used elsewhere today,
//  2) allow a game that is used once elsewhere (so at most 2 uses a day),
//  3) only then allow sharing. `used` carries game usage across all odds levels of the day.
export function pickDiverse(order, want = 5, used = new Map()) {
  const chosen = []
  const fresh = (c, maxUsed) => c.legs.every((l) => (used.get(l.fixtureId) || 0) <= maxUsed)
  for (const [maxShared, maxUsed] of [[0, 0], [0, 1], [1, 1], [2, 1], [99, 99]]) {
    for (const c of order) {
      if (chosen.length >= want) break
      if (!chosen.includes(c) && chosen.every((o) => sharedGames(o, c) <= maxShared) && fresh(c, maxUsed)) chosen.push(c)
    }
    if (chosen.length >= want) break
  }
  for (const c of chosen) for (const l of c.legs) used.set(l.fixtureId, (used.get(l.fixtureId) || 0) + 1)
  return chosen
}

// Builds a level's candidates while respecting the day-wide cap: first from games not used yet today,
// then from games used once, and only as a last resort from any game.
export function buildWithCap(items, target, seed, used) {
  let best = []
  for (const maxUsed of [0, 1, 99]) {
    const pool = items.filter((i) => (used.get(i.fixtureId) || 0) <= maxUsed)
    const list = buildSafest(pool, target, seed)
    if (list.length >= 5) return list
    if (list.length > best.length) best = list
  }
  return best
}
