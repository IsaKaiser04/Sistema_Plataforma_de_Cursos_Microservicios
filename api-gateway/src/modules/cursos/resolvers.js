const cursosDS = require("./datasource");

module.exports = {
  Query: {
    catalogoCursos: (_, __, ctx) => cursosDS.catalogoCursos(ctx),
    cursos: (_, args, ctx) => cursosDS.listarCursos(args, ctx),
    curso: (_, { id }, ctx) => cursosDS.obtenerCurso(id, ctx),
    misCursosDocente: (_, { docenteId }, ctx) =>
      cursosDS.cursosPorDocente(docenteId || ctx?.usuario?.id, ctx),
  },
  Mutation: {
    crearCurso: (_, { input }, ctx) => cursosDS.crearCurso(input, ctx),
    actualizarCurso: (_, { id, input }, ctx) => cursosDS.actualizarCurso(id, input, ctx),
    cambiarEstadoCurso: (_, { id, estado }, ctx) => cursosDS.cambiarEstadoCurso(id, estado, ctx),
    agregarModulo: (_, { cursoId, input }, ctx) => cursosDS.agregarModulo(cursoId, input, ctx),
    actualizarModulo: (_, { cursoId, moduloId, input }, ctx) =>
      cursosDS.actualizarModulo(cursoId, moduloId, input, ctx),
    eliminarModulo: (_, { cursoId, moduloId }, ctx) =>
      cursosDS.eliminarModulo(cursoId, moduloId, ctx),
    eliminarCurso: (_, { id }, ctx) => cursosDS.eliminarCurso(id, ctx),
  },
  Inscripcion: {
    curso: (inscripcion, _, ctx) =>
      cursosDS.obtenerCurso(inscripcion.cursoId || inscripcion.curso_id, ctx),
  },
};
