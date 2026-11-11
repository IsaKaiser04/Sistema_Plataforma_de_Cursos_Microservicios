const { sequelize } = require('../models');
const rabbit = require('../messaging/rabbit');

async function health(req, res) {
  let baseDatos = 'UP';
  try {
    await sequelize.authenticate();
  } catch (error) {
    baseDatos = 'DOWN';
  }
  const rabbitmq = rabbit.estaConectado() ? 'UP' : 'DOWN';
  const todoBien = baseDatos === 'UP' && rabbitmq === 'UP';

  res.status(todoBien ? 200 : 503).json({
    servicio: 'ms-usuarios',
    estado: todoBien ? 'UP' : 'DOWN',
    baseDatos,
    rabbitmq,
  });
}

module.exports = { health };
