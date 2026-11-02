import { z } from "zod";

/** Comprueba que "YYYY-MM-DD" es una fecha que existe (rechaza 2026-02-30). */
function esFechaReal(valor: string): boolean {
  const [a, m, d] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d;
}

export const esquemaFecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato AAAA-MM-DD.")
  .refine(esFechaReal, "La fecha no existe.");

/**
 * Validación de formato de los datos de una visita. Se ejecuta en el servidor:
 * nunca se confía en lo que envía el navegador. Las reglas de negocio (solapes,
 * desplazamiento, jornada) se comprueban después, en src/lib/reglas.ts.
 */
export const esquemaNuevaVisita = z.object({
  obraId: z.coerce.number({ error: "Selecciona una obra." }).int().positive("Selecciona una obra."),
  tecnicoId: z.coerce.number({ error: "Selecciona un técnico." }).int().positive("Selecciona un técnico."),
  fecha: esquemaFecha,
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora de inicio debe tener el formato HH:MM."),
  duracionMin: z.coerce
    .number({ error: "La duración debe ser un número de minutos." })
    .int("La duración debe ser un número entero de minutos.")
    .positive("La duración debe ser mayor que 0.")
    .max(24 * 60, "La duración no puede superar un día."),
});

export type NuevaVisita = z.infer<typeof esquemaNuevaVisita>;

export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

export function erroresDeZod(error: z.ZodError): ErrorCampo[] {
  return error.issues.map((issue) => ({ campo: issue.path.join("."), mensaje: issue.message }));
}
