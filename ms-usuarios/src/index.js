const config = require('./config/env');
const app = require('./app');
const { sincronizarBaseDatos } = require('./models');
const { crearAdministradorInicial } = require('./services/authService');
const rabbit = require('./messaging/rabbit');
const { iniciarConsumidor } = require('./messaging/consumidor');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// La base puede tardar en levantar dentro de Docker, por eso se reintenta.
async function conectarBaseDatos(intentos = 10) {
  for (let i = 1; i <= intentos; i += 1) {
    try {
      await sincronizarBaseDatos();
      console.log('Base de datos sincronizada correctamente.');
      return;
    } catch (error) {
      console.error(`No se pudo conectar a la base de datos (intento ${i}/${intentos}): ${error.message}`);
      if (i === intentos) throw error;
      await esperar(3000);
    }
  }
}

async function iniciar() {
  try {
    await conectarBaseDatos();
    await crearAdministradorInicial();

    // RabbitMQ no detiene el arranque: si no está, se reintenta en segundo plano.
    iniciarConsumidor();
    rabbit.conectar();

    app.listen(config.puerto, () => {
      console.log(`ms-usuarios corriendo en el puerto ${config.puerto}`);
    });
  } catch (error) {
    console.error('El servicio no pudo arrancar:', error.message);
    process.exit(1);
  }
}

iniciar();
