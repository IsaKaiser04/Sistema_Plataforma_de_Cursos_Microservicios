const { fakeDb } = require("./fakeDb");
const { EventoInvalido } = require("../src/lib/validacion");
const ins = require("../src/handlers/notificaciones/inscripcion");
const { onEventoCurso } = require("../src/handlers/notificaciones/curso");
const ev = require("../src/handlers/notificaciones/evaluacion");
const { onNotaFinalCalculada, codigoVerificacion } = require("../src/handlers/certificados/notaFinal");
const { manejadorPara } = require("../src/handlers");

const CURSO = "11111111-1111-4111-8111-111111111111";
const EST = "22222222-2222-4222-8222-222222222222";
const INS = "33333333-3333-4333-8333-333333333333";
const EVT = "44444444-4444-4444-8444-444444444444";
const E2 = "55555555-5555-4555-8555-555555555555";
const E3 = "66666666-6666-4666-8666-666666666666";

const INSERT_NOTIF = "INSERT INTO notificaciones";

describe("manejadorPara", () => {
  test.each([
    ["inscripcion.creada", ins.onInscripcionCreada],
    ["acceso.habilitado", ins.onAccesoHabilitado],
    ["inscripcion.rechazada", ins.onInscripcionRechazada],
    ["inscripcion.cancelada", ins.onInscripcionCancelada],
    ["cursos.evento.estado", onEventoCurso],
    ["evaluacion.publicada", ev.onEvaluacionPublicada],
    ["evaluacion.calificada", ev.onEvaluacionCalificada],
    ["nota.final.calculada", onNotaFinalCalculada],
  ])("%s tiene manejador", (rk, fn) => expect(manejadorPara(rk)).toBe(fn));

  test("certificado.emitido ya no se maneja", () => {
    expect(manejadorPara("certificado.emitido")).toBeNull();
  });
});

describe("inscripciones", () => {
  test("inscripcion.creada registra al inscrito sin mensaje", async () => {
    const db = fakeDb();
    await ins.onInscripcionCreada(db, { inscripcionId: INS, cursoId: CURSO, estudianteId: EST });
    expect(db.con("INSERT INTO inscritos")).toHaveLength(1);
    expect(db.con(INSERT_NOTIF)).toHaveLength(0);
  });

  test("inscripcion.creada sin UUID válido es inválida", async () => {
    await expect(
      ins.onInscripcionCreada(fakeDb(), { inscripcionId: "x", cursoId: CURSO, estudianteId: EST })
    ).rejects.toBeInstanceOf(EventoInvalido);
  });

  test("acceso.habilitado crea la bienvenida con la inscripción como clave", async () => {
    const db = fakeDb();
    await ins.onAccesoHabilitado(db, {
      eventoId: EVT,
      inscripcionId: INS,
      cursoId: CURSO,
      estudianteId: EST,
      tituloCurso: "Sistemas Distribuidos",
    });
    const [n] = db.con(INSERT_NOTIF);
    expect(n.params[0]).toBe(INS);
    expect(n.params[3]).toBe("INSCRIPCION");
    expect(n.params[4]).toContain("Sistemas Distribuidos");
    expect(db.con("INSERT INTO inscritos")).toHaveLength(1);
  });

  test("inscripcion.rechazada avisa el motivo y quita de inscritos", async () => {
    const db = fakeDb();
    await ins.onInscripcionRechazada(db, {
      eventoId: EVT,
      cursoId: CURSO,
      estudianteId: EST,
      motivo: "CUPO_AGOTADO",
    });
    expect(db.con("DELETE FROM inscritos")).toHaveLength(1);
    const [n] = db.con(INSERT_NOTIF);
    expect(n.params[3]).toBe("INSCRIPCION_RECHAZADA");
    expect(n.params[4]).toContain(ins.MOTIVOS_RECHAZO.CUPO_AGOTADO);
  });

  test("inscripcion.cancelada quita de inscritos sin mensaje", async () => {
    const db = fakeDb();
    await ins.onInscripcionCancelada(db, { cursoId: CURSO, estudianteId: EST });
    expect(db.con("DELETE FROM inscritos")).toHaveLength(1);
    expect(db.con(INSERT_NOTIF)).toHaveLength(0);
  });
});

describe("cursos", () => {
  const inscritos = { "SELECT estudiante_id FROM inscritos": { rows: [{ estudiante_id: EST }] } };

  test("EN_CURSO avisa a los inscritos", async () => {
    const db = fakeDb(inscritos);
    await onEventoCurso(
      db,
      { eventoId: EVT, cursoId: CURSO, titulo: "SD", estado: "EN_CURSO" },
      "cursos.evento.estado"
    );
    const [n] = db.con(INSERT_NOTIF);
    expect(n.params[1]).toEqual([EST]);
    expect(n.params[3]).toBe("CURSO_INICIADO");
  });

  test("cursos.evento.actualizado solo actualiza la copia local", async () => {
    const db = fakeDb(inscritos);
    await onEventoCurso(db, { cursoId: CURSO, titulo: "SD", estado: "EN_CURSO" }, "cursos.evento.actualizado");
    expect(db.con("INSERT INTO cursos")).toHaveLength(1);
    expect(db.con(INSERT_NOTIF)).toHaveLength(0);
  });
});

describe("evaluaciones", () => {
  test("evaluacion.publicada avisa a los tres inscritos con el mismo eventoId", async () => {
    const db = fakeDb({
      "SELECT estudiante_id FROM inscritos": {
        rows: [{ estudiante_id: EST }, { estudiante_id: E2 }, { estudiante_id: E3 }],
      },
    });
    await ev.onEvaluacionPublicada(db, {
      eventoId: EVT,
      cursoId: CURSO,
      tituloEvaluacion: "Examen parcial",
      fechaCierre: "2026-11-25T23:59:00",
    });
    const [n] = db.con(INSERT_NOTIF);
    expect(n.params[0]).toBe(EVT);
    expect(n.params[1]).toEqual([EST, E2, E3]);
    expect(n.params[3]).toBe("EVALUACION_NUEVA");
    expect(n.params[4]).toContain("2026-11-25 23:59");
  });

  test.each([
    ["2026-11-25T23:59:00", "2026-11-25 23:59"],
    [[2026, 11, 25, 23, 59, 0, 123], "2026-11-25 23:59"],
    [[2026, 1, 5], "2026-01-05 00:00"],
    ["no es fecha", null],
    [undefined, null],
  ])("formatearFecha(%p) -> %p", (entrada, esperado) => {
    expect(ev.formatearFecha(entrada)).toBe(esperado);
  });

  test("evaluacion.calificada exige nota", async () => {
    await expect(ev.onEvaluacionCalificada(fakeDb(), { estudianteId: EST })).rejects.toBeInstanceOf(
      EventoInvalido
    );
  });

  test("evaluacion.calificada avisa la nota", async () => {
    const db = fakeDb();
    await ev.onEvaluacionCalificada(db, { eventoId: EVT, estudianteId: EST, nota: 8.5, tituloCurso: "SD" });
    const [n] = db.con(INSERT_NOTIF);
    expect(n.params[3]).toBe("NOTA");
    expect(n.params[4]).toContain("8.5");
  });
});

describe("certificados (nota.final.calculada)", () => {
  const base = {
    eventoId: EVT,
    cursoId: CURSO,
    estudianteId: EST,
    codigoCurso: "SD-2026-01",
    tituloCurso: "Sistemas Distribuidos",
  };

  test("codigoVerificacion quita guiones y rellena el correlativo", () => {
    expect(codigoVerificacion("SD-2026-01", 1)).toBe("LMS-SD202601-0001");
    expect(codigoVerificacion("sd 2026/01", 12)).toBe("LMS-SD202601-0012");
  });

  test("aprobado: emite certificado y notificación CERTIFICADO", async () => {
    const db = fakeDb({
      "SELECT codigo_verificacion FROM certificados": { rows: [], rowCount: 0 },
      "COALESCE(MAX": { rows: [{ n: 1 }] },
    });
    const r = await onNotaFinalCalculada(db, { ...base, notaFinal: 8.0, aprobado: true });
    expect(r).toContain("LMS-SD202601-0001");
    const [cert] = db.con("INSERT INTO certificados");
    expect(cert.params[1]).toBe("LMS-SD202601-0001");
    expect(cert.params[6]).toBe(8);
    expect(db.con("pg_advisory_xact_lock")).toHaveLength(1);
    const [n] = db.con(INSERT_NOTIF);
    expect(n.params[3]).toBe("CERTIFICADO");
    expect(n.params[4]).toContain("/certificados/LMS-SD202601-0001");
  });

  test("duplicado: si ya tiene certificado no emite otro", async () => {
    const db = fakeDb({
      "SELECT codigo_verificacion FROM certificados": {
        rows: [{ codigo_verificacion: "LMS-SD202601-0001" }],
      },
    });
    await onNotaFinalCalculada(db, { ...base, notaFinal: 8.0, aprobado: true });
    expect(db.con("INSERT INTO certificados")).toHaveLength(0);
    expect(db.con(INSERT_NOTIF)).toHaveLength(0);
  });

  test("no aprobado: sin certificado, notificación NOTA_FINAL", async () => {
    const db = fakeDb();
    await onNotaFinalCalculada(db, { ...base, notaFinal: 5.0, aprobado: false, notaMinima: 7 });
    expect(db.con("INSERT INTO certificados")).toHaveLength(0);
    const [n] = db.con(INSERT_NOTIF);
    expect(n.params[3]).toBe("NOTA_FINAL");
    expect(n.params[4]).toContain("5");
  });

  test.each([
    [{ notaFinal: 8 }, "aprobado"],
    [{ aprobado: true }, "notaFinal"],
    [{ notaFinal: 11, aprobado: true }, "notaFinal"],
    [{ notaFinal: 8, aprobado: "si" }, "aprobado"],
  ])("evento %o es inválido (%s)", async (extra, campo) => {
    await expect(onNotaFinalCalculada(fakeDb(), { ...base, ...extra })).rejects.toThrow(campo);
  });

  test("sin codigoCurso usa la copia local del curso", async () => {
    const db = fakeDb({
      "SELECT codigo, titulo FROM cursos": { rows: [{ codigo: "BD-2026-02", titulo: "Bases de Datos" }] },
      "SELECT codigo_verificacion FROM certificados": { rows: [], rowCount: 0 },
      "COALESCE(MAX": { rows: [{ n: 3 }] },
    });
    const r = await onNotaFinalCalculada(db, {
      cursoId: CURSO,
      estudianteId: EST,
      notaFinal: 9,
      aprobado: true,
    });
    expect(r).toContain("LMS-BD202602-0003");
  });
});
