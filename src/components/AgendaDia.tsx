import { horaAMinutos, JORNADA_FIN, JORNADA_INICIO, minutosAHora, type VisitaExistente } from "@/lib/reglas";

const DURACION_JORNADA = JORNADA_FIN - JORNADA_INICIO;
const HORAS = Array.from({ length: DURACION_JORNADA / 60 + 1 }, (_, i) => JORNADA_INICIO + i * 60);

/** Posición vertical (en %) de un minuto del día dentro de la jornada, recortada a 0-100. */
const posicion = (minuto: number) =>
  Math.min(100, Math.max(0, ((minuto - JORNADA_INICIO) / DURACION_JORNADA) * 100));

interface Props {
  visitas: VisitaExistente[];
  nueva: { horaInicio: string; duracionMin: number; valida: boolean } | null;
}

/** Vista de la jornada 08:00-17:00 con las visitas del técnico y la visita que se quiere programar. */
export function AgendaDia({ visitas, nueva }: Props) {
  return (
    <div className="relative ml-12 h-96 border-l border-slate-200" aria-label="Agenda de la jornada">
      {HORAS.map((h) => (
        <div key={h} className="absolute right-0 left-0 border-t border-dashed border-slate-200" style={{ top: `${posicion(h)}%` }}>
          <span className="absolute -top-2 -left-12 text-xs text-slate-400">{minutosAHora(h)}</span>
        </div>
      ))}

      {visitas.map((v) => {
        const inicio = horaAMinutos(v.horaInicio);
        const fin = inicio + v.duracionMin;
        return (
          <div
            key={v.id}
            className="absolute right-[38%] left-1 overflow-hidden rounded border border-blue-300 bg-blue-100 px-2 text-xs text-blue-900"
            style={{ top: `${posicion(inicio)}%`, height: `${posicion(fin) - posicion(inicio)}%` }}
            title={`${v.horaInicio}-${minutosAHora(fin)} ${v.obraNombre}`}
          >
            {v.horaInicio}-{minutosAHora(fin)} · {v.obraNombre}
          </div>
        );
      })}

      {nueva && <BloqueNueva {...nueva} />}

      {visitas.length === 0 && (
        <p className="absolute top-2 left-2 text-sm text-slate-500">Sin visitas programadas este día.</p>
      )}
    </div>
  );
}

function BloqueNueva({ horaInicio, duracionMin, valida }: NonNullable<Props["nueva"]>) {
  const inicio = horaAMinutos(horaInicio);
  const fin = inicio + duracionMin;
  const alto = Math.max(posicion(fin) - posicion(inicio), 2);
  return (
    <div
      className={`absolute right-1 left-[64%] overflow-hidden rounded border-2 border-dashed px-2 text-xs ${
        valida ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800"
      }`}
      style={{ top: `${Math.min(posicion(inicio), 98)}%`, height: `${alto}%` }}
    >
      Nueva {horaInicio}-{minutosAHora(fin % (24 * 60))}
    </div>
  );
}
