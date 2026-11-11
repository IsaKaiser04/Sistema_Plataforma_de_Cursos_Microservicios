# ms-usuarios

Microservicio de usuarios de la Plataforma de Cursos (LMS). Hace el registro y el inicio de sesión con JWT, administra los usuarios (administrador, docente y estudiante) y maneja las inscripciones a los cursos. Es el único servicio que crea tokens; el api-gateway los valida y le pasa el usuario en las cabeceras `X-User-Id` y `X-User-Rol`.

Tecnología: Node.js 18, Express 4, Sequelize 6, PostgreSQL 16, amqplib, bcryptjs y jsonwebtoken. Puerto 3004.

## Cómo levantarlo

### Con Docker (servicio, base y RabbitMQ)

```bash
docker compose -f docker-compose.local.yml up -d --build
curl http://localhost:3004/api/v1/health
```

El panel de RabbitMQ queda en http://localhost:15672 con el usuario `lms` y la clave `lms123`. La base queda publicada en el puerto 5434 del host.

En este modo ms-cursos tiene que estar corriendo aparte en el puerto 8081 de tu máquina, porque `CURSOS_URL` apunta a `http://host.docker.internal:8081`.

### Con npm, junto a ms-cursos

Si quieres que los eventos lleguen de verdad a ms-cursos, los dos tienen que usar el mismo RabbitMQ. La forma más simple mientras no esté el compose raíz completo:

1. Levanta ms-cursos con su `docker-compose.local.yml` (trae su propio RabbitMQ en el 5672).
2. Levanta solo la base de este servicio: `docker compose -f docker-compose.local.yml up -d db_usuarios`
3. Copia `.env.example` como `.env` y cambia `RABBIT_URL=amqp://guest:guest@localhost:5672` (el RabbitMQ de ms-cursos usa `guest`, que funciona desde localhost).
4. `npm install` y `npm start`.

## Variables de entorno

| Variable | Ejemplo | Para qué |
|---|---|---|
| `PORT` | `3004` | Puerto del servicio |
| `DB_HOST`, `DB_PORT` | `db_usuarios`, `5432` | Servidor de PostgreSQL |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | `usuarios_db`, `admin`, `password` | Base de datos |
| `JWT_SECRET` | el mismo del gateway | Firma de los tokens |
| `RABBIT_URL` | `amqp://lms:lms123@rabbitmq:5672` | Conexión a RabbitMQ |
| `RABBIT_EXCHANGE` | `lms.eventos.exchange` | Exchange compartido |
| `CURSOS_URL` | `http://ms-cursos:8081` | ms-cursos, para validar el curso |
| `CURSOS_TIMEOUT_MS` | `3000` | Tiempo límite de esa llamada |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `admin@unl.edu.ec`, `admin123` | Administrador inicial, se crea si no hay ninguno |

Si falta una variable obligatoria el servicio no arranca y dice cuál falta.

## Endpoints

| Método | Ruta | Quién |
|---|---|---|
| POST | `/api/v1/auth/registro` | público, siempre crea ESTUDIANTE |
| POST | `/api/v1/auth/login` | público |
| GET | `/api/v1/usuarios/me` | cualquiera con cabeceras |
| GET | `/api/v1/usuarios?rol=` | ADMINISTRADOR |
| POST | `/api/v1/usuarios` | ADMINISTRADOR (crea DOCENTE o ADMINISTRADOR) |
| PATCH | `/api/v1/usuarios/{id}/estado` | ADMINISTRADOR, body `{ "activo": false }` |
| GET | `/api/v1/usuarios/docentes/{id}` | interno, lo usa ms-cursos |
| POST | `/api/v1/inscripciones` | ESTUDIANTE, body `{ "cursoId": "UUID" }` |
| GET | `/api/v1/inscripciones/mias` | ESTUDIANTE |
| GET | `/api/v1/inscripciones/curso/{cursoId}` | DOCENTE, ADMINISTRADOR |
| GET | `/api/v1/inscripciones/{id}` | dueño, ADMINISTRADOR |
| PATCH | `/api/v1/inscripciones/{id}/cancelar` | dueño, ADMINISTRADOR |
| GET | `/api/v1/health` | interno, 503 si la base o RabbitMQ fallan |

Registro, body: `{ "nombres", "apellidos", "email", "password" }`. La contraseña debe tener al menos 6 caracteres.

Login, respuesta:

```json
{
  "token": "eyJhbGciOi...",
  "usuario": { "id": "UUID", "email": "ana@unl.edu.ec", "nombres": "Ana", "apellidos": "Torres", "rol": "ESTUDIANTE" }
}
```

Inscripción, respuesta:

```json
{ "id": "UUID", "cursoId": "UUID", "estudianteId": "UUID", "estado": "PENDIENTE", "motivoRechazo": null, "fechaInscripcion": "2026-11-10T10:00:00" }
```

Los errores salen con el formato común de `integracion.md`:

```json
{ "timestamp": "2026-11-10T10:15:30", "status": 409, "error": "YA_INSCRITO", "mensaje": "Ya tienes una inscripción vigente en este curso", "ruta": "/api/v1/inscripciones" }
```

## Cómo funciona la inscripción

1. Si el estudiante ya tiene una inscripción PENDIENTE o ACTIVA en ese curso, responde 409 `YA_INSCRITO`. Si la anterior quedó CANCELADA, RECHAZADA o FINALIZADA, puede volver a inscribirse.
2. Llama a `GET {CURSOS_URL}/api/v1/cursos/{cursoId}/validar` con 3 segundos de tiempo límite. Si el curso no existe responde 404; si no se puede inscribir responde 409 (`CUPO_AGOTADO` o `CURSO_NO_DISPONIBLE`); si ms-cursos no responde, 503 y no guarda nada.
3. Guarda la inscripción en `PENDIENTE` y publica `inscripcion.creada`. Si RabbitMQ está caído, la inscripción queda guardada y el error se escribe en el log.
4. Cuando ms-cursos responde con `acceso.habilitado`, la inscripción pasa a `ACTIVA`. Con `inscripcion.rechazada` pasa a `RECHAZADA` y se guarda el motivo.

Estados: `PENDIENTE`, `ACTIVA`, `RECHAZADA`, `CANCELADA`, `FINALIZADA`.

## Eventos

Publica en `lms.eventos.exchange`:

| Routing key | Cuándo |
|---|---|
| `inscripcion.creada` | al crear una inscripción |
| `inscripcion.cancelada` | al cancelarla |

Consume en la cola `lms.usuarios.inscripciones.queue`:

| Routing key | Qué hace |
|---|---|
| `acceso.habilitado` | PENDIENTE pasa a ACTIVA |
| `inscripcion.rechazada` | PENDIENTE pasa a RECHAZADA y guarda el motivo |
| `cursos.evento.estado` | si el estado es FINALIZADO, las ACTIVA de ese curso pasan a FINALIZADA |

Cada `eventoId` procesado se guarda en la tabla `eventos_procesados`, así un evento repetido no se aplica dos veces. Los mensajes mal formados van a `lms.usuarios.dlq` (por el exchange `lms.usuarios.dlx`) y los errores temporales vuelven a la cola. Si RabbitMQ se cae, el servicio se vuelve a conectar cada 5 segundos.

Para probar sin ms-cursos, publica a mano desde el panel de RabbitMQ (Exchanges, `lms.eventos.exchange`, Publish message) con la routing key `acceso.habilitado` y un payload como este:

```json
{ "eventoId": "8d0f6b0e-3c1a-4a8e-9f1e-2b7c5d4e3a10", "tipoEvento": "AccesoHabilitado", "inscripcionId": "<id de la inscripción>", "cursoId": "<id del curso>", "estudianteId": "<id del estudiante>", "codigoCurso": "SD-2026-01", "tituloCurso": "Sistemas Distribuidos", "fechaEvento": "2026-11-10T10:00:01" }
```

## Cambio de roles en una base que ya tenía datos

Antes los roles eran `Administrador` y `Estudiante`, y la inscripción solo tenía `ACTIVA` y `CANCELADA`. Al arrancar, `src/models/index.js` renombra esos valores en PostgreSQL (`ALTER TYPE ... RENAME VALUE`) antes del `sync({ alter: true })`, así que los usuarios que ya existían se quedan con su rol en mayúsculas y no se pierde nada. Los usuarios viejos quedan con `nombres` y `apellidos` vacíos.

## Pruebas

Las pruebas usan Jest y Supertest con una base aparte llamada `usuarios_test`, que se crea sola. Necesitan la base levantada:

```bash
docker compose -f docker-compose.local.yml up -d db_usuarios
npm test
```

ms-cursos se simula dentro de las pruebas (`tests/cursosSimulado.js`) y RabbitMQ no hace falta: el consumidor se prueba con un canal falso.

En `postman/ms-usuarios.postman_collection.json` está la colección para las evidencias. Antes de correrla, cambia la variable `cursoId` por el id real del curso SD-2026-01 de ms-cursos.
