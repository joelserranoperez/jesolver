import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioVisita } from "@/components/FormularioVisita";
import { hoyEnMadrid } from "@/lib/formato";
import { listarObras, listarTecnicos } from "@/lib/visitas";

export default function PaginaNuevaVisita() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Programar visita</h1>
      <Suspense fallback={<p className="text-sm text-slate-500">Cargando…</p>}>
        <FormularioConDatos />
      </Suspense>
    </>
  );
}

async function FormularioConDatos() {
  await connection(); // datos y "hoy" se calculan en cada petición, no en el build
  const [tecnicos, obras] = await Promise.all([listarTecnicos(), listarObras()]);
  return <FormularioVisita tecnicos={tecnicos} obras={obras} fechaInicial={hoyEnMadrid()} />;
}
