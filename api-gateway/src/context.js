const jwt = require('jsonwebtoken');
const config = require('./config');
const { noAutenticado, prohibido } = require('./errors');

// Lee "Authorization: Bearer <token>" y deja { id, email, rol } en el contexto,
// o null si no hay token o no es válido (integracion.md, sección 4).
async function crearContexto({ req }) {
  const cabecera = req.headers.authorization || '';
  if (!cabecera.startsWith('Bearer ')) return { usuario: null };

  try {
    const payload = jwt.verify(cabecera.slice(7), config.jwtSecret);
    return { usuario: { id: payload.id, email: payload.email, rol: payload.rol } };
  } catch (error) {
    return { usuario: null };
  }
}

function requiereLogin(ctx) {
  if (!ctx.usuario) throw noAutenticado('Debes iniciar sesión o tu sesión expiró');
  return ctx.usuario;
}

function requiereRol(ctx, roles) {
  const usuario = requiereLogin(ctx);
  if (!roles.includes(usuario.rol)) throw prohibido();
  return usuario;
}

module.exports = { crearContexto, requiereLogin, requiereRol };
