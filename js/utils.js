// ================================================================
// Utilidades de formato y cálculo
// ================================================================

/** Convierte minutos decimales a "MM:SS" */
export function formatMinutes(dec) {
  if (!dec || dec === 0) return '0:00'
  const m = Math.floor(dec)
  const s = Math.round((dec - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Stat por minuto */
export function perMin(stat, minutes) {
  if (!minutes || minutes < 1) return null
  return stat / minutes
}

/** Stat proyectado a 40 minutos (mantenido por compatibilidad) */
export function per40(stat, minutes) {
  if (!minutes || minutes < 1) return null
  return (stat / minutes) * 40
}

/** Formatea un número con N decimales, o '—' si es null/undefined */
export function fmt(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return Number(value).toFixed(decimals)
}

/** Formatea porcentaje: made=4, attempted=7 → "57.1%" */
export function fmtPct(made, attempted) {
  if (!attempted) return '—'
  return ((made / attempted) * 100).toFixed(1) + '%'
}

/** Abrevia un nombre: "APELLIDO APELLIDO, Nombre" → "N. Apellido" */
export function shortName(fullName) {
  if (!fullName) return ''
  const [surnames, given = ''] = fullName.split(',')
  const initial = given.trim()[0] || ''
  const surname = surnames.trim().split(' ')[0]
  return initial ? `${initial}. ${surname}` : surname
}

/**
 * Capitaliza correctamente nombres en español.
 * Funciona con letras acentuadas: "GARCíA" → "García"
 * Capitaliza tras espacios, guiones y comas.
 */
export function titleCase(str) {
  if (!str) return ''
  return str.toLowerCase().replace(
    /(^|[\s\-,])([a-z\u00e0-\u00ff])/g,
    (match, sep, char) => sep + char.toUpperCase()
  )
}

/** Añade clase CSS según resultado (W/L) */
export function resultClass(team1Score, team2Score, isTeam1) {
  if (team1Score === null || team2Score === null) return ''
  const won = isTeam1 ? team1Score > team2Score : team2Score > team1Score
  return won ? 'result-win' : 'result-loss'
}

/** Agrega estadísticas de un array de player_stats para un jugador */
export function aggregateStats(rows) {
  if (!rows || rows.length === 0) return null
  const totals = {
    games: rows.length,
    minutes: 0, points: 0,
    fg2_made: 0, fg2_attempted: 0,
    fg3_made: 0, fg3_attempted: 0,
    ft_made: 0, ft_attempted: 0,
    reb_def: 0, reb_off: 0, reb_total: 0,
    assists: 0, steals: 0, turnovers: 0,
    blocks_made: 0, blocks_received: 0,
    fouls_committed: 0, fouls_received: 0,
    valuation: 0, plus_minus: 0,
  }
  for (const r of rows) {
    for (const key of Object.keys(totals)) {
      if (key === 'games') continue
      totals[key] += Number(r[key]) || 0
    }
  }
  const g = totals.games
  const m = totals.minutes
  return {
    ...totals,
    avg_pts:     totals.points    / g,
    avg_min:     m / g,
    avg_val:     totals.valuation / g,
    avg_pm:      totals.plus_minus / g,
    perMin_pts:  perMin(totals.points,    m),
    perMin_val:  perMin(totals.valuation, m),
    fg2_pct: fmtPct(totals.fg2_made, totals.fg2_attempted),
    fg3_pct: fmtPct(totals.fg3_made, totals.fg3_attempted),
    ft_pct:  fmtPct(totals.ft_made,  totals.ft_attempted),
  }
}
