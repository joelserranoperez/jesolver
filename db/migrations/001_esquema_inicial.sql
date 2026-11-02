-- 001 · Esquema inicial del planificador de visitas
--
-- Las reglas de planificación se comprueban en el servidor (src/lib/reglas.ts) para dar
-- mensajes claros al usuario, y se repiten aquí como restricciones de la base de datos:
-- son la última barrera ante peticiones concurrentes o escrituras que no pasen por la API.

-- Necesaria para combinar "=" / "<>" sobre enteros con "&&" sobre rangos en un índice GiST.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE tecnicos (
  id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre    text NOT NULL,
  email     text NOT NULL UNIQUE,
  telefono  text
);

CREATE TABLE obras (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre     text NOT NULL,
  direccion  text NOT NULL,
  municipio  text NOT NULL
);

CREATE TYPE estado_visita AS ENUM ('programada', 'cancelada');

CREATE TABLE visitas (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  obra_id       integer NOT NULL REFERENCES obras (id),
  tecnico_id    integer NOT NULL REFERENCES tecnicos (id),
  -- Hora local (Europe/Madrid). Fecha y hora se guardan sin zona horaria a propósito:
  -- la jornada 08:00-17:00 es una hora "de reloj" y no debe moverse con el servidor.
  fecha         date    NOT NULL,
  hora_inicio   time    NOT NULL,
  duracion_min  integer NOT NULL,
  estado        estado_visita NOT NULL DEFAULT 'programada',
  creada_en     timestamptz NOT NULL DEFAULT now(),
  cancelada_en  timestamptz,

  -- Columnas calculadas: el intervalo real de la visita, usado por las restricciones.
  inicio  timestamp GENERATED ALWAYS AS (fecha + hora_inicio) STORED,
  fin     timestamp GENERATED ALWAYS AS (fecha + hora_inicio + duracion_min * interval '1 minute') STORED,

  CONSTRAINT visitas_duracion_valida CHECK (duracion_min > 0),

  -- Regla c) Empieza y termina dentro de la jornada 08:00-17:00.
  -- Se calcula en minutos para evitar que "time + interval" dé la vuelta a medianoche
  -- (16:00 + 10 h = 02:00, que sería <= 17:00 y pasaría la comprobación).
  CONSTRAINT visitas_regla_jornada CHECK (
    hora_inicio >= time '08:00'
    AND extract(epoch FROM hora_inicio) / 60 + duracion_min <= 17 * 60
  ),

  -- Una visita cancelada siempre tiene fecha de cancelación y viceversa.
  CONSTRAINT visitas_cancelacion_coherente CHECK ((estado = 'cancelada') = (cancelada_en IS NOT NULL)),

  -- Regla a) Un técnico no puede tener dos visitas programadas que se solapen.
  -- tsrange es [inicio, fin): una visita que acaba a las 10:00 y otra que empieza a las 10:00 no se solapan.
  CONSTRAINT visitas_regla_solape EXCLUDE USING gist (
    tecnico_id WITH =,
    tsrange(inicio, fin) WITH &&
  ) WHERE (estado = 'programada'),

  -- Regla b) Entre dos visitas del mismo técnico a obras DIFERENTES hay al menos 30 min.
  -- Alargar cada visita 30 min por el final y exigir que no se solapen equivale a pedir
  -- que la siguiente empiece como pronto 30 min después de que acabe la anterior.
  CONSTRAINT visitas_regla_desplazamiento EXCLUDE USING gist (
    tecnico_id WITH =,
    obra_id WITH <>,
    tsrange(inicio, fin + interval '30 minutes') WITH &&
  ) WHERE (estado = 'programada')
);

-- El listado se ordena por fecha/hora y se filtra por técnico y por fecha.
CREATE INDEX visitas_inicio_idx ON visitas (inicio);
CREATE INDEX visitas_tecnico_fecha_idx ON visitas (tecnico_id, fecha);
