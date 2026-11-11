const { randomUUID } = require("crypto");
const {
  exigirUuid,
  uuidOpcional,
  exigirNota,
  exigirBooleano,
  textoOpcional,
} = require("../../lib/validacion");
const { notificar, recordarCurso } = require("../../lib/notificar");
const { FRONTEND_URL } = require("../../config/env");

// "SD-2026-01" + 1 -> "LMS-SD202601-0001"
function codigoVerificacion(codigoCurso, correlativo) {
  const base = codigoCurso.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 30) || "CURSO";
  return `LMS-${base}-${String(correlativo).padStart(4, "0")}`;
}

const urlCertificado = (codigo) => `${FRONTEND_URL}/certificados/${codigo}`;

// Datos del curso: primero los del evento, si faltan la copia local
async function datosCurso(db, cursoId, e) {
  let codigo = textoOpcional(e.codigoCurso);
  let titulo = textoOpcional(e.tituloCurso);
  if (!codigo || !titulo) {
    const r = await db.query("SELECT codigo, titulo FROM cursos WHERE curso_id = $1", [cursoId]);
    codigo = codigo || r.rows[0]?.codigo || cursoId.slice(0, 8).toUpperCase();
    titulo = titulo || r.rows[0]?.titulo || "Curso";
  }
  return { codigo: codigo.slice(0, 30), titulo: titulo.slice(0, 200) };
}

// nota.final.calculada: certificado si aprobó, aviso de nota si no.
// Corre dentro de la transacción del consumidor: certificado y aviso se guardan juntos.
async function onNotaFinalCalculada(db, e) {
  const cursoId = exigirUuid(e.cursoId, "cursoId");
  const estudianteId = exigirUuid(e.estudianteId, "estudianteId");
  const notaFinal = Math.round(exigirNota(e.notaFinal, "notaFinal") * 10) / 10;
  const aprobado = exigirBooleano(e.aprobado, "aprobado");
  const eventoId = uuidOpcional(e.eventoId);

  const curso = await datosCurso(db, cursoId, e);
  await recordarCurso(db, cursoId, {
    codigo: textoOpcional(e.codigoCurso),
    titulo: textoOpcional(e.tituloCurso),
  });

  if (!aprobado) {
    const n = await notificar(db, {
      eventoId,
      estudianteIds: [estudianteId],
      cursoId,
      tipo: "NOTA_FINAL",
      mensaje: `Tu nota final en el curso "${curso.titulo}" es ${notaFinal}. No alcanzaste la nota mínima para aprobar${
        e.notaMinima != null ? ` (${e.notaMinima})` : ""
      }.`,
    });
    return `no aprobado, ${n} notificación(es) NOTA_FINAL`;
  }

  // Serializa la emisión por curso para que el correlativo no se repita
  await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [cursoId]);

  const existente = await db.query(
    "SELECT codigo_verificacion FROM certificados WHERE curso_id = $1 AND estudiante_id = $2",
    [cursoId, estudianteId]
  );
  if (existente.rowCount > 0) {
    return `certificado ya existía (${existente.rows[0].codigo_verificacion}), sin cambios`;
  }

  const sig = await db.query(
    `SELECT COALESCE(MAX(substring(codigo_verificacion FROM '([0-9]+)$')::int), 0) + 1 AS n
     FROM certificados WHERE curso_id = $1`,
    [cursoId]
  );
  const codigo = codigoVerificacion(curso.codigo, sig.rows[0].n);

  await db.query(
    `INSERT INTO certificados
       (id, codigo_verificacion, curso_id, estudiante_id, codigo_curso, titulo_curso, nota_final)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [randomUUID(), codigo, cursoId, estudianteId, curso.codigo, curso.titulo, notaFinal]
  );

  await notificar(db, {
    eventoId,
    estudianteIds: [estudianteId],
    cursoId,
    tipo: "CERTIFICADO",
    mensaje: `Aprobaste ${curso.titulo} con ${notaFinal}. Verifica tu certificado en ${urlCertificado(codigo)}`,
  });
  return `certificado ${codigo} emitido`;
}

module.exports = { onNotaFinalCalculada, codigoVerificacion, urlCertificado };
