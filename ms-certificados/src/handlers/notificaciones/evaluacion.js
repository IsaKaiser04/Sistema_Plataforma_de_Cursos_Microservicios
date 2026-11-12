const {
  exigirUuid,
  uuidOpcional,
  exigirNota,
  textoOpcional,
} = require("../../lib/validacion");
const { notificar, nombreCurso, inscritosDe } = require("../../lib/notificar");

const dos = (n) => String(n).padStart(2, "0");

// Acepta "2026-11-25T23:59:00" o la lista que envía Jackson sin configurar
// ([2026, 11, 25, 23, 59, 0]). Devuelve "2026-11-25 23:59" o null.
function formatearFecha(valor) {
  if (Array.isArray(valor)) {
    const [a, m, d, h = 0, min = 0] = valor;
    if (![a, m, d, h, min].every(Number.isInteger)) return null;
    return `${a}-${dos(m)}-${dos(d)} ${dos(h)}:${dos(min)}`;
  }
  if (typeof valor !== "string" || Number.isNaN(new Date(valor).getTime())) return null;
  return valor.replace("T", " ").slice(0, 16);
}

// evaluacion.publicada: aviso a todos los inscritos del curso
async function onEvaluacionPublicada(db, e) {
  const cursoId = exigirUuid(e.cursoId, "cursoId");
  const evaluacionId = uuidOpcional(e.evaluacionId);

  const titulo = textoOpcional(e.tituloEvaluacion) || "una nueva evaluación";
  const curso = await nombreCurso(db, cursoId, textoOpcional(e.tituloCurso));
  const cierre = formatearFecha(e.fechaCierre);
  const n = await notificar(db, {
    eventoId: uuidOpcional(e.eventoId) || evaluacionId,
    estudianteIds: await inscritosDe(db, cursoId),
    cursoId,
    tipo: "EVALUACION_NUEVA",
    mensaje:
      `Se publicó "${titulo}" en el curso "${curso}".` + (cierre ? ` Cierra el ${cierre}.` : ""),
  });
  return `${n} notificación(es) a inscritos`;
}

// evaluacion.calificada: aviso al estudiante con su nota
async function onEvaluacionCalificada(db, e) {
  const estudianteId = exigirUuid(e.estudianteId, "estudianteId");
  const nota = exigirNota(e.nota, "nota");
  const cursoId = uuidOpcional(e.cursoId);

  const curso = await nombreCurso(db, cursoId, textoOpcional(e.tituloCurso));
  const evaluacion = textoOpcional(e.tituloEvaluacion);
  const n = await notificar(db, {
    eventoId: uuidOpcional(e.eventoId),
    estudianteIds: [estudianteId],
    cursoId,
    tipo: "NOTA",
    mensaje: `Tu evaluación ${evaluacion ? `"${evaluacion}" ` : ""}del curso "${curso}" fue calificada: ${nota}`,
  });
  return `${n} notificación(es)`;
}

module.exports = { onEvaluacionPublicada, onEvaluacionCalificada, formatearFecha };
