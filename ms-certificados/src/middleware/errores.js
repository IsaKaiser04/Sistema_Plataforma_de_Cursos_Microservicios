// Formato de error común del grupo:
// { timestamp, status, error, mensaje, ruta }
class ApiError extends Error {
  constructor(status, error, mensaje) {
    super(mensaje);
    this.status = status;
    this.error = error;
  }
}

const datosInvalidos = (m) => new ApiError(400, "DATOS_INVALIDOS", m);
const noAutenticado = (m) => new ApiError(401, "NO_AUTENTICADO", m);
const prohibido = (m) => new ApiError(403, "PROHIBIDO", m);
const noEncontrado = (m) => new ApiError(404, "NO_ENCONTRADO", m);

// Fecha local sin zona, igual que los servicios Java (LocalDateTime)
const ahora = () => new Date().toISOString().slice(0, 19);

function cuerpoError(req, status, error, mensaje) {
  return { timestamp: ahora(), status, error, mensaje, ruta: req.originalUrl };
}

function rutaNoEncontrada(req, res) {
  res.status(404).json(cuerpoError(req, 404, "NO_ENCONTRADO", "Ruta no encontrada"));
}

// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json(cuerpoError(req, err.status, err.error, err.message));
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json(cuerpoError(req, 400, "DATOS_INVALIDOS", "JSON mal formado"));
  }
  console.log(`Error en ${req.method} ${req.originalUrl}:`, err.message);
  res.status(500).json(cuerpoError(req, 500, "ERROR_INTERNO", "Error interno del servidor"));
}

// Envuelve un handler async para que sus errores lleguen a manejarErrores
const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  ApiError,
  datosInvalidos,
  noAutenticado,
  prohibido,
  noEncontrado,
  rutaNoEncontrada,
  manejarErrores,
  asincrono,
};
