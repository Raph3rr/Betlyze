export const CATEGORIES = [2, 3, 5, 10]
export const FREE = [2] // only the 2-odds level is free; 3, 5 and 10 odds are Pro

// Coverage is intentionally curated: senior internationals, established European leagues/cups,
// selected European second tiers, and other well-followed top divisions with supported odds markets.
// We do not pull local/global leagues just to pad the slate. Tier 0 internationals lead during breaks.
export const LEAGUES = [
  // Senior internationals (youth fixtures are filtered in generate.js)
  { id: 10, label: 'International Friendlies', name: 'Friendlies', tier: 0, oddsApi: 'soccer_international_friendlies' },
  { id: 5, label: 'UEFA Nations League', name: 'UEFA Nations League', tier: 0, oddsApi: 'soccer_uefa_nations_league' },
  { id: 36, label: 'Africa Cup of Nations Qualifying', name: 'Africa Cup of Nations - Qualification', tier: 0, oddsApi: 'soccer_africa_cup_of_nations' },

  // Established top European leagues and major cups
  { id: 39, label: 'English Premier League', name: 'Premier League', country: 'England', tier: 1, oddsApi: 'soccer_epl' },
  { id: 140, label: 'Spanish La Liga', name: 'La Liga', country: 'Spain', tier: 1, oddsApi: 'soccer_spain_la_liga' },
  { id: 135, label: 'Italian Serie A', name: 'Serie A', country: 'Italy', tier: 1, oddsApi: 'soccer_italy_serie_a' },
  { id: 78, label: 'German Bundesliga', name: 'Bundesliga', country: 'Germany', tier: 1, oddsApi: 'soccer_germany_bundesliga' },
  { id: 61, label: 'French Ligue 1', name: 'Ligue 1', country: 'France', tier: 1, oddsApi: 'soccer_france_ligue_one' },
  { id: 88, label: 'Dutch Eredivisie', name: 'Eredivisie', country: 'Netherlands', tier: 1, oddsApi: 'soccer_netherlands_eredivisie' },
  { id: 94, label: 'Portuguese Primeira Liga', name: 'Primeira Liga', country: 'Portugal', tier: 1, oddsApi: 'soccer_portugal_primeira_liga' },
  { id: 2, label: 'UEFA Champions League', name: 'Champions League', tier: 1, oddsApi: 'soccer_uefa_champs_league' },
  { id: 3, label: 'UEFA Europa League', name: 'Europa League', tier: 1, oddsApi: 'soccer_uefa_europa_league' },
  { id: 848, label: 'UEFA Conference League', name: 'Conference League', tier: 1, oddsApi: 'soccer_uefa_europa_conference_league' },
  { id: 45, label: 'English FA Cup', name: 'FA Cup', country: 'England', tier: 1, oddsApi: 'soccer_fa_cup' },
  { id: 48, label: 'English League Cup', name: 'League Cup', country: 'England', tier: 1, oddsApi: 'soccer_england_efl_cup' },
  { id: 143, label: 'Spanish Copa del Rey', name: 'Copa del Rey', country: 'Spain', tier: 1, oddsApi: 'soccer_spain_copa_del_rey' },
  { id: 137, label: 'Italian Coppa Italia', name: 'Coppa Italia', country: 'Italy', tier: 1, oddsApi: 'soccer_italy_coppa_italia' },
  { id: 81, label: 'German DFB-Pokal', name: 'DFB Pokal', country: 'Germany', tier: 1, oddsApi: 'soccer_germany_dfb_pokal' },
  { id: 66, label: 'French Coupe de France', name: 'Coupe de France', country: 'France', tier: 1, oddsApi: 'soccer_france_coupe_de_france' },
  { id: 90, label: 'Dutch KNVB Beker', name: 'KNVB Beker', country: 'Netherlands', tier: 1 },

  // Additional established leagues with supported odds and kickoff schedules suited to Lagos hours
  { id: 218, label: 'Austrian Bundesliga', name: 'Bundesliga', country: 'Austria', tier: 2, oddsApi: 'soccer_austria_bundesliga' },
  { id: 179, label: 'Scottish Premiership', name: 'Premiership', country: 'Scotland', tier: 2, oddsApi: 'soccer_spl' },
  { id: 203, label: 'Turkish Süper Lig', name: 'Süper Lig', country: 'Turkey', tier: 2, oddsApi: 'soccer_turkey_super_league' },
  { id: 307, label: 'Saudi Pro League', name: 'Pro League', country: 'Saudi-Arabia', tier: 2, oddsApi: 'soccer_saudi_arabia_pro_league' },
  { id: 197, label: 'Greek Super League', name: 'Super League 1', country: 'Greece', tier: 2, oddsApi: 'soccer_greece_super_league' },
  { id: 106, label: 'Polish Ekstraklasa', name: 'Ekstraklasa', country: 'Poland', tier: 2, oddsApi: 'soccer_poland_ekstraklasa' },
  { id: 119, label: 'Danish Superliga', name: 'Superliga', country: 'Denmark', tier: 2, oddsApi: 'soccer_denmark_superliga' },
  { id: 207, label: 'Swiss Super League', name: 'Super League', country: 'Switzerland', tier: 2, oddsApi: 'soccer_switzerland_superleague' },
  { id: 235, label: 'Russian Premier League', name: 'Premier League', country: 'Russia', tier: 2, oddsApi: 'soccer_russia_premier_league' },

  // Selected, well-followed European second tiers
  { id: 40, label: 'English Championship', name: 'Championship', country: 'England', tier: 2, oddsApi: 'soccer_efl_champ' },
  { id: 136, label: 'Italian Serie B', name: 'Serie B', country: 'Italy', tier: 2, oddsApi: 'soccer_italy_serie_b' },
  { id: 79, label: 'German 2. Bundesliga', name: '2. Bundesliga', country: 'Germany', tier: 2, oddsApi: 'soccer_germany_bundesliga2' },
  { id: 62, label: 'French Ligue 2', name: 'Ligue 2', country: 'France', tier: 2, oddsApi: 'soccer_france_ligue_two' },
  { id: 141, label: 'Spanish La Liga 2', name: 'Segunda', country: 'Spain', tier: 2, oddsApi: 'soccer_spain_segunda_division' },
  { id: 144, label: 'Belgian Pro League', name: 'Pro League', country: 'Belgium', tier: 2, oddsApi: 'soccer_belgium_first_div' },
  { id: 41, label: 'English League One', name: 'League One', country: 'England', tier: 2, oddsApi: 'soccer_england_league1' },
  { id: 42, label: 'English League Two', name: 'League Two', country: 'England', tier: 2, oddsApi: 'soccer_england_league2' },
]
