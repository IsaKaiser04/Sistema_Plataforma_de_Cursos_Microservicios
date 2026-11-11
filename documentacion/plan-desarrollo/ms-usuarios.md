# Plan de desarrollo: ms-usuarios

| Dato | Valor |
|---|---|
| Responsable | Isauro Rivera |
| Carpeta | `ms-usuarios/` |
| Rama de trabajo | `feature/ms-usuarios-<tema>` desde `develop` |
| Tecnología actual | Node.js 18, Express 4, Sequelize 6, PostgreSQL, bcryptjs, jsonwebtoken, amqplib |
| Puerto | 3004 |
| Base de datos | `usuarios_db` |
| Depende de | ms-cursos (HTTP), RabbitMQ |
| Lo usan | api-gateway, ms-cursos (valida docentes) |

## 1. Reglas para el agente

Además de las reglas del `README.md`:

- Este servicio es el único que crea tokens JWT. No valida tokens en las rutas: confía en las cabeceras `X-User-Id` y `X-User-Rol` que pone el gateway (ver `integracion.md`, sección 4).
- Las inscripciones se quedan dentro de este servicio como un módulo aparte (`routes/inscripcionRoutes.js`, `controllers/inscripcionController.js`, etc.). No las mezcles con el código de autenticación.
- No crees un ms-inscripciones nuevo.

## 2. Qué hay hoy y qué se conserva

Funciona y se conserva:
- `POST /api/auth/registro` y `POST /api/auth/login` con bcrypt y JWT de 24 horas.
- Modelos `Usuario` (id, email, password, rol) e `Inscripcion` (id, usuario_id, curso_id, estado).
- Conexión a PostgreSQL con Sequelize y `sync({ alter: true })`.

Está roto o incompleto:
- `inscripcionRoutes.js` importa `inscribirEstudiante` y `listarInscritosPorCurso`, pero el controlador solo exporta `crearInscripcion`.
- Importa `../middlewares/authMiddleware`, que no existe.
- Las rutas de inscripción no están montadas en `src/index.js`.
- No publica eventos aunque `amqplib` está instalado.
- No existe el rol docente.
- El registro acepta `rol` en el body, así que cualquiera puede registrarse como administrador.
- `package.json` se llama `ms-inscripciones`.

## 3. Tareas

Cada tarea se termina con su criterio de aceptación probado.

- [x] **T1. Ordenar la base del servicio.** Renombrar el paquete a `ms-usuarios`, agregar `.env.example` y `.gitignore`, crear la estructura `src/routes`, `src/controllers`, `src/services`, `src/models`, `src/middlewares`, `src/messaging`, `src/config`. Agregar el formato de error común de `integracion.md` sección 5.
  Aceptación: el servicio arranca con `npm start` usando solo variables de `.env`.

- [x] **T2. Ajustar el modelo Usuario.** Agregar `nombres`, `apellidos`, `activo` y el rol de docente, con los nombres de rol que se elijan en la pregunta P2.
  Aceptación: la tabla `usuarios` tiene las columnas nuevas y los usuarios existentes no se pierden.

- [x] **T3. Middleware de usuario.** Middleware que lee `X-User-Id` y `X-User-Rol`, los pone en `req.usuario` y responde 401 si faltan. Otro middleware `permitirRoles([...])` que responde 403 si el rol no está en la lista.
  Aceptación: una petición sin cabeceras a una ruta protegida devuelve 401 con el formato de error común.

- [x] **T4. Autenticación.** Mover las rutas a `/api/v1/auth` (según P1). En el registro público ignorar `rol` y crear siempre estudiante. Bloquear el login de usuarios con `activo = false`. Agregar `email` al payload del JWT.
  Aceptación: registrar con `rol: ADMINISTRADOR` en el body crea un estudiante.

- [x] **T5. Gestión de usuarios.** `GET /api/v1/usuarios/me`, `GET /api/v1/usuarios?rol=`, `POST /api/v1/usuarios` (solo administrador, crea docentes o administradores), `PATCH /api/v1/usuarios/{id}/estado`.
  Aceptación: un estudiante que llama a `POST /api/v1/usuarios` recibe 403.

- [x] **T6. Endpoint de docentes para ms-cursos.** `GET /api/v1/usuarios/docentes/{id}` que responde exactamente `{ id, nombreCompleto, correo, activo }` (es el `DocenteExternoDto` de ms-cursos). 404 si no existe o no es docente.
  Aceptación: con un docente creado en T5, la respuesta tiene esos cuatro campos y nada más.

- [x] **T7. Inscripciones por HTTP.** Arreglar rutas y controlador. Endpoints: `POST /api/v1/inscripciones` (estudiante), `GET /api/v1/inscripciones/mias`, `GET /api/v1/inscripciones/curso/{cursoId}` (docente y administrador), `GET /api/v1/inscripciones/{id}`, `PATCH /api/v1/inscripciones/{id}/cancelar`. Antes de crear, llamar a `GET {CURSOS_URL}/api/v1/cursos/{cursoId}/validar` con el tiempo límite de P5: si `existe` es false devuelve 404, si `inscribible` es false devuelve 409, si ms-cursos no responde devuelve 503 y no guarda nada. La inscripción se guarda en estado `PENDIENTE`.
  Aceptación: inscribirse dos veces al mismo curso devuelve 409 la segunda vez.

- [x] **T8. Publicar eventos.** Publicador AMQP en `src/messaging` conectado a `lms.eventos.exchange`. Publicar `inscripcion.creada` al crear e `inscripcion.cancelada` al cancelar, con los payloads de `integracion.md` sección 6. Si RabbitMQ no está, la inscripción igual se guarda y se registra el error en el log.
  Aceptación: con el panel de RabbitMQ abierto, al inscribirse llega el mensaje a `lms.cursos.inscripciones.queue`.

- [x] **T9. Consumir eventos.** Cola `lms.usuarios.inscripciones.queue` enlazada a `acceso.habilitado`, `inscripcion.rechazada` y `cursos.evento.estado`. `acceso.habilitado` pasa la inscripción a `ACTIVA`; `inscripcion.rechazada` la pasa a `RECHAZADA` y guarda el motivo; `cursos.evento.estado` con `FINALIZADO` pasa las activas de ese curso a `FINALIZADA`. Idempotencia por `eventoId` y mensajes inválidos a `lms.usuarios.dlq`.
  Aceptación: con el simulador de ms-cursos o publicando desde el panel, la inscripción cambia de estado.

- [ ] **T10. Health y Docker.** `GET /api/v1/health` con estado de BD y RabbitMQ (503 si alguno falla). `Dockerfile` y `docker-compose.local.yml` para levantarlo solo con su base y RabbitMQ.
  Aceptación: `docker compose -f docker-compose.local.yml up -d --build` levanta el servicio y `/api/v1/health` responde 200.

- [x] **T11. Pruebas.** Según P8. Como mínimo: registro, login, inscripción duplicada, inscripción con curso sin cupo (ms-cursos simulado) y cambio de estado por evento.

## 4. Cuestionario del desarrollador

Responde debajo de cada pregunta. Si eliges la recomendada, escribe "recomendada".

**P1. ¿Las rutas pasan de `/api/auth` a `/api/v1/auth`?**
Recomendada: sí, para que todos los servicios usen `/api/v1/`. El gateway se ajusta igual.
Respuesta: recomendada

**P2. ¿Cómo se escriben los roles?**
Recomendada: `ADMINISTRADOR`, `DOCENTE`, `ESTUDIANTE`, en mayúsculas como las demás enumeraciones. Hoy son `Administrador` y `Estudiante`.
Respuesta: recomendada

**P3. ¿Se crea una capa `services/` entre controladores y modelos?**
Recomendada: sí. El controlador solo lee la petición y responde; la lógica (validar con ms-cursos, publicar el evento) va en el servicio. Así se puede probar sin Express.
Respuesta: recomendada

**P4. ¿Cómo se manejan los cambios de tablas?**
Recomendada: seguir con `sequelize.sync({ alter: true })` por el alcance del proyecto. Alternativa: migraciones con `sequelize-cli`.
Respuesta: recomendada. Antes del sync se renombran los valores viejos de los ENUM (`Administrador` → `ADMINISTRADOR`, `Estudiante` → `ESTUDIANTE`) con `ALTER TYPE ... RENAME VALUE`, para no perder los usuarios que ya existían.

**P5. Tiempo límite para la llamada a ms-cursos al validar el curso.**
Recomendada: 3 segundos, sin reintentos.
Respuesta: recomendada

**P6. ¿Con qué librería se llama a ms-cursos?**
Recomendada: `fetch` nativo de Node 18 con `AbortController` para el tiempo límite, sin dependencias nuevas. Alternativa: axios.
Respuesta: recomendada

**P7. ¿Se guardan los `eventoId` procesados en una tabla `eventos_procesados` para la idempotencia?**
Recomendada: sí, tabla con `evento_id` como clave primaria.
Respuesta: recomendada

**P8. ¿Con qué se hacen las pruebas?**
Recomendada: Jest + Supertest para los endpoints, y una colección de Postman para las evidencias del informe.
Respuesta: recomendada

**P9. ¿Se crea un administrador inicial al arrancar el servicio?**
Recomendada: sí, con email y contraseña tomados de variables de entorno (`ADMIN_EMAIL`, `ADMIN_PASSWORD`), solo si no existe ninguno.
Respuesta: recomendada

**P10. ¿Algo que quieras hacer distinto a lo que dice este plan?**
Respuesta: Dos cosas. (1) Un estudiante puede volver a inscribirse en un curso si su inscripción anterior quedó CANCELADA, RECHAZADA o FINALIZADA; el 409 `YA_INSCRITO` es solo cuando ya tiene una PENDIENTE o ACTIVA. (2) En `GET /api/v1/inscripciones/curso/{cursoId}` cualquier docente puede ver los inscritos, porque este servicio no sabe quién es el docente del curso. Si se quiere que sea solo el dueño, `/validar` de ms-cursos tendría que devolver `docenteId` (está en las notas de abajo).

## 5. Contrato de este servicio

Lo que este servicio expone y usa. Si algo choca con `integracion.md`, manda `integracion.md`.

| Método | Ruta | Rol |
|---|---|---|
| POST | `/api/v1/auth/registro` | público |
| POST | `/api/v1/auth/login` | público |
| GET | `/api/v1/usuarios/me` | cualquiera |
| GET | `/api/v1/usuarios?rol=` | ADMINISTRADOR |
| POST | `/api/v1/usuarios` | ADMINISTRADOR |
| PATCH | `/api/v1/usuarios/{id}/estado` | ADMINISTRADOR |
| GET | `/api/v1/usuarios/docentes/{id}` | interno |
| POST | `/api/v1/inscripciones` | ESTUDIANTE |
| GET | `/api/v1/inscripciones/mias` | ESTUDIANTE |
| GET | `/api/v1/inscripciones/curso/{cursoId}` | DOCENTE, ADMINISTRADOR |
| GET | `/api/v1/inscripciones/{id}` | dueño, ADMINISTRADOR |
| PATCH | `/api/v1/inscripciones/{id}/cancelar` | dueño, ADMINISTRADOR |
| GET | `/api/v1/health` | interno |

Respuesta de login:

```json
{
  "token": "eyJhbGciOi...",
  "usuario": { "id": "UUID", "email": "ana@unl.edu.ec", "nombres": "Ana", "apellidos": "Torres", "rol": "ESTUDIANTE" }
}
```

Respuesta de inscripción:

```json
{ "id": "UUID", "cursoId": "UUID", "estudianteId": "UUID", "estado": "PENDIENTE", "fechaInscripcion": "2026-11-10T10:00:00" }
```

Estados de inscripción: `PENDIENTE`, `ACTIVA`, `RECHAZADA`, `CANCELADA`, `FINALIZADA`.

Eventos: publica `inscripcion.creada` e `inscripcion.cancelada`; consume `acceso.habilitado`, `inscripcion.rechazada` y `cursos.evento.estado`. Payloads en `integracion.md` sección 6.

Variables de entorno:

| Variable | Ejemplo |
|---|---|
| `PORT` | `3004` |
| `DB_HOST`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | `db_usuarios`, `usuarios_db`, `admin`, `password` |
| `JWT_SECRET` | el mismo del gateway |
| `RABBIT_URL` | `amqp://lms:lms123@rabbitmq:5672` |
| `RABBIT_EXCHANGE` | `lms.eventos.exchange` |
| `CURSOS_URL` | `http://ms-cursos:8081` |

## 6. Fuera de alcance

No hacer en este servicio: recuperar contraseña por correo, refresh tokens, login con Google, pagos, subida de foto de perfil, validar el JWT en cada ruta (lo hace el gateway).

## 7. Terminado cuando

- Todas las tareas marcadas y sus criterios probados.
- Una inscripción creada aquí llega a `ACTIVA` con ms-cursos real.
- El README del servicio lista endpoints, eventos y variables.

## 8. Notas para otros servicios

(El agente escribe aquí lo que encontró que otro servicio tiene que cambiar.)

- api-gateway: las rutas pasaron de `/api/auth` a `/api/v1/auth` (P1). El proxy actual de `src/index.js` todavía apunta a `/api/auth`, así que el login por el gateway no funciona hasta que se cambie o hasta que esté el Apollo Server (T1 del gateway).
- api-gateway y frontend: el registro ahora pide `nombres`, `apellidos`, `email` y `password`. El campo `rol` del body se ignora.
- ms-cursos: `GET /api/v1/cursos/{id}/validar` no devuelve `docenteId`. Si se quiere que en `GET /api/v1/inscripciones/curso/{cursoId}` solo entre el docente dueño del curso, hay que agregar ese campo (ver P10).
- ms-cursos: `inscripcion.creada` ahora llega con `estadoInscripcion: "PENDIENTE"` y con `eventoId`, `tipoEvento` y `fechaEvento`, como dice `integracion.md` 6.5. El README de ms-cursos todavía muestra `"APROBADA"`.
- ms-cursos: el endpoint `GET /api/v1/usuarios/docentes/{id}` ya existe (T6), así que se puede probar con `USUARIOS_SERVICE_MOCK=false` y `USUARIOS_SERVICE_URL=http://ms-usuarios:3004` (C5).
- docker-compose raíz (C3): ms-usuarios necesita además de lo que tiene hoy `JWT_SECRET`, `RABBIT_URL`, `RABBIT_EXCHANGE`, `CURSOS_URL` y, si se quiere el administrador inicial, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. El healthcheck puede usar `GET /api/v1/health`.
- T10: el `Dockerfile` y el `docker-compose.local.yml` están hechos, pero falta probar `docker compose -f docker-compose.local.yml up -d --build` en una máquina con Docker. Las demás tareas se probaron con PostgreSQL 16 y RabbitMQ 3.12 reales.
