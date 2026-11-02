export const CATEGORIES = [2, 3, 5, 10]
export const FREE = [2] // only the 2-odds level is free; 3, 5 and 10 odds are Pro

// id = API-Football league id. label = the full name shown to users. tier 1 = headline leagues and cups. tier 2 = fills the quiet days so every day has games.
// `odds` is a pattern for the OddsPapi tournament name when it differs from `name`. `country` must match OddsPapi's category.
// Edit this list freely. The generator prints any league it cannot match on the odds side.
export const LEAGUES = [
  { id: 39, label: 'English Premier League', name: 'Premier League', country: 'England', tier: 1 },
  { id: 140, label: 'Spanish La Liga', name: 'La Liga', country: 'Spain', tier: 1 },
  { id: 135, label: 'Italian Serie A', name: 'Serie A', country: 'Italy', tier: 1 },
  { id: 78, label: 'German Bundesliga', name: 'Bundesliga', country: 'Germany', tier: 1 },
  { id: 61, label: 'French Ligue 1', name: 'Ligue 1', country: 'France', tier: 1 },
  { id: 88, label: 'Dutch Eredivisie', name: 'Eredivisie', country: 'Netherlands', tier: 1 },
  { id: 94, label: 'Portuguese Primeira Liga', name: 'Primeira Liga', country: 'Portugal', tier: 1, odds: /primeira liga|liga portugal/i },
  { id: 2, label: 'UEFA Champions League', name: 'UEFA Champions League', tier: 1, odds: /^uefa champions league$/i },
  { id: 3, label: 'UEFA Europa League', name: 'UEFA Europa League', tier: 1, odds: /^uefa europa league$/i },
  { id: 848, label: 'UEFA Conference League', name: 'UEFA Conference League', tier: 1, odds: /conference league/i },
  { id: 45, label: 'English FA Cup', name: 'FA Cup', country: 'England', tier: 1 },
  { id: 48, label: 'English League Cup', name: 'League Cup', country: 'England', tier: 1, odds: /efl cup|league cup|carabao/i },
  { id: 143, label: 'Spanish Copa del Rey', name: 'Copa del Rey', country: 'Spain', tier: 1 },
  { id: 137, label: 'Italian Coppa Italia', name: 'Coppa Italia', country: 'Italy', tier: 1 },
  { id: 81, label: 'German DFB-Pokal', name: 'DFB Pokal', country: 'Germany', tier: 1, odds: /dfb.?pokal/i },
  { id: 66, label: 'French Coupe de France', name: 'Coupe de France', country: 'France', tier: 1 },
  { id: 90, label: 'Dutch KNVB Beker', name: 'KNVB Beker', country: 'Netherlands', tier: 1 },

  { id: 40, label: 'English Championship', name: 'Championship', country: 'England', tier: 2 },
  { id: 136, label: 'Italian Serie B', name: 'Serie B', country: 'Italy', tier: 2 },
  { id: 79, label: 'German 2. Bundesliga', name: '2. Bundesliga', country: 'Germany', tier: 2 },
  { id: 62, label: 'French Ligue 2', name: 'Ligue 2', country: 'France', tier: 2 },
  { id: 141, label: 'Spanish La Liga 2', name: 'La Liga 2', country: 'Spain', tier: 2, odds: /laliga 2|segunda/i },
  { id: 203, label: 'Turkish Süper Lig', name: 'Süper Lig', country: 'Turkey', tier: 2, odds: /s[uü]per lig/i },
  { id: 179, label: 'Scottish Premiership', name: 'Premiership', country: 'Scotland', tier: 2 },
  { id: 144, label: 'Belgian Pro League', name: 'Pro League', country: 'Belgium', tier: 2, odds: /pro league/i },
  { id: 71, label: 'Brazilian Serie A', name: 'Serie A', country: 'Brazil', tier: 2, odds: /^brasileiro serie a$/i },
  { id: 262, label: 'Mexican Liga MX', name: 'Liga MX', country: 'Mexico', tier: 2, odds: /liga mx/i },
  { id: 307, label: 'Saudi Pro League', name: 'Pro League', country: 'Saudi Arabia', tier: 2, odds: /pro league/i },
  { id: 128, label: 'Argentine Liga Profesional', name: 'Liga Profesional', country: 'Argentina', tier: 2, odds: /liga profesional|primera division/i },
  { id: 13, label: 'Copa Libertadores', name: 'Copa Libertadores', tier: 2, odds: /libertadores/i },
  { id: 11, label: 'Copa Sudamericana', name: 'Copa Sudamericana', tier: 2, odds: /sudamericana/i },
  { id: 12, label: 'CAF Champions League', name: 'CAF Champions League', tier: 2, odds: /caf champions league/i },
  { id: 233, label: 'Egyptian Premier League', name: 'Premier League', country: 'Egypt', tier: 2 },
]
