const config = require('../config/env');
const rabbit = require('./rabbit');
const { sequelize, Inscripcion, EventoProcesado } = require('../models');
const { esUuid } = require('../utils/formato');

// Nombres de integracion.md sección 6.1
const COLA = 'lms.usuarios.inscripciones.queue';
const DLX = 'lms.usuarios.dlx';
const DLQ = 'lms.usuarios.dlq';
const ROUTING_KEYS = ['acceso.habilitado', 'inscripcion.rechazada', 'cursos.evento.estado'];

const MOTIVOS_RECHAZO = ['CUPO_AGOTADO', 'CURSO_NO_DISPONIBLE', 'CURSO_NO_EXISTE'];

class EventoInvalido extends Error {}

function exigirUuid(evento, campo) {
  if (!esUuid(evento[campo])) {
    throw new EventoInvalido(`El campo ${campo} falta o no es un UUID`);
  }
}

// Cada routing key: qué campos son obligatorios y qué se hace con el evento.
const manejadores = {
  'acceso.habilitado': {
    validar(evento) {
      exigirUuid(evento, 'inscripcionId');
    },
    async aplicar(evento, transaccion) {
      const inscripcion = await Inscripcion.findByPk(evento.inscripcionId, { transaction: transaccion });
      if (!inscripcion) return `la inscripción ${evento.inscripcionId} no existe, se ignora`;
      if (inscripcion.estado !== 'PENDIENTE') {
        return `la inscripción ${inscripcion.id} está ${inscripcion.estado}, no cambia`;
      }
      inscripcion.estado = 'ACTIVA';
      await inscripcion.save({ transaction: transaccion });
      return `inscripción ${inscripcion.id} pasa a ACTIVA`;
    },
  },

  'inscripcion.rechazada': {
    validar(evento) {
      exigirUuid(evento, 'inscripcionId');
      if (!MOTIVOS_RECHAZO.includes(evento.motivo)) {
        throw new EventoInvalido(`El motivo debe ser uno de: ${MOTIVOS_RECHAZO.join(', ')}`);
      }
    },
    async aplicar(evento, transaccion) {
      const inscripcion = await Inscripcion.findByPk(evento.inscripcionId, { transaction: transaccion });
      if (!inscripcion) return `la inscripción ${evento.inscripcionId} no existe, se ignora`;
      if (inscripcion.estado !== 'PENDIENTE') {
        return `la inscripción ${inscripcion.id} está ${inscripcion.estado}, no cambia`;
      }
      inscripcion.estado = 'RECHAZADA';
      inscripcion.motivo_rechazo = evento.motivo;
      await inscripcion.save({ transaction: transaccion });
      return `inscripción ${inscripcion.id} pasa a RECHAZADA (${evento.motivo})`;
    },
  },

  'cursos.evento.estado': {
    validar(evento) {
      exigirUuid(evento, 'cursoId');
      if (typeof evento.estado !== 'string') {
        throw new EventoInvalido('Falta el campo estado');
      }
    },
    async aplicar(evento, transaccion) {
      if (evento.estado !== 'FINALIZADO') {
        return `curso ${evento.cursoId} en estado ${evento.estado}, no afecta a las inscripciones`;
      }
      const [cantidad] = await Inscripcion.update(
        { estado: 'FINALIZADA' },
        { where: { curso_id: evento.cursoId, estado: 'ACTIVA' }, transaction: transaccion }
      );
      return `curso ${evento.cursoId} finalizado: ${cantidad} inscripciones pasan a FINALIZADA`;
    },
  },
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Procesa un mensaje. Devuelve 'ack', 'dlq' o 'reintentar' (sirve también para las pruebas).
async function procesarMensaje(canal, mensaje) {
  const rk = mensaje.fields.routingKey;
  try {
    const manejador = manejadores[rk];
    if (!manejador) throw new EventoInvalido(`Routing key no esperada: ${rk}`);

    const evento = JSON.parse(mensaje.content.toString());
    if (!evento || typeof evento !== 'object') throw new EventoInvalido('El mensaje no es un objeto JSON');
    exigirUuid(evento, 'eventoId');
    manejador.validar(evento);

    let resultado;
    await sequelize.transaction(async (transaccion) => {
      const yaProcesado = await EventoProcesado.findByPk(evento.eventoId, { transaction: transaccion });
      if (yaProcesado) {
        resultado = `evento ${evento.eventoId} ya procesado, se ignora`;
        return;
      }
      resultado = await manejador.aplicar(evento, transaccion);
      await EventoProcesado.create(
        { evento_id: evento.eventoId, tipo_evento: evento.tipoEvento || rk },
        { transaction: transaccion }
      );
    });

    console.log(`[consumidor] ${rk}: ${resultado}`);
    canal.ack(mensaje);
    return 'ack';
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof EventoInvalido) {
      console.error(`[consumidor] ${rk}: mensaje inválido, va a ${DLQ}: ${error.message}`);
      canal.nack(mensaje, false, false);
      return 'dlq';
    }
    // Error temporal (por ejemplo la base de datos caída): vuelve a la cola.
    console.error(`[consumidor] ${rk}: error temporal, se reintentará: ${error.message}`);
    await esperar(2000);
    canal.nack(mensaje, false, true);
    return 'reintentar';
  }
}

async function configurarConsumidor(canal) {
  await canal.assertExchange(DLX, 'fanout', { durable: true });
  await canal.assertQueue(DLQ, { durable: true });
  await canal.bindQueue(DLQ, DLX, '');
  await canal.assertQueue(COLA, { durable: true, deadLetterExchange: DLX });
  for (const rk of ROUTING_KEYS) {
    await canal.bindQueue(COLA, config.rabbit.exchange, rk);
  }
  await canal.prefetch(1);
  await canal.consume(COLA, (mensaje) => {
    if (!mensaje) return;
    procesarMensaje(canal, mensaje).catch((e) => console.error('[consumidor] Error inesperado:', e));
  });
  console.log(`[consumidor] Escuchando ${COLA} (${ROUTING_KEYS.join(', ')})`);
}

function iniciarConsumidor() {
  rabbit.registrarAlConectar(configurarConsumidor);
}

module.exports = { iniciarConsumidor, procesarMensaje, COLA, DLQ, ROUTING_KEYS };
