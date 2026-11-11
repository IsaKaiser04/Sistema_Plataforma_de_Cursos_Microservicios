const request = require('supertest');
const { randomUUID } = require('crypto');
const app = require('../src/app');
const { sequelize, Inscripcion } = require('../src/models');
const { crearUsuario } = require('../src/services/authService');
const { procesarMensaje } = require('../src/messaging/consumidor');
const {
  iniciarCursosSimulado, CURSO_CON_CUPO, CURSO_SIN_CUPO, CURSO_BORRADOR,
} = require('./cursosSimulado');

const cabeceras = (usuario) => ({ 'X-User-Id': usuario.id, 'X-User-Rol': usuario.rol });

// Canal falso de RabbitMQ para probar el consumidor sin broker
function canalFalso() {
  return { ack: jest.fn(), nack: jest.fn() };
}
function mensaje(routingKey, cuerpo) {
  const contenido = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
  return { fields: { routingKey }, content: Buffer.from(contenido) };
}

let servidorCursos;
let estudiante;
let otroEstudiante;
let docente;

beforeAll(async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  servidorCursos = await iniciarCursosSimulado();
  await sequelize.sync({ force: true });
  estudiante = await crearUsuario({ nombres: 'Ana', apellidos: 'Torres', email: 'ana@test.ec', password: 'clave123' }, 'ESTUDIANTE');
  otroEstudiante = await crearUsuario({ nombres: 'Luis', apellidos: 'Paz', email: 'luis@test.ec', password: 'clave123' }, 'ESTUDIANTE');
  docente = await crearUsuario({ nombres: 'Carlos', apellidos: 'Mora', email: 'carlos@test.ec', password: 'clave123' }, 'DOCENTE');
});

afterAll(async () => {
  servidorCursos.close();
  await sequelize.close();
});

const inscribir = (usuario, cursoId) =>
  request(app).post('/api/v1/inscripciones').set(cabeceras(usuario)).send({ cursoId });

describe('Inscripciones por HTTP', () => {
  let inscripcion;

  test('se crea en estado PENDIENTE aunque RabbitMQ no esté', async () => {
    const res = await inscribir(estudiante, CURSO_CON_CUPO);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({
      cursoId: CURSO_CON_CUPO, estudianteId: estudiante.id, estado: 'PENDIENTE',
    }));
    expect(res.body.fechaInscripcion).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    inscripcion = res.body;
  });

  test('inscribirse dos veces al mismo curso devuelve 409', async () => {
    const res = await inscribir(estudiante, CURSO_CON_CUPO);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('YA_INSCRITO');
  });

  test('curso sin cupo devuelve 409 CUPO_AGOTADO y no guarda nada', async () => {
    const res = await inscribir(estudiante, CURSO_SIN_CUPO);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CUPO_AGOTADO');
    expect(await Inscripcion.count({ where: { curso_id: CURSO_SIN_CUPO } })).toBe(0);
  });

  test('curso en borrador devuelve 409 CURSO_NO_DISPONIBLE', async () => {
    const res = await inscribir(estudiante, CURSO_BORRADOR);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CURSO_NO_DISPONIBLE');
  });

  test('curso que no existe devuelve 404', async () => {
    const res = await inscribir(estudiante, randomUUID());
    expect(res.status).toBe(404);
  });

  test('un docente no puede inscribirse (403)', async () => {
    const res = await inscribir(docente, CURSO_CON_CUPO);
    expect(res.status).toBe(403);
  });

  test('otro estudiante no puede ver una inscripción ajena (403)', async () => {
    const res = await request(app).get(`/api/v1/inscripciones/${inscripcion.id}`).set(cabeceras(otroEstudiante));
    expect(res.status).toBe(403);
  });

  test('el docente ve los inscritos del curso', async () => {
    const res = await request(app).get(`/api/v1/inscripciones/curso/${CURSO_CON_CUPO}`).set(cabeceras(docente));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('cancelar y volver a inscribirse', async () => {
    const cancelada = await request(app).patch(`/api/v1/inscripciones/${inscripcion.id}/cancelar`).set(cabeceras(estudiante));
    expect(cancelada.status).toBe(200);
    expect(cancelada.body.estado).toBe('CANCELADA');

    const otraVez = await request(app).patch(`/api/v1/inscripciones/${inscripcion.id}/cancelar`).set(cabeceras(estudiante));
    expect(otraVez.status).toBe(409);
    expect(otraVez.body.error).toBe('TRANSICION_INVALIDA');

    const nueva = await inscribir(estudiante, CURSO_CON_CUPO);
    expect(nueva.status).toBe(201);
  });

  test('si ms-cursos no responde devuelve 503 y no guarda nada', async () => {
    servidorCursos.close();
    const antes = await Inscripcion.count();
    const res = await inscribir(otroEstudiante, CURSO_CON_CUPO);
    expect(res.status).toBe(503);
    expect(res.body.error).toBe('SERVICIO_NO_DISPONIBLE');
    expect(await Inscripcion.count()).toBe(antes);
    servidorCursos = await iniciarCursosSimulado();
  });
});

describe('Cambio de estado por eventos', () => {
  let inscripcion;

  beforeAll(async () => {
    inscripcion = await Inscripcion.create({ usuario_id: otroEstudiante.id, curso_id: CURSO_CON_CUPO });
  });

  test('acceso.habilitado pasa la inscripción a ACTIVA y el duplicado se ignora', async () => {
    const evento = {
      eventoId: randomUUID(), tipoEvento: 'AccesoHabilitado', inscripcionId: inscripcion.id,
      cursoId: CURSO_CON_CUPO, estudianteId: otroEstudiante.id, fechaEvento: '2026-11-10T10:00:01',
    };
    const canal = canalFalso();
    expect(await procesarMensaje(canal, mensaje('acceso.habilitado', evento))).toBe('ack');
    await inscripcion.reload();
    expect(inscripcion.estado).toBe('ACTIVA');

    // Mismo eventoId otra vez: se confirma sin hacer nada
    expect(await procesarMensaje(canal, mensaje('acceso.habilitado', evento))).toBe('ack');
    expect(canal.ack).toHaveBeenCalledTimes(2);
  });

  test('cursos.evento.estado FINALIZADO pasa las activas a FINALIZADA', async () => {
    const canal = canalFalso();
    await procesarMensaje(canal, mensaje('cursos.evento.estado', {
      eventoId: randomUUID(), tipoEvento: 'EstadoCursoCambiado', cursoId: CURSO_CON_CUPO, estado: 'FINALIZADO',
    }));
    await inscripcion.reload();
    expect(inscripcion.estado).toBe('FINALIZADA');
  });

  test('inscripcion.rechazada pasa a RECHAZADA y guarda el motivo', async () => {
    const pendiente = await Inscripcion.create({ usuario_id: otroEstudiante.id, curso_id: CURSO_SIN_CUPO });
    const canal = canalFalso();
    await procesarMensaje(canal, mensaje('inscripcion.rechazada', {
      eventoId: randomUUID(), tipoEvento: 'InscripcionRechazada', inscripcionId: pendiente.id,
      cursoId: CURSO_SIN_CUPO, estudianteId: otroEstudiante.id, motivo: 'CUPO_AGOTADO',
    }));
    await pendiente.reload();
    expect(pendiente.estado).toBe('RECHAZADA');
    expect(pendiente.motivo_rechazo).toBe('CUPO_AGOTADO');
  });

  test('un mensaje mal formado va a la cola de errores sin reintentar', async () => {
    const canal = canalFalso();
    expect(await procesarMensaje(canal, mensaje('inscripcion.rechazada', '{roto'))).toBe('dlq');
    expect(await procesarMensaje(canal, mensaje('acceso.habilitado', { eventoId: 'no-es-uuid' }))).toBe('dlq');
    expect(canal.nack).toHaveBeenCalledWith(expect.anything(), false, false);
  });
});
