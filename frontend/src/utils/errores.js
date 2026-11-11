// Texto para mostrar al usuario a partir de un error de Apollo.
// El gateway ya manda el mensaje del servicio (por ejemplo "El email ya está registrado").
export function mensajeDeError(error) {
  if (!error) return '';
  const primero = error.graphQLErrors?.[0];
  if (primero?.message) return primero.message;
  if (error.networkError) {
    return 'No se pudo conectar con el servidor. Revisa que el api-gateway esté corriendo.';
  }
  return error.message || 'Ocurrió un error inesperado';
}

export function codigoDeError(error) {
  return error?.graphQLErrors?.[0]?.extensions?.code ?? null;
}
