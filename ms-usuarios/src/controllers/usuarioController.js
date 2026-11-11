const usuarioService = require('../services/usuarioService');

async function me(req, res, next) {
  try {
    res.json(await usuarioService.obtenerPerfil(req.usuario.id));
  } catch (error) {
    next(error);
  }
}

async function listar(req, res, next) {
  try {
    res.json(await usuarioService.listar(req.query.rol));
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    res.status(201).json(await usuarioService.crearPorAdministrador(req.body || {}));
  } catch (error) {
    next(error);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const { activo } = req.body || {};
    res.json(await usuarioService.cambiarEstado(req.params.id, activo));
  } catch (error) {
    next(error);
  }
}

async function docente(req, res, next) {
  try {
    res.json(await usuarioService.obtenerDocente(req.params.id));
  } catch (error) {
    next(error);
  }
}

module.exports = { me, listar, crear, cambiarEstado, docente };
