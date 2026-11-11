const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const { Usuario } = require('../models');
const { datosInvalidos, noAutenticado, prohibido } = require('../utils/errores');
const { esEmail } = require('../utils/formato');

const LARGO_MINIMO_CLAVE = 6;

// Valida los datos comunes para crear cualquier usuario.
function validarDatosUsuario({ nombres, apellidos, email, password }) {
  const faltan = [];
  if (!nombres || !String(nombres).trim()) faltan.push('nombres');
  if (!apellidos || !String(apellidos).trim()) faltan.push('apellidos');
  if (!email) faltan.push('email');
  if (!password) faltan.push('password');
  if (faltan.length > 0) {
    throw datosInvalidos(`Faltan campos obligatorios: ${faltan.join(', ')}`);
  }
  if (!esEmail(email)) {
    throw datosInvalidos('El email no tiene un formato válido');
  }
  if (String(password).length < LARGO_MINIMO_CLAVE) {
    throw datosInvalidos(`La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres`);
  }
}

async function crearUsuario({ nombres, apellidos, email, password }, rol) {
  validarDatosUsuario({ nombres, apellidos, email, password });
  const correo = String(email).trim().toLowerCase();

  const existente = await Usuario.findOne({ where: { email: correo } });
  if (existente) {
    throw datosInvalidos('El email ya está registrado');
  }

  return Usuario.create({
    nombres: String(nombres).trim(),
    apellidos: String(apellidos).trim(),
    email: correo,
    password: String(password),
    rol,
  });
}

// Registro público: el rol que venga en el body se ignora, siempre es ESTUDIANTE.
async function registrar(datos) {
  const usuario = await crearUsuario(datos, 'ESTUDIANTE');
  return usuario.aJson();
}

async function login({ email, password }) {
  if (!email || !password) {
    throw datosInvalidos('Debes enviar email y password');
  }
  const usuario = await Usuario.findOne({ where: { email: String(email).trim().toLowerCase() } });
  if (!usuario) {
    throw noAutenticado('Credenciales inválidas');
  }
  const claveValida = await bcrypt.compare(String(password), usuario.password);
  if (!claveValida) {
    throw noAutenticado('Credenciales inválidas');
  }
  if (!usuario.activo) {
    throw prohibido('Tu cuenta está desactivada, comunícate con el administrador');
  }

  // Payload acordado en integracion.md sección 4
  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    config.jwtSecret,
    { expiresIn: '24h' }
  );

  const { id, email: correo, nombres, apellidos, rol } = usuario.aJson();
  return { token, usuario: { id, email: correo, nombres, apellidos, rol } };
}

// P9: crea el administrador inicial si no hay ninguno y están las variables.
async function crearAdministradorInicial() {
  const { email, clave } = config.admin;
  if (!email || !clave) {
    console.log('[inicio] ADMIN_EMAIL o ADMIN_PASSWORD no están definidos, no se crea administrador inicial');
    return null;
  }
  const hayAdmin = await Usuario.count({ where: { rol: 'ADMINISTRADOR' } });
  if (hayAdmin > 0) return null;

  const admin = await crearUsuario(
    { nombres: 'Administrador', apellidos: 'LMS', email, password: clave },
    'ADMINISTRADOR'
  );
  console.log(`[inicio] Administrador inicial creado: ${admin.email}`);
  return admin;
}

module.exports = { registrar, login, crearUsuario, crearAdministradorInicial };
