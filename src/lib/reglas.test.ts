import { describe, expect, it } from "vitest";
import { comprobarReglas, type VisitaExistente } from "./reglas";

// Agenda del técnico ese día: obra 1 de 09:00 a 10:00 y obra 2 de 12:00 a 13:00.
const agenda: VisitaExistente[] = [
  { id: 1, obraId: 1, obraNombre: "Obra 1", horaInicio: "09:00", duracionMin: 60 },
  { id: 2, obraId: 2, obraNombre: "Obra 2", horaInicio: "12:00", duracionMin: 60 },
];

const reglas = (horaInicio: string, duracionMin: number, obraId = 3, otras = agenda) =>
  comprobarReglas({ obraId, horaInicio, duracionMin }, otras).map((i) => i.regla);

describe("regla a) solapes", () => {
  it("rechaza una visita que se solapa parcialmente", () => {
    expect(reglas("09:30", 60)).toContain("SOLAPE");
  });

  it("rechaza una visita que contiene completamente a otra", () => {
    expect(reglas("08:30", 120)).toContain("SOLAPE");
  });

  it("rechaza el solape aunque sea en la misma obra", () => {
    expect(reglas("09:30", 15, 1)).toEqual(["SOLAPE"]);
  });

  it("permite visitas consecutivas en la misma obra (acaba 10:00, empieza 10:00)", () => {
    expect(reglas("10:00", 60, 1)).toEqual([]);
  });

  it("sin otras visitas ese día no hay conflicto", () => {
    expect(reglas("09:00", 60, 3, [])).toEqual([]);
  });
});

describe("regla b) 30 minutos de desplazamiento entre obras diferentes", () => {
  it("rechaza empezar 15 min después de otra obra", () => {
    expect(reglas("10:15", 30)).toEqual(["DESPLAZAMIENTO"]);
  });

  it("rechaza terminar 10 min antes de otra obra", () => {
    expect(reglas("11:00", 50)).toEqual(["DESPLAZAMIENTO"]);
  });

  it("acepta exactamente 30 min de margen por ambos lados", () => {
    expect(reglas("10:30", 60)).toEqual([]); // 10:00 -> 10:30 y 11:30 -> 12:00
  });

  it("rechaza 29 min de margen", () => {
    expect(reglas("10:29", 30)).toEqual(["DESPLAZAMIENTO"]);
  });

  it("no exige desplazamiento si la obra es la misma", () => {
    expect(reglas("10:05", 30, 1)).toEqual([]);
  });

  it("detecta los dos lados a la vez", () => {
    expect(reglas("10:10", 100)).toEqual(["DESPLAZAMIENTO", "DESPLAZAMIENTO"]);
  });
});

describe("regla c) jornada de 08:00 a 17:00", () => {
  it("acepta 08:00-17:00 justo", () => {
    expect(reglas("08:00", 540, 3, [])).toEqual([]);
  });

  it("rechaza empezar antes de las 08:00", () => {
    expect(reglas("07:45", 30, 3, [])).toEqual(["JORNADA"]);
  });

  it("rechaza terminar después de las 17:00", () => {
    expect(reglas("16:30", 45, 3, [])).toEqual(["JORNADA"]);
  });

  it("rechaza duraciones que cruzarían la medianoche", () => {
    const [incumplimiento] = comprobarReglas({ obraId: 3, horaInicio: "16:00", duracionMin: 600 }, []);
    expect(incumplimiento.regla).toBe("JORNADA");
    expect(incumplimiento.mensaje).toContain("del día siguiente");
  });
});

describe("varias reglas a la vez", () => {
  it("informa de todas las reglas incumplidas, no solo de la primera", () => {
    expect(reglas("16:45", 60, 3, [
      { id: 9, obraId: 1, obraNombre: "Obra 1", horaInicio: "16:30", duracionMin: 30 },
    ])).toEqual(["JORNADA", "SOLAPE"]);
  });

  it("el mensaje indica con qué visita choca", () => {
    const [incumplimiento] = comprobarReglas({ obraId: 3, horaInicio: "10:15", duracionMin: 30 }, agenda);
    expect(incumplimiento.mensaje).toContain("Obra 1 (09:00-10:00)");
    expect(incumplimiento.mensaje).toContain("15 min");
  });
});
