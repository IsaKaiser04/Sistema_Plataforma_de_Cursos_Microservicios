// Error con el formato común de integracion.md (sección 5).
class ApiError extends Error {
  constructor(status, error, mensaje) {
    super(mensaje);
    this.status = status;
    this.error = error;
  }
}

const datosInvalidos = (mensaje) => new ApiError(400, 'DATOS_INVALIDOS', mensaje);
const noAutenticado = (mensaje) => new ApiError(401, 'NO_AUTENTICADO', mensaje);
const prohibido = (mensaje = 'No tienes permiso para esta acción') => new ApiError(403, 'PROHIBIDO', mensaje);
const noEncontrado = (mensaje) => new ApiError(404, 'NO_ENCONTRADO', mensaje);
const conflicto = (error, mensaje) => new ApiError(409, error, mensaje);
const servicioNoDisponible = (mensaje) => new ApiError(503, 'SERVICIO_NO_DISPONIBLE', mensaje);

module.exports = {
  ApiError,
  datosInvalidos,
  noAutenticado,
  prohibido,
  noEncontrado,
  conflicto,
  servicioNoDisponible,
};
