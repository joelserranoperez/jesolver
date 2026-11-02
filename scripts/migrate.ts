/**
 * Migrador mínimo: aplica en orden los ficheros de db/migrations que aún no se han aplicado.
 * Cada migración se ejecuta en su propia transacción y queda registrada en schema_migrations.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { crearCliente } from "./db-client";

const DIRECTORIO = join(process.cwd(), "db", "migrations");

async function main() {
  const client = crearCliente();
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nombre      text PRIMARY KEY,
        aplicada_en timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query<{ nombre: string }>("SELECT nombre FROM schema_migrations");
    const aplicadas = new Set(rows.map((r) => r.nombre));
    const ficheros = readdirSync(DIRECTORIO).filter((f) => f.endsWith(".sql")).sort();

    let nuevas = 0;
    for (const fichero of ficheros) {
      if (aplicadas.has(fichero)) continue;
      const sql = readFileSync(join(DIRECTORIO, fichero), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (nombre) VALUES ($1)", [fichero]);
        await client.query("COMMIT");
        console.log(`✔ Aplicada ${fichero}`);
        nuevas++;
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Error aplicando ${fichero}: ${(error as Error).message}`);
      }
    }
    console.log(nuevas ? `${nuevas} migración(es) aplicada(s).` : "La base de datos ya está al día.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
