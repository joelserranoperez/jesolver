"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function BotonCancelar({ id, descripcion }: { id: number; descripcion: string }) {
  const router = useRouter();
  const [refrescando, startTransition] = useTransition();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelar() {
    if (!window.confirm(`¿Cancelar esta visita?\n\n${descripcion}`)) return;
    setError(null);
    setEnviando(true);
    try {
      const respuesta = await fetch(`/api/visitas/${id}/cancelar`, { method: "POST" });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => ({}));
        setError(cuerpo.mensaje ?? "No se ha podido cancelar la visita.");
        return;
      }
      // Vuelve a pedir al servidor los datos de la página para mostrar el nuevo estado.
      startTransition(() => router.refresh());
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={cancelar}
        disabled={enviando || refrescando}
        className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
      >
        {enviando || refrescando ? "Cancelando…" : "Cancelar"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
