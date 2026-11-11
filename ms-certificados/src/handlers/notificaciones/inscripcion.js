const { exigirUuid, uuidOpcional, textoOpcional } = require("../../lib/validacion");
const { notificar, nombreCurso, recordarCurso } = require("../../lib/notificar");

const ESTADOS_NO_VALIDOS = ["RECHAZADA", "CANCELADA"];

const MOTIVOS_RECHAZO = {
  CUPO_AGOTADO: "el curso ya no tiene cupos disponibles",
  CURSO_NO_DISPONIBLE: "el curso no acepta inscripciones en este momento",
  CURSO_NO_EXISTE: "el curso no existe",
};

async function registrarInscrito(db, cursoId, estudianteId, inscripcionId) {
  await db.query(
    `INSERT INTO inscritos (curso_id, estudiante_id, inscripcion_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (curso_id, estudiante_id)
     DO UPDATE SET inscripcion_id = COALESCE(EXCLUDED.inscripcion_id, inscritos.inscripcion_id)`,
    [cursoId, estudianteId, inscripcionId]
  );
}

async function quitarInscrito(db, cursoId, estudianteId) {
  const r = await db.query("DELETE FROM inscritos WHERE curso_id = $1 AND estudiante_id = $2", [
    cursoId,
    estudianteId,
  ]);
  return r.rowCount;
}

// inscripcion.creada: solo registra al inscrito; la bienvenida llega con acceso.habilitado
async function onInscripcionCreada(db, e) {
  const inscripcionId = exigirUuid(e.inscripcionId, "inscripcionId");
  const cursoId = exigirUuid(e.cursoId, "cursoId");
  const estudianteId = exigirUuid(e.estudianteId, "estudianteId");
  if (ESTADOS_NO_VALIDOS.includes(e.estadoInscripcion)) return "inscripción no válida, ignorada";

  await registrarInscrito(db, cursoId, estudianteId, inscripcionId);
  return "inscrito registrado, sin mensaje";
}

// acceso.habilitado: bienvenida (una sola por inscripción)
async function onAccesoHabilitado(db, e) {
  const inscripcionId = uuidOpcional(e.inscripcionId);
  const cursoId = exigirUuid(e.cursoId, "cursoId");
  const estudianteId = exigirUuid(e.estudianteId, "estudianteId");
  const titulo = textoOpcional(e.tituloCurso);

  await recordarCurso(db, cursoId, { codigo: textoOpcional(e.codigoCurso), titulo });
  await registrarInscrito(db, cursoId, estudianteId, inscripcionId);

  const curso = await nombreCurso(db, cursoId, titulo);
  const n = await notificar(db, {
    // La inscripción identifica la bienvenida: aunque el evento se repita
    // con otro eventoId, el estudiante recibe una sola
    eventoId: inscripcionId || uuidOpcional(e.eventoId),
    estudianteIds: [estudianteId],
    cursoId,
    tipo: "INSCRIPCION",
    mensaje: `Tu acceso al curso "${curso}" está habilitado. ¡Bienvenido!`,
  });
  return `${n} notificación(es) de bienvenida`;
}

// inscripcion.rechazada: aviso con el motivo y sale de inscritos
async function onInscripcionRechazada(db, e) {
  const cursoId = exigirUuid(e.cursoId, "cursoId");
  const estudianteId = exigirUuid(e.estudianteId, "estudianteId");

  const quitados = await quitarInscrito(db, cursoId, estudianteId);
  const curso = await nombreCurso(db, cursoId, textoOpcional(e.tituloCurso));
  const motivo = MOTIVOS_RECHAZO[e.motivo] || "no se pudo completar la inscripción";
  const n = await notificar(db, {
    eventoId: uuidOpcional(e.eventoId),
    estudianteIds: [estudianteId],
    cursoId,
    tipo: "INSCRIPCION_RECHAZADA",
    mensaje: `Tu inscripción al curso "${curso}" fue rechazada: ${motivo}.`,
  });
  return `${n} notificación(es), ${quitados} inscrito(s) quitado(s)`;
}

// inscripcion.cancelada: la canceló el propio estudiante, sin mensaje
async function onInscripcionCancelada(db, e) {
  const cursoId = exigirUuid(e.cursoId, "cursoId");
  const estudianteId = exigirUuid(e.estudianteId, "estudianteId");
  const quitados = await quitarInscrito(db, cursoId, estudianteId);
  return `${quitados} inscrito(s) quitado(s), sin mensaje`;
}

module.exports = {
  onInscripcionCreada,
  onAccesoHabilitado,
  onInscripcionRechazada,
  onInscripcionCancelada,
  MOTIVOS_RECHAZO,
};
