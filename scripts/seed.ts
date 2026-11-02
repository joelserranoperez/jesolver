/** Carga los datos de ejemplo de db/seed.sql (borra los datos existentes). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { crearCliente } from "./db-client";

async function main() {
  const client = crearCliente();
  await client.connect();
  try {
    await client.query(readFileSync(join(process.cwd(), "db", "seed.sql"), "utf8"));
    const { rows } = await client.query(`
      SELECT (SELECT count(*) FROM tecnicos) AS tecnicos,
             (SELECT count(*) FROM obras)    AS obras,
             (SELECT count(*) FROM visitas)  AS visitas`);
    console.log("✔ Datos de ejemplo cargados:", rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
