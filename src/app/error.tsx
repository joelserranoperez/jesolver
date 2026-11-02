"use client"; // Los error boundaries deben ser Client Components

import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
      <h2 className="font-semibold">Algo ha fallado</h2>
      <p className="mt-1 text-sm">
        No se han podido cargar los datos. Comprueba que la base de datos está en marcha y que DATABASE_URL es correcta.
      </p>
      <button onClick={() => retry()} className="boton mt-3">
        Reintentar
      </button>
    </div>
  );
}
