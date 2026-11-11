const { Op, UniqueConstraintError } = require('sequelize');
const { Inscripcion } = require('../models');
const cursosClient = require('./cursosClient');
const publicador = require('../messaging/publicador');
const { datosInvalidos, noEncontrado, conflicto, prohibido } = require('../utils/errores');
const { esUuid } = require('../utils/formato');

const VIGENTES = ['PENDIENTE', 'ACTIVA'];

const yaInscrito = () => conflicto('YA_INSCRITO', 'Ya tienes una inscripción vigente en este curso');

// Un estudiante puede volver a inscribirse si la anterior quedó CANCELADA, RECHAZADA o FINALIZADA.
async function crear(estudianteId, cursoId) {
  if (!esUuid(cursoId)) {
    throw datosInvalidos('El cursoId es obligatorio y debe ser un UUID');
  }

  const vigente = await Inscripcion.findOne({
    where: { usuario_id: estudianteId, curso_id: cursoId, estado: { [Op.in]: VIGENTES } },
  });
  if (vigente) throw yaInscrito();

  // Si ms-cursos no responde, cursosClient lanza 503 y no se guarda nada.
  const curso = await cursosClient.validarCurso(cursoId);
  if (!curso.existe) {
    throw noEncontrado(`No existe el curso ${cursoId}`);
  }
  if (!curso.inscribible) {
    if (typeof curso.cuposDisponibles === 'number' && curso.cuposDisponibles <= 0) {
      throw conflicto('CUPO_AGOTADO', `El curso ${curso.codigo || cursoId} no tiene cupos disponibles`);
    }
    throw conflicto('CURSO_NO_DISPONIBLE', `El curso ${curso.codigo || cursoId} no acepta inscripciones en este momento`);
  }

  let inscripcion;
  try {
    inscripcion = await Inscripcion.create({
      usuario_id: estudianteId,
      curso_id: cursoId,
      estado: 'PENDIENTE',
    });
  } catch (error) {
    // Dos peticiones al mismo tiempo: el índice único deja pasar solo una.
    if (error instanceof UniqueConstraintError) throw yaInscrito();
    throw error;
  }

  publicador.publicarInscripcionCreada(inscripcion);
  return inscripcion.aJson();
}

async function misInscripciones(estudianteId) {
  const lista = await Inscripcion.findAll({
    where: { usuario_id: estudianteId },
    order: [['createdAt', 'DESC']],
  });
  return lista.map((i) => i.aJson());
}

async function inscritosDeCurso(cursoId) {
  if (!esUuid(cursoId)) throw datosInvalidos('El cursoId debe ser un UUID');
  const lista = await Inscripcion.findAll({
    where: { curso_id: cursoId },
    order: [['createdAt', 'ASC']],
  });
  return lista.map((i) => i.aJson());
}

// Solo el dueño de la inscripción o un administrador.
async function buscarPermitida(id, usuario) {
  if (!esUuid(id)) throw datosInvalidos('El id debe ser un UUID');
  const inscripcion = await Inscripcion.findByPk(id);
  if (!inscripcion) throw noEncontrado(`No existe la inscripción ${id}`);
  if (usuario.rol !== 'ADMINISTRADOR' && inscripcion.usuario_id !== usuario.id) {
    throw prohibido('Esta inscripción no es tuya');
  }
  return inscripcion;
}

async function obtener(id, usuario) {
  const inscripcion = await buscarPermitida(id, usuario);
  return inscripcion.aJson();
}

async function cancelar(id, usuario) {
  const inscripcion = await buscarPermitida(id, usuario);
  if (!VIGENTES.includes(inscripcion.estado)) {
    throw conflicto('TRANSICION_INVALIDA', `No se puede cancelar una inscripción en estado ${inscripcion.estado}`);
  }
  inscripcion.estado = 'CANCELADA';
  await inscripcion.save();
  publicador.publicarInscripcionCancelada(inscripcion);
  return inscripcion.aJson();
}

module.exports = { crear, misInscripciones, inscritosDeCurso, obtener, cancelar };
