const amqp = require('amqplib');
const config = require('../config/env');

// Conexión única con RabbitMQ. Si se cae, se vuelve a conectar cada 5 segundos.
const estado = { conexion: null, canal: null, conectado: false };
const alConectar = []; // funciones que se ejecutan cada vez que hay conexión (p. ej. el consumidor)
let reconexionProgramada = false;

function programarReconexion() {
  estado.conectado = false;
  estado.canal = null;
  estado.conexion = null;
  if (reconexionProgramada) return;
  reconexionProgramada = true;
  setTimeout(() => {
    reconexionProgramada = false;
    conectar();
  }, 5000);
}

async function conectar() {
  try {
    const conexion = await amqp.connect(config.rabbit.url);
    const canal = await conexion.createChannel();
    await canal.assertExchange(config.rabbit.exchange, 'topic', { durable: true });

    conexion.on('error', (e) => console.error('[rabbit] Error en la conexión:', e.message));
    conexion.on('close', () => {
      console.error('[rabbit] Se cerró la conexión, reconectando...');
      programarReconexion();
    });
    canal.on('error', (e) => console.error('[rabbit] Error en el canal:', e.message));

    estado.conexion = conexion;
    estado.canal = canal;
    estado.conectado = true;
    console.log('[rabbit] Conectado a', config.rabbit.exchange);

    for (const fn of alConectar) {
      await fn(canal);
    }
  } catch (error) {
    console.error('[rabbit] No se pudo conectar:', error.message);
    programarReconexion();
  }
}

function registrarAlConectar(fn) {
  alConectar.push(fn);
}

// Publica un evento en lms.eventos.exchange. Lanza error si RabbitMQ no está.
function publicar(routingKey, payload) {
  if (!estado.conectado || !estado.canal) {
    throw new Error('RabbitMQ no está conectado');
  }
  const contenido = Buffer.from(JSON.stringify(payload));
  estado.canal.publish(config.rabbit.exchange, routingKey, contenido, {
    contentType: 'application/json',
    persistent: true,
    messageId: payload.eventoId,
  });
}

const estaConectado = () => estado.conectado;

async function cerrar() {
  alConectar.length = 0;
  reconexionProgramada = true; // evita que se reconecte al cerrar a propósito
  if (estado.conexion) {
    estado.conexion.removeAllListeners('close');
    await estado.conexion.close().catch(() => {});
  }
  estado.conectado = false;
}

module.exports = { conectar, publicar, registrarAlConectar, estaConectado, cerrar };
