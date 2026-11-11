const authService = require('../services/authService');

// Los controladores solo leen la petición y responden; la lógica está en services/ (P3).

async function registrar(req, res, next) {
  try {
    const usuario = await authService.registrar(req.body || {});
    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const resultado = await authService.login(req.body || {});
    res.json(resultado);
  } catch (error) {
    next(error);
  }
}

module.exports = { registrar, login };
