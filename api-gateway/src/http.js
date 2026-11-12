const config = require('./config');
const { servicioNoDisponible, desdeRespuesta } = require('./errors');

// Llama a un microservicio con tiempo límite. Si hay usuario en el contexto,
// le pasa X-User-Id y X-User-Rol (el gateway es el único que las pone).
async function llamar(servicio, baseUrl, ruta, { method = 'GET', body, usuario, timeoutMs = config.timeoutMs } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (usuario) {
    headers['X-User-Id'] = usuario.id;
    headers['X-User-Rol'] = usuario.rol;
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  let respuesta;
  let texto;
  try {
    respuesta = await fetch(`${baseUrl}${ruta}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controlador.signal,
    });
    texto = await respuesta.text();
  } catch (error) {
    const motivo = error.name === 'AbortError' ? `no respondió en ${timeoutMs} ms` : error.message;
    console.error(`[gateway] ${method} ${servicio}${ruta}: ${motivo}`);
    throw servicioNoDisponible(servicio);
  } finally {
    clearTimeout(temporizador);
  }

  let datos = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch (error) {
      datos = null;
    }
  }

  if (!respuesta.ok) throw desdeRespuesta(respuesta.status, datos, servicio);
  return datos;
}

module.exports = { llamar };
