const ds = require('./datasource');
const { requiereLogin, requiereRol } = require('../../context');

// El gateway revisa el rol antes de llamar; ms-usuarios lo vuelve a revisar.
module.exports = {
  Query: {
    me: (_, __, ctx) => ds.me(requiereLogin(ctx)),
    usuarios: (_, { rol }, ctx) => ds.listar(requiereRol(ctx, ['ADMINISTRADOR']), rol),
    misInscripciones: (_, __, ctx) => ds.misInscripciones(requiereRol(ctx, ['ESTUDIANTE'])),
    inscritosCurso: (_, { cursoId }, ctx) =>
      ds.inscritosCurso(requiereRol(ctx, ['DOCENTE', 'ADMINISTRADOR']), cursoId),
  },

  Mutation: {
    login: (_, { email, password }) => ds.login(email, password),
    registro: (_, { input }) => ds.registro(input),
    crearUsuario: (_, { input }, ctx) => ds.crear(requiereRol(ctx, ['ADMINISTRADOR']), input),
    cambiarEstadoUsuario: (_, { id, activo }, ctx) =>
      ds.cambiarEstado(requiereRol(ctx, ['ADMINISTRADOR']), id, activo),
    inscribirse: (_, { cursoId }, ctx) => ds.inscribirse(requiereRol(ctx, ['ESTUDIANTE']), cursoId),
    cancelarInscripcion: (_, { id }, ctx) => ds.cancelarInscripcion(requiereLogin(ctx), id),
  },
};
