/**
 * Reglas de planificación (requisito 3 del enunciado).
 *
 * Funciones puras, sin acceso a base de datos, para poder testearlas de forma aislada.
 * Las mismas reglas están garantizadas también por restricciones en PostgreSQL
 * (db/migrations/001_esquema_inicial.sql); aquí se calculan para explicar al usuario
 * QUÉ regla falla y con qué visita choca.
 */

export const JORNADA_INICIO = 8 * 60; // 08:00 en minutos desde medianoche
export const JORNADA_FIN = 17 * 60; // 17:00
export const DESPLAZAMIENTO_MINIMO = 30; // minutos entre visitas a obras diferentes

export type Regla = "SOLAPE" | "DESPLAZAMIENTO" | "JORNADA";

export const NOMBRE_REGLA: Record<Regla, string> = {
  SOLAPE: "a) Sin solapes",
  DESPLAZAMIENTO: "b) 30 min de desplazamiento entre obras",
  JORNADA: "c) Dentro de la jornada (08:00-17:00)",
};

export interface Incumplimiento {
  regla: Regla;
  mensaje: string;
}

/** Datos mínimos de la visita que se quiere programar. */
export interface VisitaNueva {
  obraId: number;
  horaInicio: string; // "HH:MM"
  duracionMin: number;
}

/** Otra visita PROGRAMADA del mismo técnico en el mismo día. */
export interface VisitaExistente {
  id: number;
  obraId: number;
  obraNombre: string;
  horaInicio: string; // "HH:MM"
  duracionMin: number;
}

export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Devuelve todas las reglas que incumple la visita nueva (lista vacía = se puede guardar).
 * `otras` deben ser solo las visitas programadas (no canceladas) del mismo técnico ese día:
 * con la jornada 08:00-17:00 no puede haber conflictos entre días distintos.
 */
export function comprobarReglas(nueva: VisitaNueva, otras: VisitaExistente[]): Incumplimiento[] {
  const incumplimientos: Incumplimiento[] = [];
  const inicio = horaAMinutos(nueva.horaInicio);
  const fin = inicio + nueva.duracionMin;

  // Regla c) jornada
  if (inicio < JORNADA_INICIO || fin > JORNADA_FIN) {
    incumplimientos.push({
      regla: "JORNADA",
      mensaje:
        `La visita iría de ${minutosAHora(inicio)} a ${formatearFin(fin)} y debe empezar y terminar ` +
        `dentro de la jornada, de ${minutosAHora(JORNADA_INICIO)} a ${minutosAHora(JORNADA_FIN)}.`,
    });
  }

  const ordenadas = [...otras].sort((a, b) => horaAMinutos(a.horaInicio) - horaAMinutos(b.horaInicio));
  for (const otra of ordenadas) {
    const otraInicio = horaAMinutos(otra.horaInicio);
    const otraFin = otraInicio + otra.duracionMin;
    const franjaOtra = `${otra.obraNombre} (${minutosAHora(otraInicio)}-${minutosAHora(otraFin)})`;

    // Regla a) solape. Intervalos [inicio, fin): acabar a las 10:00 y empezar a las 10:00 no es solape.
    if (inicio < otraFin && otraInicio < fin) {
      incumplimientos.push({
        regla: "SOLAPE",
        mensaje: `El técnico ya tiene una visita que se solapa: ${franjaOtra}.`,
      });
      continue; // si se solapa no tiene sentido hablar además de desplazamiento
    }

    // Regla b) desplazamiento: solo entre obras diferentes.
    if (otra.obraId !== nueva.obraId) {
      const margen = inicio >= otraFin ? inicio - otraFin : otraInicio - fin;
      if (margen < DESPLAZAMIENTO_MINIMO) {
        const orden = inicio >= otraFin ? "la visita anterior" : "la visita siguiente";
        incumplimientos.push({
          regla: "DESPLAZAMIENTO",
          mensaje:
            `Solo hay ${margen} min con ${orden}, ${franjaOtra}, que es en otra obra. ` +
            `Se necesitan al menos ${DESPLAZAMIENTO_MINIMO} min de desplazamiento.`,
        });
      }
    }
  }

  return incumplimientos;
}

/** Igual que minutosAHora pero indica si la visita se pasaría al día siguiente. */
function formatearFin(minutos: number): string {
  return minutos >= 24 * 60 ? `${minutosAHora(minutos % (24 * 60))} del día siguiente` : minutosAHora(minutos);
}
