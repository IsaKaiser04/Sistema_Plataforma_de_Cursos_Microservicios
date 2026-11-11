const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const config = require('./config');
const { crearContexto } = require('./context');
const { formatearError } = require('./errors');

// Une los resolvers de cada carpeta de modules/. Para agregar un módulo
// basta con crear modules/<nombre>/resolvers.js; no hace falta tocar este archivo.
function cargarResolvers() {
  const carpeta = path.join(__dirname, 'modules');
  const unidos = {};
  for (const nombre of fs.readdirSync(carpeta)) {
    const archivo = path.join(carpeta, nombre, 'resolvers.js');
    if (!fs.existsSync(archivo)) continue;
    const resolvers = require(archivo);
    for (const [tipo, campos] of Object.entries(resolvers)) {
      unidos[tipo] = { ...(unidos[tipo] || {}), ...campos };
    }
    console.log(`[gateway] Módulo cargado: ${nombre}`);
  }
  return unidos;
}

async function iniciar() {
  const typeDefs = fs.readFileSync(path.join(__dirname, 'schema', 'schema.graphql'), 'utf8');

  const servidor = new ApolloServer({
    typeDefs,
    resolvers: cargarResolvers(),
    formatError: formatearError,
    introspection: true,
    includeStacktraceInErrorResponses: false,
  });
  await servidor.start();

  // Apollo Sandbox se abre desde estos orígenes, por eso se permiten además del frontend.
  const origenes = [
    ...config.corsOrigin,
    'https://sandbox.embed.apollographql.com',
    'https://studio.apollographql.com',
  ];

  const app = express();
  app.get('/health', (req, res) => res.json({ servicio: 'api-gateway', estado: 'UP' }));
  app.use(
    '/graphql',
    cors({ origin: origenes }),
    express.json(),
    expressMiddleware(servidor, { context: crearContexto })
  );

  app.listen(config.puerto, () => {
    console.log(`[gateway] GraphQL en http://localhost:${config.puerto}/graphql`);
  });
}

iniciar().catch((error) => {
  console.error('[gateway] No pudo arrancar:', error.message);
  process.exit(1);
});
