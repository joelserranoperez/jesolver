const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** "2026-11-03" → "mar 03/11/2026". Se calcula sin zona horaria para no desplazar el día. */
export function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const diaSemana = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  return `${diaSemana} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;
}

/** Fecha de hoy en Barcelona como "YYYY-MM-DD", independientemente de la zona horaria del servidor. */
export function hoyEnMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}
