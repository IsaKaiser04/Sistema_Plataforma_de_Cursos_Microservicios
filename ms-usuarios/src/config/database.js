const { Sequelize } = require('sequelize');
const config = require('./env');

const sequelize = new Sequelize(config.db.nombre, config.db.usuario, config.db.clave, {
  host: config.db.host,
  port: config.db.puerto,
  dialect: 'postgres',
  logging: false,
});

module.exports = sequelize;
