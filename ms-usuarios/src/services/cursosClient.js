const config = require('../config/env');
const { servicioNoDisponible } = require('../utils/errores');

// Llama a GET {CURSOS_URL}/api/v1/cursos/{id}/validar con tiempo límite (P5 y P6).
// Respuesta de ms-cursos:
// { cursoId, codigo, titulo, estado, existe, inscribible, cuposDisponibles, precio }
async function validarCurso(cursoId) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), config.cursos.timeoutMs);
  const url = `${config.cursos.url}/api/v1/cursos/${cursoId}/validar`;

  try {
    const respuesta = await fetch(url, { signal: controlador.signal });

    if (respuesta.status === 404) {
      return { existe: false, inscribible: false };
    }
    if (!respuesta.ok) {
      throw new Error(`ms-cursos respondió ${respuesta.status}`);
    }
    return await respuesta.json();
  } catch (error) {
    const motivo = error.name === 'AbortError'
      ? `no respondió en ${config.cursos.timeoutMs} ms`
      : error.message;
    console.error(`[cursosClient] Error al validar el curso ${cursoId}: ${motivo}`);
    throw servicioNoDisponible('El servicio de cursos no está disponible, intenta más tarde');
  } finally {
    clearTimeout(temporizador);
  }
}

module.exports = { validarCurso };
