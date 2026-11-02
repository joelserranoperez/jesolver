import { existsSync } from "node:fs";
import { Client } from "pg";

/** Crea un cliente de PostgreSQL para los scripts de línea de comandos (migrar / seed). */
export function crearCliente(): Client {
  // Next.js carga .env automáticamente, pero los scripts de Node no: lo hacemos aquí.
  if (existsSync(".env")) process.loadEnvFile(".env");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Falta la variable DATABASE_URL. Copia .env.example a .env y rellénala.");
    process.exit(1);
  }
  return new Client({ connectionString });
}
