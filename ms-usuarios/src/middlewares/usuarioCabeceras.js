const { noAutenticado, prohibido } = require('../utils/errores');
const { esUuid } = require('../utils/formato');
const { ROLES } = require('../models/Usuario');

// El gateway valida el JWT y manda el usuario en estas cabeceras (integracion.md, sección 4).
function leerUsuario(req, res, next) {
  const id = req.header('X-User-Id');
  const rol = req.header('X-User-Rol');

  if (!id || !rol) {
    return next(noAutenticado('Faltan las cabeceras X-User-Id y X-User-Rol'));
  }
  if (!esUuid(id) || !ROLES.includes(rol)) {
    return next(noAutenticado('Las cabeceras X-User-Id o X-User-Rol no son válidas'));
  }

  req.usuario = { id, rol };
  return next();
}

function permitirRoles(roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return next(prohibido());
    }
    return next();
  };
}

module.exports = { leerUsuario, permitirRoles };
