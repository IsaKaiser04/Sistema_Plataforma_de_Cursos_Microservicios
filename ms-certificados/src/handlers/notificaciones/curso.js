const { exigirUuid, uuidOpcional, textoOpcional } = require("../../lib/validacion");
const { notificar, nombreCurso, inscritosDe } = require("../../lib/notificar");

const MENSAJES_ESTADO = {
  EN_CURSO: { tipo: "CURSO_INICIADO", texto: (c) => `El curso "${c}" ha comenzado. ¡Éxitos!` },
  FINALIZADO: { tipo: "CURSO_FINALIZADO", texto: (c) => `El curso "${c}" ha finalizado.` },
};

// cursos.evento.*: actualiza la copia local y, si cambia a EN_CURSO o FINALIZADO, avisa
async function onEventoCurso(db, e, routingKey) {
  const cursoId = exigirUuid(e.cursoId, "cursoId");

  if (routingKey === "cursos.evento.eliminado") {
    await db.query("DELETE FROM cursos WHERE curso_id = $1", [cursoId]);
    return "curso eliminado de la copia local";
  }

  await db.query(
    `INSERT INTO cursos (curso_id, codigo, titulo, estado) VALUES ($1, $2, $3, $4)
     ON CONFLICT (curso_id) DO UPDATE SET
       codigo = COALESCE(EXCLUDED.codigo, cursos.codigo),
       titulo = COALESCE(EXCLUDED.titulo, cursos.titulo),
       estado = COALESCE(EXCLUDED.estado, cursos.estado),
       actualizado = NOW()`,
    [cursoId, textoOpcional(e.codigoCurso), textoOpcional(e.titulo), textoOpcional(e.estado)]
  );

  const plantilla = routingKey === "cursos.evento.estado" && MENSAJES_ESTADO[e.estado];
  if (!plantilla) return "copia local del curso actualizada";

  const n = await notificar(db, {
    eventoId: uuidOpcional(e.eventoId),
    estudianteIds: await inscritosDe(db, cursoId),
    cursoId,
    tipo: plantilla.tipo,
    mensaje: plantilla.texto(await nombreCurso(db, cursoId, textoOpcional(e.titulo))),
  });
  return `${n} notificación(es) a inscritos`;
}

module.exports = { onEventoCurso };
