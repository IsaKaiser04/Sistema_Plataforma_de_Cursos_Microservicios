const config = require('../../config');
const { llamar } = require('../../http');
const { servicioNoDisponible, desdeRespuesta } = require('../../errors');

// Llamadas REST a ms-certificados (ms-certificados/DOCUMENTACION.md, endpoints).
// Usa NOTIFICACIONES_URL, que ya existe en config.js: no hace falta tocar archivos de la base.
function certificados(ruta, opciones) {
  const base = config.servicios.notificaciones;
  if (!base) throw servicioNoDisponible('certificados');
  return llamar('certificados', base, ruta, opciones);
}

const id = (valor) => encodeURIComponent(valor);

const misNotificaciones = (usuario, estado) =>
  certificados(
    `/api/v1/notificaciones/${id(usuario.id)}${estado ? `?estado=${encodeURIComponent(estado)}` : ''}`,
    { usuario }
  );

const totalNoLeidas = async (usuario) => {
  const r = await certificados(`/api/v1/notificaciones/${id(usuario.id)}/no-leidas/total`, { usuario });
  return r.total;
};

const marcarLeida = (usuario, idNotificacion) =>
  certificados(`/api/v1/notificaciones/${id(idNotificacion)}/leida`, { method: 'PATCH', usuario });

const marcarTodasLeidas = async (usuario) => {
  const r = await certificados(`/api/v1/notificaciones/${id(usuario.id)}/leidas`, { method: 'PATCH', usuario });
  return r.actualizadas;
};

const misCertificados = (usuario) =>
  certificados(`/api/v1/certificados/estudiante/${id(usuario.id)}`, { usuario });

const certificado = (usuario, idCertificado) =>
  certificados(`/api/v1/certificados/${id(idCertificado)}`, { usuario });

// Pública: no envía X-User-Id
const verificar = (codigo) => certificados(`/api/v1/certificados/verificar/${id(codigo)}`);

// PDF del certificado. http.js solo maneja JSON, por eso aquí se pide el binario
// directamente (mismas cabeceras y tiempo límite que llamar()).
async function certificadoPdf(usuario, idCertificado, nombre) {
  const base = config.servicios.notificaciones;
  if (!base) throw servicioNoDisponible('certificados');
  const qs = nombre ? `?nombre=${encodeURIComponent(nombre)}` : '';
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), config.timeoutMs);
  let respuesta;
  try {
    respuesta = await fetch(`${base}/api/v1/certificados/${id(idCertificado)}/pdf${qs}`, {
      headers: { Accept: 'application/pdf', 'X-User-Id': usuario.id, 'X-User-Rol': usuario.rol },
      signal: controlador.signal,
    });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => null);
      throw desdeRespuesta(respuesta.status, cuerpo, 'certificados');
    }
    const contenido = Buffer.from(await respuesta.arrayBuffer());
    const disposicion = respuesta.headers.get('content-disposition') || '';
    const nombreArchivo = (disposicion.match(/filename="([^"]+)"/) || [])[1] || 'certificado.pdf';
    return { nombreArchivo, contenidoBase64: contenido.toString('base64') };
  } catch (error) {
    if (error.extensions) throw error;
    console.error(`[gateway] PDF de certificado ${idCertificado}: ${error.message}`);
    throw servicioNoDisponible('certificados');
  } finally {
    clearTimeout(temporizador);
  }
}

module.exports = {
  certificadoPdf,
  misNotificaciones,
  totalNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
  misCertificados,
  certificado,
  verificar,
};
