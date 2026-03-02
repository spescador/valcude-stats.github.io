import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'

let _client = null

export function getClient() {
  if (!_client) _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return _client
}

// ================================================================
// LECTURAS
// ================================================================

/** Lista todos los partidos con equipos y competición */
export async function getMatches({ competitionId, teamId } = {}) {
  const sb = getClient()
  let q = sb.from('matches').select(`
    id, jornada, team1_score, team2_score, match_date, source_file,
    team1:team1_id (id, name),
    team2:team2_id (id, name),
    competition:competition_id (id, name, season)
  `).order('jornada', { ascending: true })

  if (competitionId) q = q.eq('competition_id', competitionId)
  if (teamId) q = q.or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)

  const { data, error } = await q
  if (error) throw error
  return data
}

/** Un partido completo con stats de todas las jugadoras */
export async function getMatch(id) {
  const sb = getClient()
  const { data: match, error: e1 } = await sb.from('matches').select(`
    id, jornada, team1_score, team2_score, match_date, source_file,
    team1:team1_id (id, name),
    team2:team2_id (id, name),
    competition:competition_id (id, name, season)
  `).eq('id', id).single()
  if (e1) throw e1

  const { data: stats, error: e2 } = await sb.from('player_stats').select(`
    *, player:player_id (id, name), team:team_id (id, name)
  `).eq('match_id', id).order('points', { ascending: false })
  if (e2) throw e2

  return { match, stats }
}

/** Lista todas las jugadoras */
export async function getPlayers({ teamId } = {}) {
  const sb = getClient()
  let q = sb.from('players').select('id, name, team:team_id (id, name)').order('name')
  if (teamId) q = q.eq('team_id', teamId)
  const { data, error } = await q
  if (error) throw error
  return data
}

/** Datos de una jugadora + todas sus stats */
export async function getPlayerFull(id) {
  const sb = getClient()
  const { data: player, error: e1 } = await sb.from('players')
    .select('id, name, team:team_id (id, name)').eq('id', id).single()
  if (e1) throw e1

  const { data: stats, error: e2 } = await sb.from('player_stats').select(`
    *, match:match_id (
      id, jornada, team1_score, team2_score,
      team1:team1_id (id, name), team2:team2_id (id, name)
    )
  `).eq('player_id', id).order('match_id', { ascending: true })
  if (e2) throw e2

  return { player, stats }
}

/**
 * Tabla de líderes: devuelve jugadoras ordenadas por stat agregada.
 * stat: 'avg_pts' | 'avg_reb' | 'avg_ast' | 'avg_val' | 'per40_pts' | etc.
 */
export async function getLeaderboard({ teamId, competitionId } = {}) {
  const sb = getClient()
  let q = sb.from('player_stats').select(`
    player_id, team_id, minutes, points,
    fg2_made, fg2_attempted, fg3_made, fg3_attempted,
    ft_made, ft_attempted,
    reb_def, reb_off, reb_total,
    assists, steals, turnovers,
    blocks_made, valuation, plus_minus,
    player:player_id (id, name, team:team_id (id, name)),
    match:match_id (competition_id)
  `)

  if (teamId) q = q.eq('team_id', teamId)

  const { data, error } = await q
  if (error) throw error

  // Filtrar por competición si se especifica
  const rows = competitionId
    ? data.filter(r => r.match?.competition_id === competitionId)
    : data

  // Agregar por jugadora
  const byPlayer = {}
  for (const r of rows) {
    const pid = r.player_id
    if (!byPlayer[pid]) {
      byPlayer[pid] = { player: r.player, games: 0, rows: [] }
    }
    byPlayer[pid].games++
    byPlayer[pid].rows.push(r)
  }

  // Calcular promedios
  const { aggregateStats } = await import('./utils.js')
  return Object.values(byPlayer)
    .map(p => ({ player: p.player, games: p.games, ...aggregateStats(p.rows) }))
    .filter(p => p.games > 0)
}

/** Lista de competiciones únicas */
export async function getCompetitions() {
  const sb = getClient()
  const { data, error } = await sb.from('competitions').select('*').order('season', { ascending: false })
  if (error) throw error
  return data
}

/** Lista de equipos */
export async function getTeams() {
  const sb = getClient()
  const { data, error } = await sb.from('teams').select('*').order('name')
  if (error) throw error
  return data
}

// ================================================================
// ESCRITURA (solo usuarios autenticados)
// ================================================================

/** Inserta o actualiza una competición y devuelve su id */
export async function upsertCompetition(name, season, organization) {
  const sb = getClient()
  const { data, error } = await sb.from('competitions')
    .upsert({ name, season, organization }, { onConflict: 'name,season,organization' })
    .select('id').single()
  if (error) throw error
  return data.id
}

/** Inserta o actualiza un equipo y devuelve su id */
export async function upsertTeam(name) {
  const sb = getClient()
  const { data, error } = await sb.from('teams')
    .upsert({ name }, { onConflict: 'name' })
    .select('id').single()
  if (error) throw error
  return data.id
}

/** Inserta o actualiza una jugadora y devuelve su id */
export async function upsertPlayer(name, teamId) {
  const sb = getClient()
  const { data, error } = await sb.from('players')
    .upsert({ name, team_id: teamId }, { onConflict: 'name,team_id' })
    .select('id').single()
  if (error) throw error
  return data.id
}

/** Comprueba si un fichero ya fue importado */
export async function checkMatchExists(sourceFile) {
  const sb = getClient()
  const { data } = await sb.from('matches')
    .select('id').eq('source_file', sourceFile).maybeSingle()
  return !!data
}

/** Importa un partido completo (equipos, jugadoras, stats) */
export async function importMatch(parsed, jornada, matchDate) {
  const sb = getClient()

  const compId = await upsertCompetition(
    parsed.competition, parsed.season, 'FBM'
  )
  const team1Id = await upsertTeam(parsed.team1.name)
  const team2Id = await upsertTeam(parsed.team2.name)

  // Calcular marcadores
  const team1Score = parsed.team1.players.reduce((s, p) => s + p.points, 0)
  const team2Score = parsed.team2.players.reduce((s, p) => s + p.points, 0)

  // Insertar partido
  const { data: match, error: eMatch } = await sb.from('matches').insert({
    competition_id: compId,
    jornada,
    team1_id: team1Id,
    team2_id: team2Id,
    team1_score: team1Score,
    team2_score: team2Score,
    match_date: matchDate || null,
    source_file: parsed.sourceFile,
  }).select('id').single()
  if (eMatch) throw eMatch

  const matchId = match.id

  // Insertar stats por equipo
  for (const [players, teamId] of [
    [parsed.team1.players, team1Id],
    [parsed.team2.players, team2Id],
  ]) {
    for (const p of players) {
      const playerId = await upsertPlayer(p.name, teamId)
      const { error } = await sb.from('player_stats').insert({
        match_id: matchId, player_id: playerId, team_id: teamId,
        jersey_number: p.jersey_number,
        minutes: p.minutes, points: p.points,
        fg2_made: p.fg2_made, fg2_attempted: p.fg2_attempted,
        fg3_made: p.fg3_made, fg3_attempted: p.fg3_attempted,
        ft_made: p.ft_made, ft_attempted: p.ft_attempted,
        reb_def: p.reb_def, reb_off: p.reb_off, reb_total: p.reb_total,
        assists: p.assists, steals: p.steals, turnovers: p.turnovers,
        blocks_made: p.blocks_made, blocks_received: p.blocks_received,
        fouls_committed: p.fouls_committed, fouls_received: p.fouls_received,
        valuation: p.valuation, plus_minus: p.plus_minus,
      })
      if (error) throw error
    }
  }

  return matchId
}
