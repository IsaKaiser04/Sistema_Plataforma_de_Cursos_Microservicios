const { GraphQLError } = require('graphql');

// Traduce el error común de los servicios (integracion.md, sección 5)
// al extensions.code de api-gateway.md, sección 6.
const CODIGO_POR_STATUS = {
  400: 'DATOS_INVALIDOS',
  401: 'NO_AUTENTICADO',
  403: 'PROHIBIDO',
  404: 'NO_ENCONTRADO',
  503: 'SERVICIO_NO_DISPONIBLE',
};

function errorGraphQL(code, mensaje) {
  return new GraphQLError(mensaje, { extensions: { code } });
}

const noAutenticado = (mensaje = 'Debes iniciar sesión') => errorGraphQL('NO_AUTENTICADO', mensaje);

const prohibido = (mensaje = 'No tienes permiso para esta operación') => errorGraphQL('PROHIBIDO', mensaje);

const servicioNoDisponible = (servicio) =>
  errorGraphQL('SERVICIO_NO_DISPONIBLE', `El servicio de ${servicio} no está disponible, intenta más tarde`);

function desdeRespuesta(status, cuerpo, servicio) {
  const mensaje = (cuerpo && cuerpo.mensaje) || `El servicio de ${servicio} respondió ${status}`;
  // En los 409 el código es el error que mandó el servicio (CUPO_AGOTADO, YA_INSCRITO...)
  if (status === 409) return errorGraphQL((cuerpo && cuerpo.error) || 'CONFLICTO', mensaje);
  if (CODIGO_POR_STATUS[status]) return errorGraphQL(CODIGO_POR_STATUS[status], mensaje);
  return errorGraphQL('ERROR_INTERNO', `Ocurrió un error en el servicio de ${servicio}`);
}

// Los errores que no son nuestros no deben mostrar detalles internos al navegador.
function formatearError(formateado, error) {
  if (formateado.extensions && formateado.extensions.code === 'INTERNAL_SERVER_ERROR') {
    console.error('[gateway] Error no controlado:', error);
    return { message: 'Ocurrió un error en el gateway', extensions: { code: 'ERROR_INTERNO' } };
  }
  return formateado;
}

module.exports = { errorGraphQL, noAutenticado, prohibido, servicioNoDisponible, desdeRespuesta, formatearError };
