const ins = require("./notificaciones/inscripcion");
const { onEventoCurso } = require("./notificaciones/curso");
const ev = require("./notificaciones/evaluacion");
const { onNotaFinalCalculada } = require("./certificados/notaFinal");

const MANEJADORES = {
  "inscripcion.creada": ins.onInscripcionCreada,
  "acceso.habilitado": ins.onAccesoHabilitado,
  "inscripcion.rechazada": ins.onInscripcionRechazada,
  "inscripcion.cancelada": ins.onInscripcionCancelada,
  "evaluacion.publicada": ev.onEvaluacionPublicada,
  "evaluacion.calificada": ev.onEvaluacionCalificada,
  "nota.final.calculada": onNotaFinalCalculada,
};

// Devuelve el manejador del evento, o null si no le interesa al servicio
function manejadorPara(routingKey) {
  if (MANEJADORES[routingKey]) return MANEJADORES[routingKey];
  if (routingKey.startsWith("cursos.evento.")) return onEventoCurso;
  return null;
}

module.exports = { manejadorPara };
