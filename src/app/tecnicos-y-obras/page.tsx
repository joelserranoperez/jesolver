import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { listarObras, listarTecnicos } from "@/lib/visitas";

export default function PaginaTecnicosYObras() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Técnicos y obras</h1>
      <Suspense fallback={<p className="text-sm text-slate-500">Cargando…</p>}>
        <Tablas />
      </Suspense>
    </>
  );
}

async function Tablas() {
  await connection();
  const [tecnicos, obras] = await Promise.all([listarTecnicos(), listarObras()]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="mb-2 font-semibold">Técnicos ({tecnicos.length})</h2>
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {tecnicos.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                {t.nombre}
                <span className="block text-xs text-slate-500">{t.email} · {t.telefono}</span>
              </span>
              <Link href={`/?tecnicoId=${t.id}`} className="text-blue-700 hover:underline">Ver visitas</Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Obras ({obras.length})</h2>
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {obras.map((o) => (
            <li key={o.id} className="px-3 py-2 text-sm">
              {o.nombre}
              <span className="block text-xs text-slate-500">{o.direccion} · {o.municipio}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
