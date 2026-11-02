import "server-only";
import { Pool, types } from "pg";

// Las columnas DATE se devuelven como texto "YYYY-MM-DD" en lugar de un objeto Date de JS.
// Un Date representa un instante (con zona horaria) y "2026-11-03" podría convertirse en
// el día 2 al formatearlo en un servidor con otra zona horaria (p. ej. UTC en Vercel).
types.setTypeParser(types.builtins.DATE, (valor) => valor);

// En desarrollo Next recarga los módulos en caliente: guardamos el pool en globalThis
// para no abrir un pool nuevo (y agotar conexiones) en cada recarga.
const global = globalThis as unknown as { pool?: Pool };

export function db(): Pool {
  if (!global.pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Falta la variable de entorno DATABASE_URL (ver .env.example).");
    }
    global.pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return global.pool;
}
