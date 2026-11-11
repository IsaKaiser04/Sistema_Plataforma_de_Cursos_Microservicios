const { EventoInvalido } = require("../lib/validacion");
const { sleep } = require("../lib/util");
const { manejadorPara } = require("../handlers");
const { enTransaccion } = require("../db/pool");

const QUEUE = "lms.notificaciones.queue";
const DLX = "lms.notificaciones.dlx"; // mensajes inválidos terminan aquí
const DLQ = "lms.notificaciones.dlq";

// Eventos que escucha el servicio (contrato del grupo, integracion.md)
const ROUTING_KEYS = [
  "inscripcion.#", // creada, rechazada, cancelada
  "acceso.habilitado", // ms-cursos: bienvenida
  "cursos.evento.#", // ms-cursos: creado, actualizado, estado, cupo, eliminado
  "evaluacion.#", // ms-evaluaciones: publicada, calificada
  "nota.final.calculada", // ms-evaluaciones: dispara el certificado
];
// Binding de la v1 que ya no corresponde: el certificado ahora nace aquí
const BINDINGS_OBSOLETOS = ["certificado.emitido"];

// Errores de PostgreSQL por datos (clase 22) o restricciones (23): no se reintentan
const esErrorDeDatos = (e) => typeof e.code === "string" && /^(22|23)/.test(e.code);
const esPermanente = (e) =>
  e instanceof SyntaxError || e instanceof EventoInvalido || esErrorDeDatos(e);

function leerEvento(msg) {
  const evento = JSON.parse(msg.content.toString());
  if (!evento || typeof evento !== "object" || Array.isArray(evento)) {
    throw new EventoInvalido("El cuerpo no es un objeto JSON");
  }
  return evento;
}

async function procesarMensaje(ch, msg) {
  if (!msg) return; // el broker canceló el consumidor
  const rk = msg.fields.routingKey;
  try {
    const evento = leerEvento(msg);
    const manejador = manejadorPara(rk);
    if (!manejador) {
      ch.ack(msg);
      return;
    }
    const resultado = await enTransaccion((db) => manejador(db, evento, rk));
    console.log(`[${rk}] ${resultado}`);
    ch.ack(msg);
  } catch (e) {
    if (esPermanente(e)) {
      console.log(`[${rk}] Evento inválido, enviado a ${DLQ}: ${e.message}`);
      ch.nack(msg, false, false); // va a la dead-letter queue
    } else {
      console.log(`[${rk}] Error temporal, se reintentará: ${e.message}`);
      await sleep(2000);
      ch.nack(msg, false, true);
    }
  }
}

async function configurarCola(ch, exchange) {
  await ch.assertExchange(exchange, "topic", { durable: true });
  await ch.assertExchange(DLX, "fanout", { durable: true });
  await ch.assertQueue(DLQ, { durable: true });
  await ch.bindQueue(DLQ, DLX, "");
  await ch.assertQueue(QUEUE, { durable: true, deadLetterExchange: DLX });
  for (const rk of BINDINGS_OBSOLETOS) await ch.unbindQueue(QUEUE, exchange, rk);
  for (const rk of ROUTING_KEYS) await ch.bindQueue(QUEUE, exchange, rk);
}

module.exports = { procesarMensaje, configurarCola, esPermanente, QUEUE, DLQ, ROUTING_KEYS };
