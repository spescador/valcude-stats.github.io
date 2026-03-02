// ================================================================
// Parser de Excel (FBM format)
// Usa SheetJS (XLSX) para leer el fichero en el navegador
// ================================================================

/** Convierte "MM:SS" o número Excel (fracción de día) a minutos decimales */
function parseMinutes(val) {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') {
    // Valor interno de Excel: fracción de 24h → convertir a minutos
    return val * 1440
  }
  const str = String(val).trim()
  const m = str.match(/^(\d+):(\d{2})$/)
  if (m) return parseInt(m[1]) + parseInt(m[2]) / 60
  return parseFloat(str) || 0
}

/** Convierte "4/7" → { made: 4, attempted: 7 } */
function parseFraction(val) {
  if (val === null || val === undefined || val === '') return { made: 0, attempted: 0 }
  const str = String(val).trim()
  if (str.includes('/')) {
    const [a, b] = str.split('/').map(s => parseInt(s.trim()) || 0)
    return { made: a, attempted: b }
  }
  const n = parseInt(str) || 0
  return { made: 0, attempted: n }
}

/** Convierte una fila de jugadora a objeto */
function parsePlayerRow(row) {
  const name = row[1] ? String(row[1]).trim() : null
  if (!name) return null

  const fg2 = parseFraction(row[4])
  const fg3 = parseFraction(row[6])
  const ft  = parseFraction(row[8])

  return {
    jersey_number:    row[0] != null ? String(row[0]).trim() : null,
    name,
    minutes:          parseMinutes(row[2]),
    points:           Number(row[3])  || 0,
    fg2_made:         fg2.made,
    fg2_attempted:    fg2.attempted,
    fg3_made:         fg3.made,
    fg3_attempted:    fg3.attempted,
    ft_made:          ft.made,
    ft_attempted:     ft.attempted,
    reb_def:          Number(row[10]) || 0,
    reb_off:          Number(row[11]) || 0,
    reb_total:        Number(row[12]) || 0,
    assists:          Number(row[13]) || 0,
    steals:           Number(row[14]) || 0,
    turnovers:        Number(row[15]) || 0,
    blocks_made:      Number(row[16]) || 0,
    blocks_received:  Number(row[17]) || 0,
    fouls_committed:  Number(row[18]) || 0,
    fouls_received:   Number(row[19]) || 0,
    valuation:        Number(row[20]) || 0,
    plus_minus:       Number(row[21]) || 0,
  }
}

/**
 * Parsea el nombre del fichero para extraer jornada y rival.
 * "1. Valcude B.xlsx" → { jornada: 1, rival: "Valcude B" }
 */
export function parseFilename(filename) {
  const m = filename.match(/^(\d+)\.\s*(.+)\.xlsx$/i)
  if (m) return { jornada: parseInt(m[1]), rival: m[2].trim() }
  return { jornada: null, rival: filename }
}

/**
 * Parsea el título del partido:
 * "Estadísticas - TEAM1 vs TEAM2 - CadFem1ºaño - COMPETICIONES FEDERADAS FBM - 25/26"
 */
function parseMatchTitle(title) {
  const parts = title.split(' - ').map(s => s.trim())
  return {
    competition: parts[2] || null,   // "CadFem1ºaño"
    organization: parts[3] || null,  // "COMPETICIONES FEDERADAS FBM"
    season: parts[4] || null,        // "25/26"
  }
}

/**
 * Punto de entrada principal.
 * Recibe un workbook de SheetJS y el nombre del fichero.
 * Devuelve el objeto parsed listo para importMatch().
 */
export function parseWorkbook(workbook, filename) {
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })

  const TOTALES = 'TOTALES'
  const NOMBRE  = 'Nombre'

  let matchInfo = {}
  const headerRows  = []
  const totalesRows = []
  const teamNameRows = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    // Título del partido
    const rowText = row.filter(Boolean).join(' ')
    if (rowText.includes('Estadísticas') || rowText.includes('Estadisticas')) {
      matchInfo = parseMatchTitle(rowText)
    }

    // Fila de cabecera de columnas
    if (row[1] === NOMBRE) headerRows.push(i)

    // Fila de totales
    if (row[1] === TOTALES) totalesRows.push(i)

    // Nombre de equipo: col A rellena, B y C vacías
    if (row[0] && !row[1] && !row[2]) {
      const val = String(row[0]).trim()
      if (
        val.length > 3 &&
        !val.includes('FEDERACIÓN') &&
        !val.includes('Estadística') &&
        !val.includes('APP')
      ) {
        teamNameRows.push({ idx: i, name: val })
      }
    }
  }

  // Extraer jugadoras de cada equipo
  function extractPlayers(headerIdx, totalesIdx) {
    const players = []
    for (let i = headerIdx + 1; i < totalesIdx; i++) {
      const row = rows[i]
      if (!row || !row[1] || row[1] === TOTALES) continue
      const p = parsePlayerRow(row)
      if (p && p.name) players.push(p)
    }
    return players
  }

  const team1Players = (headerRows[0] != null && totalesRows[0] != null)
    ? extractPlayers(headerRows[0], totalesRows[0]) : []
  const team2Players = (headerRows[1] != null && totalesRows[1] != null)
    ? extractPlayers(headerRows[1], totalesRows[1]) : []

  const { jornada } = parseFilename(filename)

  return {
    sourceFile:  filename,
    jornada,
    competition: matchInfo.competition  || 'Desconocida',
    season:      matchInfo.season       || '??/??',
    organization: matchInfo.organization || 'FBM',
    team1: { name: teamNameRows[0]?.name || 'Equipo 1', players: team1Players },
    team2: { name: teamNameRows[1]?.name || 'Equipo 2', players: team2Players },
  }
}
