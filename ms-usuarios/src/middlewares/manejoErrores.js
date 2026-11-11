const { ValidationError, UniqueConstraintError } = require('sequelize');
const { ApiError } = require('../utils/errores');
const { fechaEcuador } = require('../utils/formato');

function responderError(req, res, status, error, mensaje) {
  res.status(status).json({
    timestamp: fechaEcuador(),
    status,
    error,
    mensaje,
    ruta: req.originalUrl.split('?')[0],
  });
}

function rutaNoEncontrada(req, res) {
  responderError(req, res, 404, 'NO_ENCONTRADO', `La ruta ${req.method} ${req.path} no existe`);
}

// eslint-disable-next-line no-unused-vars
function manejoErrores(err, req, res, next) {
  if (err instanceof ApiError) {
    return responderError(req, res, err.status, err.error, err.message);
  }
  // JSON mal escrito en el body
  if (err.type === 'entity.parse.failed') {
    return responderError(req, res, 400, 'DATOS_INVALIDOS', 'El cuerpo de la petición no es un JSON válido');
  }
  if (err instanceof UniqueConstraintError) {
    return responderError(req, res, 400, 'DATOS_INVALIDOS', 'El registro ya existe');
  }
  if (err instanceof ValidationError) {
    return responderError(req, res, 400, 'DATOS_INVALIDOS', err.errors.map((e) => e.message).join(', '));
  }

  console.error('Error no controlado:', err);
  return responderError(req, res, 500, 'ERROR_INTERNO', 'Ocurrió un error en el servidor');
}

module.exports = { manejoErrores, rutaNoEncontrada };
