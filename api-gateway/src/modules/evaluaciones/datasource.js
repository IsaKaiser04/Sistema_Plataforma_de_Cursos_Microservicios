const config = require('../../config');
const { llamar } = require('../../http');
const { servicioNoDisponible } = require('../../errors');

// Llamadas REST a ms-evaluaciones (EvaluacionController y CalificacionController).
// La URL sale de EVALUACIONES_URL; el usuario siempre es el del token, nunca uno que mande el cliente.
function evaluaciones(ruta, opciones) {
  const base = config.servicios.evaluaciones;
  if (!base) throw servicioNoDisponible('evaluaciones');
  return llamar('evaluaciones', base, ruta, { ...opciones, timeoutMs: config.timeoutEvaluacionesMs });
}

const id = (valor) => encodeURIComponent(valor);

// "2026-11-12T08:00" (lo que da un input datetime-local) -> "2026-11-12T08:00:00"
const conSegundos = (fecha) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fecha) ? `${fecha}:00` : fecha);

const listarPorCurso = (usuario, cursoId) => evaluaciones(`/api/v1/evaluaciones/curso/${id(cursoId)}`, { usuario });

const crear = (usuario, input) =>
  evaluaciones('/api/v1/evaluaciones', {
    method: 'POST',
    usuario,
    body: {
      cursoId: input.cursoId,
      titulo: input.titulo,
      descripcion: input.descripcion || null,
      tipo: input.tipo,
      peso: input.peso,
      fechaApertura: conSegundos(input.fechaApertura),
      fechaCierre: conSegundos(input.fechaCierre),
      preguntas: input.preguntas,
    },
  });

const publicar = (usuario, evaluacionId) =>
  evaluaciones(`/api/v1/evaluaciones/${id(evaluacionId)}/publicar`, { method: 'PATCH', usuario });

const entregas = (usuario, evaluacionId) =>
  evaluaciones(`/api/v1/evaluaciones/${id(evaluacionId)}/entregas`, { usuario });

const entregar = (usuario, evaluacionId, respuestas) =>
  evaluaciones(`/api/v1/evaluaciones/${id(evaluacionId)}/entregas`, {
    method: 'POST',
    usuario,
    body: { respuestas },
  });

const calificaciones = (usuario, evaluacionId) =>
  evaluaciones(`/api/v1/evaluaciones/${id(evaluacionId)}/calificaciones`, { usuario });

const calificar = (usuario, evaluacionId, input) =>
  evaluaciones(`/api/v1/evaluaciones/${id(evaluacionId)}/calificaciones`, {
    method: 'POST',
    usuario,
    body: {
      estudianteId: input.estudianteId,
      nota: input.nota,
      retroalimentacion: input.retroalimentacion || null,
    },
  });

// Calificaciones propias: el id es el del token, así un estudiante no puede pedir las de otro.
const misCalificaciones = (usuario, cursoId) =>
  evaluaciones(
    `/api/v1/calificaciones/estudiante/${id(usuario.id)}${cursoId ? `?cursoId=${id(cursoId)}` : ''}`,
    { usuario }
  );

module.exports = {
  listarPorCurso,
  crear,
  publicar,
  entregas,
  entregar,
  calificaciones,
  calificar,
  misCalificaciones,
};
