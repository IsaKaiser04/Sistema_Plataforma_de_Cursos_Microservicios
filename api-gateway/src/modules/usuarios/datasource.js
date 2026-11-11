const config = require('../../config');
const { llamar } = require('../../http');

// Llamadas REST a ms-usuarios (contrato en ms-usuarios.md, sección 5).
const usuarios = (ruta, opciones) => llamar('usuarios', config.servicios.usuarios, ruta, opciones);
const id = (valor) => encodeURIComponent(valor);

async function login(email, password) {
  const respuesta = await usuarios('/api/v1/auth/login', { method: 'POST', body: { email, password } });
  // ms-usuarios solo deja entrar a usuarios activos, por eso no manda el campo.
  return { token: respuesta.token, usuario: { ...respuesta.usuario, activo: true } };
}

const registro = (input) => usuarios('/api/v1/auth/registro', { method: 'POST', body: input });

const me = (usuario) => usuarios('/api/v1/usuarios/me', { usuario });

const listar = (usuario, rol) =>
  usuarios(`/api/v1/usuarios${rol ? `?rol=${encodeURIComponent(rol)}` : ''}`, { usuario });

const crear = (usuario, input) => usuarios('/api/v1/usuarios', { method: 'POST', body: input, usuario });

const cambiarEstado = (usuario, idUsuario, activo) =>
  usuarios(`/api/v1/usuarios/${id(idUsuario)}/estado`, { method: 'PATCH', body: { activo }, usuario });

const inscribirse = (usuario, cursoId) =>
  usuarios('/api/v1/inscripciones', { method: 'POST', body: { cursoId }, usuario });

const cancelarInscripcion = (usuario, idInscripcion) =>
  usuarios(`/api/v1/inscripciones/${id(idInscripcion)}/cancelar`, { method: 'PATCH', usuario });

const misInscripciones = (usuario) => usuarios('/api/v1/inscripciones/mias', { usuario });

const inscritosCurso = (usuario, cursoId) =>
  usuarios(`/api/v1/inscripciones/curso/${id(cursoId)}`, { usuario });

module.exports = {
  login,
  registro,
  me,
  listar,
  crear,
  cambiarEstado,
  inscribirse,
  cancelarInscripcion,
  misInscripciones,
  inscritosCurso,
};
