import "server-only";
import type { PoolClient } from "pg";
import { db } from "./db";
import { comprobarReglas, NOMBRE_REGLA, type Incumplimiento, type Regla, type VisitaExistente } from "./reglas";
import type { ErrorCampo, NuevaVisita } from "./validacion";

export type EstadoVisita = "programada" | "cancelada";

export interface Tecnico {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
}

export interface Obra {
  id: number;
  nombre: string;
  direccion: string;
  municipio: string;
}

export interface VisitaListado {
  id: number;
  fecha: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  horaFin: string; // HH:MM
  duracionMin: number;
  estado: EstadoVisita;
  tecnicoId: number;
  tecnicoNombre: string;
  obraId: number;
  obraNombre: string;
  municipio: string;
}

export async function listarTecnicos(): Promise<Tecnico[]> {
  const { rows } = await db().query<Tecnico>("SELECT id, nombre, email, telefono FROM tecnicos ORDER BY nombre");
  return rows;
}

export async function listarObras(): Promise<Obra[]> {
  const { rows } = await db().query<Obra>("SELECT id, nombre, direccion, municipio FROM obras ORDER BY municipio, nombre");
  return rows;
}

/** Listado de visitas ordenado por fecha y hora, con filtros opcionales por técnico, fecha y estado. */
export async function listarVisitas(filtros: {
  tecnicoId?: number;
  fecha?: string;
  estado?: EstadoVisita;
}): Promise<VisitaListado[]> {
  const { rows } = await db().query<VisitaListado>(
    `SELECT v.id,
            v.fecha,
            to_char(v.hora_inicio, 'HH24:MI') AS "horaInicio",
            to_char(v.fin, 'HH24:MI')         AS "horaFin",
            v.duracion_min                    AS "duracionMin",
            v.estado,
            t.id     AS "tecnicoId",
            t.nombre AS "tecnicoNombre",
            o.id     AS "obraId",
            o.nombre AS "obraNombre",
            o.municipio
       FROM visitas v
       JOIN tecnicos t ON t.id = v.tecnico_id
       JOIN obras o    ON o.id = v.obra_id
      WHERE ($1::int  IS NULL OR v.tecnico_id = $1)
        AND ($2::date IS NULL OR v.fecha = $2)
        AND ($3::estado_visita IS NULL OR v.estado = $3)
      ORDER BY v.fecha, v.hora_inicio, t.nombre`,
    [filtros.tecnicoId ?? null, filtros.fecha ?? null, filtros.estado ?? null],
  );
  return rows;
}

export type ResultadoCrear =
  | { ok: true; id: number }
  | { ok: false; tipo: "datos"; errores: ErrorCampo[] }
  | { ok: false; tipo: "reglas"; errores: Incumplimiento[] };

/**
 * Programa una visita si cumple las reglas de planificación.
 *
 * 1. Bloquea la fila del técnico (SELECT ... FOR UPDATE) para que dos peticiones simultáneas
 *    para el mismo técnico se ejecuten una detrás de otra y la comprobación sea fiable.
 * 2. Comprueba las reglas en TypeScript para poder explicar qué regla falla y con qué visita.
 * 3. Inserta. Si aun así la base de datos rechaza la fila (restricciones EXCLUDE / CHECK),
 *    se traduce el error a la regla correspondiente.
 */
export async function crearVisita(datos: NuevaVisita): Promise<ResultadoCrear> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");

    const tecnico = await client.query("SELECT id FROM tecnicos WHERE id = $1 FOR UPDATE", [datos.tecnicoId]);
    const obra = await client.query("SELECT id FROM obras WHERE id = $1", [datos.obraId]);
    const erroresDatos: ErrorCampo[] = [];
    if (tecnico.rowCount === 0) erroresDatos.push({ campo: "tecnicoId", mensaje: "El técnico no existe." });
    if (obra.rowCount === 0) erroresDatos.push({ campo: "obraId", mensaje: "La obra no existe." });
    if (erroresDatos.length) {
      await client.query("ROLLBACK");
      return { ok: false, tipo: "datos", errores: erroresDatos };
    }

    const otras = await visitasProgramadasDelDia(client, datos.tecnicoId, datos.fecha);
    const incumplimientos = comprobarReglas(datos, otras);
    if (incumplimientos.length) {
      await client.query("ROLLBACK");
      return { ok: false, tipo: "reglas", errores: incumplimientos };
    }

    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO visitas (obra_id, tecnico_id, fecha, hora_inicio, duracion_min)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [datos.obraId, datos.tecnicoId, datos.fecha, datos.horaInicio, datos.duracionMin],
    );
    await client.query("COMMIT");
    return { ok: true, id: rows[0].id };
  } catch (error) {
    await client.query("ROLLBACK");
    const regla = reglaDeRestriccion(error);
    if (regla) {
      return { ok: false, tipo: "reglas", errores: [{ regla, mensaje: `No cumple la regla ${NOMBRE_REGLA[regla]}.` }] };
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Visitas programadas (no canceladas) de un técnico en un día, para la vista de agenda. */
export async function agendaDelDia(tecnicoId: number, fecha: string): Promise<VisitaExistente[]> {
  const client = await db().connect();
  try {
    return await visitasProgramadasDelDia(client, tecnicoId, fecha);
  } finally {
    client.release();
  }
}

async function visitasProgramadasDelDia(client: PoolClient, tecnicoId: number, fecha: string) {
  const { rows } = await client.query<VisitaExistente>(
    `SELECT v.id,
            v.obra_id                         AS "obraId",
            o.nombre                          AS "obraNombre",
            to_char(v.hora_inicio, 'HH24:MI') AS "horaInicio",
            v.duracion_min                    AS "duracionMin"
       FROM visitas v
       JOIN obras o ON o.id = v.obra_id
      WHERE v.tecnico_id = $1 AND v.fecha = $2 AND v.estado = 'programada'
      ORDER BY v.hora_inicio`,
    [tecnicoId, fecha],
  );
  return rows;
}

export type ResultadoCancelar = { ok: true } | { ok: false; status: 404 | 409; mensaje: string };

/** Cancela una visita: deja libre el horario del técnico pero la visita sigue visible. */
export async function cancelarVisita(id: number): Promise<ResultadoCancelar> {
  const { rowCount } = await db().query(
    `UPDATE visitas SET estado = 'cancelada', cancelada_en = now()
      WHERE id = $1 AND estado = 'programada'`,
    [id],
  );
  if (rowCount) return { ok: true };

  const { rows } = await db().query("SELECT estado FROM visitas WHERE id = $1", [id]);
  if (rows.length === 0) return { ok: false, status: 404, mensaje: "La visita no existe." };
  return { ok: false, status: 409, mensaje: "La visita ya estaba cancelada." };
}

/** Traduce una violación de restricción de PostgreSQL a la regla de negocio correspondiente. */
function reglaDeRestriccion(error: unknown): Regla | null {
  const restriccion = (error as { constraint?: string }).constraint;
  switch (restriccion) {
    case "visitas_regla_solape":
      return "SOLAPE";
    case "visitas_regla_desplazamiento":
      return "DESPLAZAMIENTO";
    case "visitas_regla_jornada":
      return "JORNADA";
    default:
      return null;
  }
}
