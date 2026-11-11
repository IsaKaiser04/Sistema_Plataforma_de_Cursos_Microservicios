const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { sequelize, Usuario } = require('../src/models');
const { crearUsuario } = require('../src/services/authService');

const cabeceras = (usuario) => ({ 'X-User-Id': usuario.id, 'X-User-Rol': usuario.rol });

let admin;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  admin = await crearUsuario(
    { nombres: 'Admin', apellidos: 'Pruebas', email: 'admin@test.ec', password: 'clave123' },
    'ADMINISTRADOR'
  );
});

afterAll(async () => {
  await sequelize.close();
});

describe('Registro y login', () => {
  test('registrar con rol ADMINISTRADOR en el body crea un ESTUDIANTE', async () => {
    const res = await request(app).post('/api/v1/auth/registro').send({
      nombres: 'Ana', apellidos: 'Torres', email: 'ana@test.ec', password: 'clave123', rol: 'ADMINISTRADOR',
    });
    expect(res.status).toBe(201);
    expect(res.body.rol).toBe('ESTUDIANTE');
    expect(res.body.password).toBeUndefined();
  });

  test('no permite registrar dos veces el mismo email', async () => {
    const res = await request(app).post('/api/v1/auth/registro').send({
      nombres: 'Ana', apellidos: 'Torres', email: 'ANA@test.ec', password: 'clave123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('DATOS_INVALIDOS');
  });

  test('login devuelve token con id, email y rol', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'ana@test.ec', password: 'clave123' });
    expect(res.status).toBe(200);
    expect(res.body.usuario).toEqual(expect.objectContaining({ email: 'ana@test.ec', nombres: 'Ana', rol: 'ESTUDIANTE' }));
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload).toEqual(expect.objectContaining({ id: res.body.usuario.id, email: 'ana@test.ec', rol: 'ESTUDIANTE' }));
  });

  test('login con contraseña incorrecta da 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'ana@test.ec', password: 'otra' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('NO_AUTENTICADO');
  });

  test('un usuario desactivado no puede iniciar sesión', async () => {
    const usuario = await crearUsuario(
      { nombres: 'Luis', apellidos: 'Paz', email: 'luis@test.ec', password: 'clave123' }, 'ESTUDIANTE'
    );
    await request(app).patch(`/api/v1/usuarios/${usuario.id}/estado`).set(cabeceras(admin)).send({ activo: false });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'luis@test.ec', password: 'clave123' });
    expect(res.status).toBe(403);
  });
});

describe('Cabeceras y permisos', () => {
  test('sin cabeceras devuelve 401 con el formato de error común', async () => {
    const res = await request(app).get('/api/v1/usuarios/me');
    expect(res.status).toBe(401);
    expect(Object.keys(res.body).sort()).toEqual(['error', 'mensaje', 'ruta', 'status', 'timestamp']);
    expect(res.body.ruta).toBe('/api/v1/usuarios/me');
  });

  test('un estudiante no puede crear usuarios (403)', async () => {
    const estudiante = await Usuario.findOne({ where: { email: 'ana@test.ec' } });
    const res = await request(app).post('/api/v1/usuarios').set(cabeceras(estudiante)).send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PROHIBIDO');
  });
});

describe('Gestión de usuarios y docentes', () => {
  let docente;

  test('el administrador crea un docente', async () => {
    const res = await request(app).post('/api/v1/usuarios').set(cabeceras(admin)).send({
      nombres: 'Carlos', apellidos: 'Mora', email: 'carlos@test.ec', password: 'clave123', rol: 'DOCENTE',
    });
    expect(res.status).toBe(201);
    expect(res.body.rol).toBe('DOCENTE');
    docente = res.body;
  });

  test('el endpoint de docentes responde solo los cuatro campos de DocenteExternoDto', async () => {
    const res = await request(app).get(`/api/v1/usuarios/docentes/${docente.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: docente.id, nombreCompleto: 'Carlos Mora', correo: 'carlos@test.ec', activo: true,
    });
  });

  test('pedir como docente a un estudiante devuelve 404', async () => {
    const estudiante = await Usuario.findOne({ where: { email: 'ana@test.ec' } });
    const res = await request(app).get(`/api/v1/usuarios/docentes/${estudiante.id}`);
    expect(res.status).toBe(404);
  });

  test('listar usuarios por rol', async () => {
    const res = await request(app).get('/api/v1/usuarios?rol=DOCENTE').set(cabeceras(admin));
    expect(res.status).toBe(200);
    expect(res.body.map((u) => u.email)).toEqual(['carlos@test.ec']);
  });
});
