// En las pruebas (Jest pone NODE_ENV=test) las variables salen de tests/env.js
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config({ quiet: true });
}

// Lee una variable obligatoria. Si falta, el servicio no arranca.
function obligatoria(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisa tu archivo .env`);
  }
  return valor;
}

const config = {
  puerto: Number(process.env.PORT || 3004),
  db: {
    host: obligatoria('DB_HOST'),
    puerto: Number(process.env.DB_PORT || 5432),
    nombre: obligatoria('POSTGRES_DB'),
    usuario: obligatoria('POSTGRES_USER'),
    clave: obligatoria('POSTGRES_PASSWORD'),
  },
  jwtSecret: obligatoria('JWT_SECRET'),
  rabbit: {
    url: obligatoria('RABBIT_URL'),
    exchange: process.env.RABBIT_EXCHANGE || 'lms.eventos.exchange',
  },
  cursos: {
    url: obligatoria('CURSOS_URL'),
    timeoutMs: Number(process.env.CURSOS_TIMEOUT_MS || 3000),
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    clave: process.env.ADMIN_PASSWORD,
  },
};

module.exports = config;
