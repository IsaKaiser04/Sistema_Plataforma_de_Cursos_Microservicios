const { esUuid } = require("../lib/validacion");
const { datosInvalidos, noAutenticado, prohibido } = require("./errores");

// El api-gateway valida el token y envía el id del usuario en X-User-Id
function usuarioActual(req) {
  const id = req.get("X-User-Id");
  if (!id) throw noAutenticado("Falta la cabecera X-User-Id");
  if (!esUuid(id)) throw datosInvalidos("X-User-Id no es un UUID válido");
  return id.toLowerCase();
}

// Comprueba que el recurso pertenezca al usuario que hace la petición
function exigirDuenio(req, estudianteId) {
  if (usuarioActual(req) !== String(estudianteId).toLowerCase()) {
    throw prohibido("No puedes acceder a recursos de otro estudiante");
  }
}

// Middleware para rutas con :estudianteId
function soloDuenio(req, _res, next) {
  try {
    const { estudianteId } = req.params;
    if (!esUuid(estudianteId)) throw datosInvalidos("estudianteId no es un UUID válido");
    exigirDuenio(req, estudianteId);
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { usuarioActual, exigirDuenio, soloDuenio };
