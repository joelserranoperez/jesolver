"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AgendaDia } from "@/components/AgendaDia";
import { comprobarReglas, NOMBRE_REGLA, type Incumplimiento, type VisitaExistente } from "@/lib/reglas";
import type { ErrorCampo } from "@/lib/validacion";
import type { Obra, Tecnico } from "@/lib/visitas";

interface Props {
  tecnicos: Tecnico[];
  obras: Obra[];
  fechaInicial: string;
}

type EstadoAgenda = { clave: string; visitas: VisitaExistente[] } | { clave: string; error: true };

export function FormularioVisita({ tecnicos, obras, fechaInicial }: Props) {
  const router = useRouter();
  const [tecnicoId, setTecnicoId] = useState("");
  const [obraId, setObraId] = useState("");
  const [fecha, setFecha] = useState(fechaInicial);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [duracionMin, setDuracionMin] = useState("60");

  const [enviando, setEnviando] = useState(false);
  const [erroresCampo, setErroresCampo] = useState<ErrorCampo[]>([]);
  const [erroresReglas, setErroresReglas] = useState<Incumplimiento[]>([]);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  // Agenda del técnico ese día (solo visitas programadas), para mostrarla y avisar antes de enviar.
  const claveAgenda = tecnicoId && fecha ? `${tecnicoId}|${fecha}` : "";
  const [agenda, setAgenda] = useState<EstadoAgenda | null>(null);
  useEffect(() => {
    if (!claveAgenda) return;
    const control = new AbortController();
    const [tec, dia] = claveAgenda.split("|");
    fetch(`/api/visitas?tecnicoId=${tec}&fecha=${dia}&estado=programada`, { signal: control.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((cuerpo: { visitas: VisitaExistente[] }) => setAgenda({ clave: claveAgenda, visitas: cuerpo.visitas }))
      .catch(() => {
        if (!control.signal.aborted) setAgenda({ clave: claveAgenda, error: true });
      });
    return () => control.abort();
  }, [claveAgenda]);

  const agendaActual = agenda && agenda.clave === claveAgenda ? agenda : null;
  const visitasDelDia = agendaActual && "visitas" in agendaActual ? agendaActual.visitas : null;

  // Aviso en tiempo real con la MISMA función de reglas que usa el servidor.
  // Es solo una ayuda: quien decide si se guarda es siempre el servidor.
  const duracion = Number(duracionMin);
  const datosCompletos = obraId !== "" && /^\d{2}:\d{2}$/.test(horaInicio) && Number.isInteger(duracion) && duracion > 0;
  const avisos = useMemo(
    () =>
      visitasDelDia && datosCompletos
        ? comprobarReglas({ obraId: Number(obraId), horaInicio, duracionMin: duracion }, visitasDelDia)
        : [],
    [visitasDelDia, datosCompletos, obraId, horaInicio, duracion],
  );

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErroresCampo([]);
    setErroresReglas([]);
    setErrorGeneral(null);
    try {
      const respuesta = await fetch("/api/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tecnicoId, obraId, fecha, horaInicio, duracionMin }),
      });
      const cuerpo = await respuesta.json();
      if (respuesta.status === 201) {
        router.push(`/?fecha=${fecha}&creada=${cuerpo.id}`);
        return;
      }
      if (cuerpo.tipo === "reglas") setErroresReglas(cuerpo.errores);
      else if (cuerpo.tipo === "datos") setErroresCampo(cuerpo.errores);
      else setErrorGeneral("No se ha podido guardar la visita.");
    } catch {
      setErrorGeneral("Error de conexión. Inténtalo de nuevo.");
    }
    setEnviando(false);
  }

  const errorDe = (campo: string) => erroresCampo.find((e) => e.campo === campo)?.mensaje;
  const tecnicoSeleccionado = tecnicos.find((t) => String(t.id) === tecnicoId);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={enviar} noValidate className="space-y-4 rounded-md border border-slate-200 bg-white p-4">
        <Campo id="obraId" etiqueta="Obra" error={errorDe("obraId")}>
          <select id="obraId" value={obraId} onChange={(e) => setObraId(e.target.value)} className="campo" required>
            <option value="">Selecciona una obra…</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>{o.nombre} ({o.municipio})</option>
            ))}
          </select>
        </Campo>

        <Campo id="tecnicoId" etiqueta="Técnico" error={errorDe("tecnicoId")}>
          <select id="tecnicoId" value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className="campo" required>
            <option value="">Selecciona un técnico…</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </Campo>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo id="fecha" etiqueta="Fecha" error={errorDe("fecha")}>
            <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="campo" required />
          </Campo>
          <Campo id="horaInicio" etiqueta="Hora de inicio" error={errorDe("horaInicio")}>
            <input id="horaInicio" type="time" step={300} value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="campo" required />
          </Campo>
          <Campo id="duracionMin" etiqueta="Duración (min)" error={errorDe("duracionMin")}>
            <input id="duracionMin" type="number" min={5} step={5} value={duracionMin} onChange={(e) => setDuracionMin(e.target.value)} className="campo" required />
          </Campo>
        </div>

        {erroresReglas.length > 0 && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-semibold">No se puede guardar la visita porque no cumple estas reglas:</p>
            <ul className="mt-2 space-y-1">
              {erroresReglas.map((e, i) => (
                <li key={i}>
                  <strong>Regla {NOMBRE_REGLA[e.regla]}:</strong> {e.mensaje}
                </li>
              ))}
            </ul>
          </div>
        )}
        {erroresCampo.some((e) => !["obraId", "tecnicoId", "fecha", "horaInicio", "duracionMin"].includes(e.campo)) && (
          <p role="alert" className="text-sm text-red-700">
            {erroresCampo.map((e) => e.mensaje).join(" ")}
          </p>
        )}
        {errorGeneral && <p role="alert" className="text-sm text-red-700">{errorGeneral}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={enviando} className="boton">
            {enviando ? "Guardando…" : "Programar visita"}
          </button>
          <button type="button" onClick={() => router.push("/")} className="boton-secundario">
            Volver
          </button>
        </div>
      </form>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="mb-1 font-semibold">Agenda del técnico</h2>
        {!claveAgenda && <p className="text-sm text-slate-500">Selecciona técnico y fecha para ver sus visitas de ese día.</p>}
        {claveAgenda && !agendaActual && <p className="text-sm text-slate-500">Cargando agenda…</p>}
        {agendaActual && "error" in agendaActual && (
          <p className="text-sm text-red-700">No se ha podido cargar la agenda.</p>
        )}
        {visitasDelDia && (
          <>
            <p className="mb-3 text-sm text-slate-500">{tecnicoSeleccionado?.nombre}</p>
            <AgendaDia
              visitas={visitasDelDia}
              nueva={datosCompletos ? { horaInicio, duracionMin: duracion, valida: avisos.length === 0 } : null}
            />
            {datosCompletos && avisos.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Con estos datos la visita no se podrá guardar:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {avisos.map((a, i) => (
                    <li key={i}>{a.mensaje}</li>
                  ))}
                </ul>
              </div>
            )}
            {datosCompletos && avisos.length === 0 && (
              <p className="mt-3 text-sm text-green-700">✓ El hueco está libre y cumple las reglas.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Campo({ id, etiqueta, error, children }: { id: string; etiqueta: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="etiqueta">{etiqueta}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
