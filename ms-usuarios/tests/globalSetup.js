// Crea la base usuarios_test si no existe, antes de correr las pruebas.
const { Client } = require('pg');

module.exports = async () => {
  require('./env');
  const cliente = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: 'postgres',
  });
  await cliente.connect();
  const nombre = process.env.POSTGRES_DB;
  const { rowCount } = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombre]);
  if (rowCount === 0) {
    await cliente.query(`CREATE DATABASE "${nombre}"`);
  }
  await cliente.end();
};
