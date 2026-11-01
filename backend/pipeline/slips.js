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

// Picks up to `want` slips in the given order, preferring slips that share NO game with an earlier pick
// (one lost game then cannot sink several picks). Sharing is only allowed when there is no other way.
export function pickDiverse(order, want = 5) {
  const chosen = []
  for (const maxShared of [0, 1, 2, 99]) {
    for (const c of order) {
      if (chosen.length >= want) return chosen
      if (!chosen.includes(c) && chosen.every((o) => sharedGames(o, c) <= maxShared)) chosen.push(c)
    }
  }
  return chosen
}
