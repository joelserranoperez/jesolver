-- Datos de ejemplo inventados. Se puede ejecutar varias veces: vacía las tablas y las rellena.
-- Las visitas se crean relativas a la fecha actual para que siempre haya datos "de esta semana".

BEGIN;

TRUNCATE visitas, obras, tecnicos RESTART IDENTITY CASCADE;

INSERT INTO tecnicos (nombre, email, telefono) VALUES
  ('Laia Puig Ferrer',      'laia.puig@example.com',      '600 111 001'),
  ('Marc Soler Vidal',      'marc.soler@example.com',     '600 111 002'),
  ('Núria Casals Roca',     'nuria.casals@example.com',   '600 111 003'),
  ('Jordi Martínez Serra',  'jordi.martinez@example.com', '600 111 004');

INSERT INTO obras (nombre, direccion, municipio) VALUES
  ('Edificio plurifamiliar Can Boada',   'Carrer de la Rasa, 112',          'Terrassa'),
  ('Nave logística Can Petit',           'Polígon Can Petit, parcel·la 7',  'Terrassa'),
  ('Rehabilitación Escola Ribatallada',  'Carrer de Sant Pau, 30',          'Sabadell'),
  ('Ampliación CAP Rubí Nord',           'Avinguda de l''Estatut, 15',      'Rubí'),
  ('Puente riera de Gaià',               'Ctra. B-122, km 3',               'Matadepera'),
  ('Viviendas Mirasol',                  'Carrer de Pere Calders, 4',       'Sant Cugat del Vallès'),
  ('Polideportivo municipal',            'Carrer del Pla, 2',               'Viladecavalls'),
  ('Depósito de agua Can Margarit',      'Camí de Can Margarit, s/n',       'Castellbisbal');

-- Visitas de ejemplo. Todas cumplen las reglas (si no, las restricciones de la tabla lo impedirían).
INSERT INTO visitas (obra_id, tecnico_id, fecha, hora_inicio, duracion_min) VALUES
  -- Mañana: Laia hace tres visitas, respetando 30 min de desplazamiento entre obras distintas.
  (1, 1, CURRENT_DATE + 1, '08:00',  90),  -- 08:00-09:30 Terrassa
  (3, 1, CURRENT_DATE + 1, '10:00',  60),  -- 10:00-11:00 Sabadell (30 min de margen)
  (3, 1, CURRENT_DATE + 1, '11:00',  60),  -- 11:00-12:00 misma obra: no necesita desplazamiento
  (4, 1, CURRENT_DATE + 1, '14:00', 120),  -- 14:00-16:00 Rubí
  -- Mañana: Marc
  (2, 2, CURRENT_DATE + 1, '09:00', 120),  -- 09:00-11:00
  (5, 2, CURRENT_DATE + 1, '12:00',  60),  -- 12:00-13:00
  -- Pasado mañana
  (6, 3, CURRENT_DATE + 2, '08:30',  60),
  (7, 3, CURRENT_DATE + 2, '10:00',  90),
  (8, 4, CURRENT_DATE + 2, '15:00', 120),  -- termina justo a las 17:00
  (1, 2, CURRENT_DATE + 2, '11:00',  45),
  -- Dentro de tres días
  (2, 4, CURRENT_DATE + 3, '09:00',  60),
  (4, 1, CURRENT_DATE + 3, '12:30',  90);

-- Una visita cancelada: sigue visible en el listado pero no ocupa el horario.
INSERT INTO visitas (obra_id, tecnico_id, fecha, hora_inicio, duracion_min, estado, cancelada_en) VALUES
  (5, 3, CURRENT_DATE + 2, '12:00', 60, 'cancelada', now());

COMMIT;
