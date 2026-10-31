import * as football from '../services/apiFootball.js'

const FINISHED = ['FT', 'AET', 'PEN']

// Absences. One request per league per day returns the injuries and suspensions for every fixture in that league.
// Returns a function: fixture -> { home: [...], away: [...] } or null when the league returned nothing (coverage unknown).
export async function loadInjuries(fixtures, date, api = football) {
  const byFixture = new Map()
  const leagues = new Map(fixtures.map((f) => [`${f.league.id}:${f.league.season}`, f.league]))
  for (const lg of leagues.values()) {
    try {
      const { response } = await api.getInjuries(lg.id, lg.season, date)
      console.log(`  injuries: ${lg.name} returned ${response.length} rows`)
      for (const r of response) {
        const id = r.fixture?.id
        if (!byFixture.has(id)) byFixture.set(id, [])
        byFixture.get(id).push({ teamId: r.team?.id, player: r.player?.name, status: /question/i.test(r.player?.type || '') ? 'doubtful' : 'missing', reason: r.player?.reason || null })
      }
      lg.__covered = response.length > 0
    } catch (e) {
      console.log(`  injuries for ${lg.name} unavailable: ${e.message}`)
      if (/budget/.test(e.message)) break
    }
  }
  return (f) => {
    if (!leagues.get(`${f.league.id}:${f.league.season}`)?.__covered) return null // no data for this league: say nothing about absences
    const rows = byFixture.get(f.fixture.id) || []
    const pick = (teamId) => rows.filter((x) => x.teamId === teamId).sort((a, b) => (a.status === 'missing' ? 0 : 1) - (b.status === 'missing' ? 0 : 1)).slice(0, 6).map(({ player, status, reason }) => ({ player, status, reason }))
    return { home: pick(f.teams.home.id), away: pick(f.teams.away.id) }
  }
}

// Formation and rotation from each team's last two finished games (needs the team's recent games first).
export async function previousLineups(f, recent, api = football) {
  const out = {}
  for (const side of ['home', 'away']) {
    const teamId = f.teams[side].id
    const games = (recent[side] || []).filter((m) => FINISHED.includes(m.fixture?.status?.short)).sort((a, b) => b.fixture.timestamp - a.fixture.timestamp).slice(0, 2)
    const xis = []
    for (const m of games) {
      try {
        const entry = (await api.getLineups(m.fixture.id)).response.find((x) => x.team?.id === teamId)
        if (entry?.startXI?.length) xis.push({ formation: entry.formation, coach: entry.coach?.name, ids: new Set(entry.startXI.map((p) => p.player.id)) })
      } catch (e) {
        if (/budget/.test(e.message)) break
      }
    }
    if (xis.length) out[side] = {
      formationsInLastGames: xis.map((x) => x.formation), coach: xis[0].coach || null, gamesChecked: xis.length,
      startersChangedSincePreviousGame: xis.length > 1 ? [...xis[0].ids].filter((id) => !xis[1].ids.has(id)).length : null,
    }
  }
  return Object.keys(out).length ? out : null
}

// Our probabilities drop a little when the team we back has several players listed as missing.
export function adjustForAbsences(probs, absences) {
  if (!absences) return probs
  const out = (list) => list.filter((x) => x.status === 'missing').length
  const factor = (n) => 1 - 0.03 * Math.min(Math.max(n - 1, 0), 5)
  const fh = factor(out(absences.home)), fa = factor(out(absences.away))
  const p = { ...probs }
  if (p.home != null) p.home *= fh
  if (p.dc1x != null) p.dc1x *= fh
  if (p.away != null) p.away *= fa
  if (p.dcx2 != null) p.dcx2 *= fa
  return p
}
