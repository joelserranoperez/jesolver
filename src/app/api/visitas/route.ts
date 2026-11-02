import type { NextRequest } from "next/server";
import { erroresDeZod, esquemaFiltros, esquemaNuevaVisita } from "@/lib/validacion";
import { crearVisita, listarVisitas } from "@/lib/visitas";

/** GET /api/visitas?tecnicoId=&fecha=&estado= → listado ordenado por fecha y hora. */
export async function GET(request: NextRequest) {
  const filtros = esquemaFiltros.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!filtros.success) {
    return Response.json({ errores: erroresDeZod(filtros.error) }, { status: 400 });
  }
  return Response.json({ visitas: await listarVisitas(filtros.data) });
}

/**
 * POST /api/visitas → programa una visita.
 *   201 { id }                          creada
 *   400 { tipo: "datos",  errores }     datos con formato incorrecto o inexistentes
 *   422 { tipo: "reglas", errores }     incumple alguna regla de planificación
 */
export async function POST(request: NextRequest) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json(
      { tipo: "datos", errores: [{ campo: "", mensaje: "El cuerpo de la petición debe ser JSON." }] },
      { status: 400 },
    );
  }

  const datos = esquemaNuevaVisita.safeParse(cuerpo);
  if (!datos.success) {
    return Response.json({ tipo: "datos", errores: erroresDeZod(datos.error) }, { status: 400 });
  }

  const resultado = await crearVisita(datos.data);
  if (resultado.ok) return Response.json({ id: resultado.id }, { status: 201 });
  return Response.json(resultado, { status: resultado.tipo === "datos" ? 400 : 422 });
}
