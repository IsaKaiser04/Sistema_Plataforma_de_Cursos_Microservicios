const { randomUUID } = require('crypto');
const rabbit = require('./rabbit');
const { fechaEcuador } = require('../utils/formato');

// Payload de integracion.md sección 6.5
function payloadInscripcion(inscripcion, tipoEvento) {
  return {
    eventoId: randomUUID(),
    tipoEvento,
    inscripcionId: inscripcion.id,
    cursoId: inscripcion.curso_id,
    estudianteId: inscripcion.usuario_id,
    estadoInscripcion: inscripcion.estado,
    fechaInscripcion: fechaEcuador(inscripcion.createdAt),
    fechaEvento: fechaEcuador(),
  };
}

// Si RabbitMQ no está, la inscripción ya quedó guardada: solo se registra el error (I8).
function publicarSinFallar(routingKey, payload) {
  try {
    rabbit.publicar(routingKey, payload);
    console.log(`[publicador] ${routingKey} enviado (inscripción ${payload.inscripcionId})`);
    return true;
  } catch (error) {
    console.error(`[publicador] No se pudo publicar ${routingKey} de la inscripción ${payload.inscripcionId}: ${error.message}`);
    return false;
  }
}

const publicarInscripcionCreada = (inscripcion) =>
  publicarSinFallar('inscripcion.creada', payloadInscripcion(inscripcion, 'InscripcionCreada'));

const publicarInscripcionCancelada = (inscripcion) =>
  publicarSinFallar('inscripcion.cancelada', payloadInscripcion(inscripcion, 'InscripcionCancelada'));

module.exports = { publicarInscripcionCreada, publicarInscripcionCancelada, payloadInscripcion };
