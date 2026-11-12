const ds = require('./datasource');
const { requiereLogin, requiereRol } = require('../../context');
const { errorGraphQL } = require('../../errors');

// El gateway revisa el rol y ms-evaluaciones vuelve a revisar que el docente
// sea el del curso y que el estudiante esté habilitado.
const DOCENTE_O_ADMIN = ['DOCENTE', 'ADMINISTRADOR'];

function validarNota(nota) {
  if (typeof nota !== 'number' || Number.isNaN(nota) || nota < 0 || nota > 10) {
    throw errorGraphQL('DATOS_INVALIDOS', 'La nota debe estar entre 0 y 10');
  }
  // ms-evaluaciones redondea a un decimal; se exige un decimal para que 6.95 no pase a 7.0 sin aviso.
  if (Math.round(nota * 10) / 10 !== nota) {
    throw errorGraphQL('DATOS_INVALIDOS', 'La nota debe tener como máximo un decimal');
  }
}

module.exports = {
  Query: {
    evaluacionesCurso: (_, { cursoId }, ctx) => ds.listarPorCurso(requiereLogin(ctx), cursoId),
    entregasEvaluacion: (_, { evaluacionId }, ctx) => ds.entregas(requiereLogin(ctx), evaluacionId),
    calificacionesEvaluacion: (_, { evaluacionId }, ctx) =>
      ds.calificaciones(requiereRol(ctx, DOCENTE_O_ADMIN), evaluacionId),
    misCalificaciones: (_, { cursoId }, ctx) => ds.misCalificaciones(requiereRol(ctx, ['ESTUDIANTE']), cursoId),
  },

  Mutation: {
    crearEvaluacion: (_, { input }, ctx) => {
      const usuario = requiereRol(ctx, DOCENTE_O_ADMIN);
      if (!input.preguntas || input.preguntas.length === 0) {
        throw errorGraphQL('DATOS_INVALIDOS', 'La evaluación necesita al menos una pregunta');
      }
      return ds.crear(usuario, input);
    },
    publicarEvaluacion: (_, { id }, ctx) => ds.publicar(requiereRol(ctx, DOCENTE_O_ADMIN), id),
    entregarEvaluacion: (_, { evaluacionId, respuestas }, ctx) =>
      ds.entregar(requiereRol(ctx, ['ESTUDIANTE']), evaluacionId, respuestas),
    calificarEntrega: (_, { evaluacionId, input }, ctx) => {
      const usuario = requiereRol(ctx, DOCENTE_O_ADMIN);
      validarNota(input.nota);
      return ds.calificar(usuario, evaluacionId, input);
    },
  },
};
