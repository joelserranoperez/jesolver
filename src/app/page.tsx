import Link from "next/link";
import { Suspense } from "react";
import { BotonCancelar } from "@/components/BotonCancelar";
import { formatearFecha } from "@/lib/formato";
import { esquemaFiltros, type Filtros } from "@/lib/validacion";
import { listarTecnicos, listarVisitas, type Tecnico } from "@/lib/visitas";

export default function PaginaVisitas({ searchParams }: PageProps<"/">) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Visitas</h1>
        <Link href="/visitas/nueva" className="boton">
          + Programar visita
        </Link>
      </div>
      {/* Los datos se leen en cada petición: el resto de la página se sirve al instante. */}
      <Suspense fallback={<p className="text-sm text-slate-500">Cargando visitas…</p>}>
        <ListadoVisitas searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ListadoVisitas({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const parseo = esquemaFiltros.safeParse(params);
  const filtros: Filtros = parseo.success ? parseo.data : {};
  const creada = Number(params.creada) || null;

  const [tecnicos, visitas] = await Promise.all([listarTecnicos(), listarVisitas(filtros)]);

  return (
    <>
      {creada && (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          Visita programada correctamente.
        </p>
      )}
      {!parseo.success && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Algún filtro no era válido y se ha ignorado.
        </p>
      )}

      <FormularioFiltros tecnicos={tecnicos} filtros={filtros} />

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs tracking-wide text-slate-600 uppercase">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Hora</th>
              <th className="px-3 py-2">Técnico</th>
              <th className="px-3 py-2">Obra</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visitas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  No hay visitas con estos filtros.
                </td>
              </tr>
            )}
            {visitas.map((v) => {
              const cancelada = v.estado === "cancelada";
              return (
                <tr
                  key={v.id}
                  className={`border-t border-slate-100 ${cancelada ? "text-slate-400" : ""} ${v.id === creada ? "bg-green-50" : ""}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">{formatearFecha(v.fecha)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {v.horaInicio}–{v.horaFin} <span className="text-xs text-slate-400">({v.duracionMin} min)</span>
                  </td>
                  <td className="px-3 py-2">{v.tecnicoNombre}</td>
                  <td className="px-3 py-2">
                    {v.obraNombre}
                    <span className="block text-xs text-slate-400">{v.municipio}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        cancelada ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {cancelada ? "Cancelada" : "Programada"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!cancelada && (
                      <BotonCancelar
                        id={v.id}
                        descripcion={`${formatearFecha(v.fecha)} ${v.horaInicio} · ${v.tecnicoNombre} · ${v.obraNombre}`}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">{visitas.length} visita(s), ordenadas por fecha y hora.</p>
    </>
  );
}

/** Formulario GET normal: los filtros quedan en la URL (se pueden compartir) y funciona sin JavaScript. */
function FormularioFiltros({ tecnicos, filtros }: { tecnicos: Tecnico[]; filtros: Filtros }) {
  return (
    <form className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-3">
      <div>
        <label htmlFor="f-tecnico" className="etiqueta">Técnico</label>
        <select id="f-tecnico" name="tecnicoId" defaultValue={filtros.tecnicoId ?? ""} className="campo">
          <option value="">Todos</option>
          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-fecha" className="etiqueta">Fecha</label>
        <input id="f-fecha" type="date" name="fecha" defaultValue={filtros.fecha ?? ""} className="campo" />
      </div>
      <div>
        <label htmlFor="f-estado" className="etiqueta">Estado</label>
        <select id="f-estado" name="estado" defaultValue={filtros.estado ?? ""} className="campo">
          <option value="">Todos</option>
          <option value="programada">Programada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>
      <button type="submit" className="boton">Filtrar</button>
      <Link href="/" className="boton-secundario">Quitar filtros</Link>
    </form>
  );
}
