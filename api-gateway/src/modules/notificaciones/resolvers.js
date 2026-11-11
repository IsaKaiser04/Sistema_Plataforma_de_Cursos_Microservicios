const ds = require('./datasource');
// Solo se lee el módulo de usuarios (no se modifica) para poner el nombre en el PDF
const usuariosDs = require('../usuarios/datasource');

async function nombreDe(usuario) {
  try {
    const yo = await usuariosDs.me(usuario);
    return [yo.nombres, yo.apellidos].filter(Boolean).join(' ').trim() || null;
  } catch {
    return null; // sin ms-usuarios el PDF sale igual, sin nombre
  }
}
const { requiereLogin } = require('../../context');

// ms-certificados vuelve a revisar que el recurso sea del usuario (X-User-Id).
module.exports = {
  Query: {
    misNotificaciones: (_, { estado }, ctx) => ds.misNotificaciones(requiereLogin(ctx), estado),
    totalNoLeidas: (_, __, ctx) => ds.totalNoLeidas(requiereLogin(ctx)),
    misCertificados: (_, __, ctx) => ds.misCertificados(requiereLogin(ctx)),
    certificado: (_, { id }, ctx) => ds.certificado(requiereLogin(ctx), id),
    certificadoPdf: async (_, { id }, ctx) => {
      const usuario = requiereLogin(ctx);
      return ds.certificadoPdf(usuario, id, await nombreDe(usuario));
    },

    // Pública: si el código no existe devuelve null en vez de error
    verificarCertificado: async (_, { codigo }) => {
      try {
        return await ds.verificar(codigo.trim());
      } catch (error) {
        if (error.extensions?.code === 'NO_ENCONTRADO') return null;
        throw error;
      }
    },
  },

  Mutation: {
    marcarNotificacionLeida: (_, { id }, ctx) => ds.marcarLeida(requiereLogin(ctx), id),
    marcarTodasLeidas: (_, __, ctx) => ds.marcarTodasLeidas(requiereLogin(ctx)),
  },
};
