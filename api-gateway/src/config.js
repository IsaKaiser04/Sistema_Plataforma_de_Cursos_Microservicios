// Variables de entorno del gateway (api-gateway.md, sección 7).
const fs = require('fs');
const path = require('path');

// Carga api-gateway/.env si existe (para correr con npm fuera de Docker).
// Las variables que ya vienen del sistema o de Docker no se pisan.
function cargarArchivoEnv() {
  const archivo = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(archivo)) return;
  for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const texto = linea.trim();
    if (!texto || texto.startsWith('#') || !texto.includes('=')) continue;
    const posicion = texto.indexOf('=');
    const nombre = texto.slice(0, posicion).trim();
    const valor = texto.slice(posicion + 1).trim().replace(/^["']|["']$/g, '');
    if (process.env[nombre] === undefined) process.env[nombre] = valor;
  }
}
cargarArchivoEnv();

function obligatoria(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisa tu archivo .env`);
  }
  return valor;
}

const config = {
  puerto: Number(process.env.PORT || 4000),
  jwtSecret: obligatoria('JWT_SECRET'),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()),
  // P3: tiempo límite de las llamadas a los servicios
  timeoutMs: 5000,
  // ms-evaluaciones puede tardar más: la primera vez que ve un curso se lo pide a ms-cursos.
  timeoutEvaluacionesMs: Number(process.env.EVALUACIONES_TIMEOUT_MS || 15000),
  servicios: {
    usuarios: obligatoria('USUARIOS_URL'),
    // Los demás se vuelven obligatorios cuando cada integrante agregue su módulo
    cursos: process.env.CURSOS_URL,
    evaluaciones: process.env.EVALUACIONES_URL,
    notificaciones: process.env.NOTIFICACIONES_URL,
  },
};

module.exports = config;
