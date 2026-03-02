-- ================================================================
-- Valcude Stats - Esquema de base de datos
-- ================================================================

-- Competiciones (CadFem1ºaño, etc.)
CREATE TABLE IF NOT EXISTS competitions (
  id        BIGSERIAL PRIMARY KEY,
  name      TEXT NOT NULL,         -- "CadFem1ºaño"
  season    TEXT NOT NULL,         -- "25/26"
  organization TEXT,               -- "FBM"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, season, organization)
);

-- Equipos
CREATE TABLE IF NOT EXISTS teams (
  id        BIGSERIAL PRIMARY KEY,
  name      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jugadoras (vinculadas a un equipo)
CREATE TABLE IF NOT EXISTS players (
  id        BIGSERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  team_id   BIGINT REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, team_id)
);

-- Partidos
CREATE TABLE IF NOT EXISTS matches (
  id              BIGSERIAL PRIMARY KEY,
  competition_id  BIGINT REFERENCES competitions(id),
  jornada         INTEGER,
  team1_id        BIGINT REFERENCES teams(id),
  team2_id        BIGINT REFERENCES teams(id),
  team1_score     INTEGER,
  team2_score     INTEGER,
  match_date      DATE,
  source_file     TEXT UNIQUE,   -- nombre del fichero Excel (evita duplicados)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Estadísticas por jugadora por partido
CREATE TABLE IF NOT EXISTS player_stats (
  id                BIGSERIAL PRIMARY KEY,
  match_id          BIGINT REFERENCES matches(id) ON DELETE CASCADE,
  player_id         BIGINT REFERENCES players(id),
  team_id           BIGINT REFERENCES teams(id),
  jersey_number     TEXT,
  -- Tiempo
  minutes           NUMERIC(6,2) DEFAULT 0,
  -- Puntos
  points            INTEGER DEFAULT 0,
  -- Tiros de 2
  fg2_made          INTEGER DEFAULT 0,
  fg2_attempted     INTEGER DEFAULT 0,
  -- Tiros de 3
  fg3_made          INTEGER DEFAULT 0,
  fg3_attempted     INTEGER DEFAULT 0,
  -- Tiros libres
  ft_made           INTEGER DEFAULT 0,
  ft_attempted      INTEGER DEFAULT 0,
  -- Rebotes
  reb_def           INTEGER DEFAULT 0,
  reb_off           INTEGER DEFAULT 0,
  reb_total         INTEGER DEFAULT 0,
  -- Resto
  assists           INTEGER DEFAULT 0,
  steals            INTEGER DEFAULT 0,
  turnovers         INTEGER DEFAULT 0,
  blocks_made       INTEGER DEFAULT 0,
  blocks_received   INTEGER DEFAULT 0,
  fouls_committed   INTEGER DEFAULT 0,
  fouls_received    INTEGER DEFAULT 0,
  valuation         INTEGER DEFAULT 0,
  plus_minus        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

-- ================================================================
-- Row Level Security
-- ================================================================

ALTER TABLE competitions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats  ENABLE ROW LEVEL SECURITY;

-- Lectura pública
CREATE POLICY "read_all" ON competitions  FOR SELECT USING (true);
CREATE POLICY "read_all" ON teams         FOR SELECT USING (true);
CREATE POLICY "read_all" ON players       FOR SELECT USING (true);
CREATE POLICY "read_all" ON matches       FOR SELECT USING (true);
CREATE POLICY "read_all" ON player_stats  FOR SELECT USING (true);

-- Escritura solo para usuarios autenticados
CREATE POLICY "write_auth" ON competitions  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "write_auth" ON teams         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "write_auth" ON players       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "write_auth" ON matches       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "write_auth" ON player_stats  FOR ALL TO authenticated USING (true) WITH CHECK (true);
