const { Usuario } = require('../models');
const { crearUsuario } = require('./authService');
const { datosInvalidos, noEncontrado } = require('../utils/errores');
const { esUuid } = require('../utils/formato');

async function buscarPorId(id) {
  if (!esUuid(id)) throw datosInvalidos('El id no es un UUID válido');
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw noEncontrado(`No existe el usuario ${id}`);
  return usuario;
}

async function obtenerPerfil(id) {
  const usuario = await buscarPorId(id);
  return usuario.aJson();
}

async function listar(rol) {
  const where = {};
  if (rol) {
    if (!Usuario.ROLES.includes(rol)) {
      throw datosInvalidos(`El rol debe ser uno de: ${Usuario.ROLES.join(', ')}`);
    }
    where.rol = rol;
  }
  const usuarios = await Usuario.findAll({ where, order: [['apellidos', 'ASC'], ['nombres', 'ASC']] });
  return usuarios.map((u) => u.aJson());
}

// Solo el administrador crea docentes y otros administradores.
async function crearPorAdministrador(datos) {
  const rolesPermitidos = ['DOCENTE', 'ADMINISTRADOR'];
  if (!rolesPermitidos.includes(datos.rol)) {
    throw datosInvalidos('El rol debe ser DOCENTE o ADMINISTRADOR; los estudiantes se registran solos');
  }
  const usuario = await crearUsuario(datos, datos.rol);
  return usuario.aJson();
}

async function cambiarEstado(id, activo) {
  if (typeof activo !== 'boolean') {
    throw datosInvalidos('El campo activo debe ser true o false');
  }
  const usuario = await buscarPorId(id);
  usuario.activo = activo;
  await usuario.save();
  return usuario.aJson();
}

// Para ms-cursos: es exactamente el DocenteExternoDto { id, nombreCompleto, correo, activo }.
async function obtenerDocente(id) {
  if (!esUuid(id)) throw noEncontrado(`No existe el docente ${id}`);
  const usuario = await Usuario.findByPk(id);
  if (!usuario || usuario.rol !== 'DOCENTE') {
    throw noEncontrado(`No existe el docente ${id}`);
  }
  return {
    id: usuario.id,
    nombreCompleto: `${usuario.nombres} ${usuario.apellidos}`.trim(),
    correo: usuario.email,
    activo: usuario.activo,
  };
}

module.exports = { obtenerPerfil, listar, crearPorAdministrador, cambiarEstado, obtenerDocente };
