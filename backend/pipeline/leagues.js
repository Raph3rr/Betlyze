export const CATEGORIES = [2, 3, 5, 10]
export const FREE = [2, 3]

// id = API-Football league id. tier 1 = headline leagues and cups. tier 2 = fills the quiet days so every day has games.
// `odds` is a pattern for the OddsPapi tournament name when it differs from `name`. `country` must match OddsPapi's category.
// Edit this list freely. The generator prints any league it cannot match on the odds side.
export const LEAGUES = [
  { id: 39, name: 'Premier League', country: 'England', tier: 1 },
  { id: 140, name: 'La Liga', country: 'Spain', tier: 1 },
  { id: 135, name: 'Serie A', country: 'Italy', tier: 1 },
  { id: 78, name: 'Bundesliga', country: 'Germany', tier: 1 },
  { id: 61, name: 'Ligue 1', country: 'France', tier: 1 },
  { id: 88, name: 'Eredivisie', country: 'Netherlands', tier: 1 },
  { id: 94, name: 'Primeira Liga', country: 'Portugal', tier: 1, odds: /primeira liga|liga portugal/i },
  { id: 2, name: 'UEFA Champions League', tier: 1, odds: /^uefa champions league$/i },
  { id: 3, name: 'UEFA Europa League', tier: 1, odds: /^uefa europa league$/i },
  { id: 848, name: 'UEFA Conference League', tier: 1, odds: /conference league/i },
  { id: 45, name: 'FA Cup', country: 'England', tier: 1 },
  { id: 48, name: 'League Cup', country: 'England', tier: 1, odds: /efl cup|league cup|carabao/i },
  { id: 143, name: 'Copa del Rey', country: 'Spain', tier: 1 },
  { id: 137, name: 'Coppa Italia', country: 'Italy', tier: 1 },
  { id: 81, name: 'DFB Pokal', country: 'Germany', tier: 1, odds: /dfb.?pokal/i },
  { id: 66, name: 'Coupe de France', country: 'France', tier: 1 },
  { id: 90, name: 'KNVB Beker', country: 'Netherlands', tier: 1 },

  { id: 40, name: 'Championship', country: 'England', tier: 2 },
  { id: 136, name: 'Serie B', country: 'Italy', tier: 2 },
  { id: 79, name: '2. Bundesliga', country: 'Germany', tier: 2 },
  { id: 62, name: 'Ligue 2', country: 'France', tier: 2 },
  { id: 141, name: 'La Liga 2', country: 'Spain', tier: 2, odds: /laliga 2|segunda/i },
  { id: 203, name: 'Süper Lig', country: 'Turkey', tier: 2, odds: /s[uü]per lig/i },
  { id: 179, name: 'Premiership', country: 'Scotland', tier: 2 },
  { id: 144, name: 'Pro League', country: 'Belgium', tier: 2, odds: /pro league/i },
  { id: 253, name: 'Major League Soccer', country: 'USA', tier: 2, odds: /major league soccer|^mls$/i },
  { id: 71, name: 'Serie A', country: 'Brazil', tier: 2, odds: /^brasileiro serie a$/i },
  { id: 262, name: 'Liga MX', country: 'Mexico', tier: 2, odds: /liga mx/i },
  { id: 307, name: 'Pro League', country: 'Saudi Arabia', tier: 2, odds: /pro league/i },
  { id: 128, name: 'Liga Profesional', country: 'Argentina', tier: 2, odds: /liga profesional|primera division/i },
  { id: 13, name: 'Copa Libertadores', tier: 2, odds: /libertadores/i },
  { id: 11, name: 'Copa Sudamericana', tier: 2, odds: /sudamericana/i },
  { id: 12, name: 'CAF Champions League', tier: 2, odds: /caf champions league/i },
  { id: 233, name: 'Premier League', country: 'Egypt', tier: 2 },
]
