import type { NextRequest } from "next/server";
import { cancelarVisita } from "@/lib/visitas";

/** POST /api/visitas/:id/cancelar → marca la visita como cancelada (no se borra). */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/visitas/[id]/cancelar">) {
  const { id } = await ctx.params;
  const visitaId = Number(id);
  if (!Number.isInteger(visitaId) || visitaId <= 0) {
    return Response.json({ mensaje: "Identificador de visita no válido." }, { status: 400 });
  }

  const resultado = await cancelarVisita(visitaId);
  if (resultado.ok) return Response.json({ ok: true });
  return Response.json({ mensaje: resultado.mensaje }, { status: resultado.status });
}
