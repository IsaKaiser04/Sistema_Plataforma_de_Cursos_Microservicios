# Análisis del proyecto: Plataforma de Cursos (LMS) con microservicios

> Fecha del análisis: 2026-11-10 · Rama analizada: `certificados-Maria` (incluye merges de `cursos-Cristian`, `evaluaciones-Josue` y `login-inscripciones-Isauro`).

## 1. Qué estamos construyendo

Una **plataforma de cursos en línea (LMS)** con arquitectura de microservicios. Cada servicio tiene su propia base de datos PostgreSQL y se comunican de dos formas:

- **HTTP (síncrono):** cuando un servicio necesita una respuesta inmediata de otro.
- **RabbitMQ (asíncrono):** eventos publicados en un exchange de tipo *topic* para avisar a los demás servicios que algo ocurrió.

```
Frontend (React + Vite :5173)
        │
API Gateway (:4000) ──► ms-usuarios (:3004)
        │
 ms-cursos (:8081)   ms-evaluaciones (:8083)   ms-notificaciones (:8004)
        └──────────── RabbitMQ (eventos) ────────────┘
```

## 2. Microservicios

### 2.1 ms-usuarios — Node + Express + Sequelize (Isauro)

**Qué hace**
- Registro y login con **JWT** (`POST /api/auth/registro`, `POST /api/auth/login`).
- Contraseñas cifradas con bcrypt.
- Roles: `Administrador` y `Estudiante`.
- Modelo `Inscripcion` (usuario_id, curso_id, estado `ACTIVA`/`CANCELADA`).

**Pendiente / problemas**
- `src/routes/inscripcionRoutes.js` importa `inscribirEstudiante` y `listarInscritosPorCurso`, pero el controlador solo exporta `crearInscripcion`.
- Usa el middleware `../middlewares/authMiddleware`, que no existe.
- Las rutas de inscripción no están montadas en `src/index.js`.
- **No publica el evento `inscripcion.creada`** en RabbitMQ (aunque `amqplib` está instalado). Este evento lo esperan ms-cursos y ms-notificaciones.
- En `package.json` el nombre sigue siendo `ms-inscripciones`.

### 2.2 ms-cursos — Spring Boot + PostgreSQL + RabbitMQ (Cristian)

**Qué hace** (es el servicio más completo)
- CRUD de cursos y módulos, estados, niveles y cupos (`/api/v1/cursos`).
- Swagger (`/swagger-ui.html`) y manejo global de errores.
- **Publica** `cursos.evento.*` (creado, actualizado, estado, cupo, eliminado).
- **Consume** `inscripcion.creada` para descontar cupos.
- `SimuladorEventosController` (`POST /api/v1/cursos/simulador/inscripcion-creada/{cursoId}`) para simular inscripciones mientras ms-usuarios no las publique.
- Cliente de usuarios en modo *mock* (`USUARIOS_SERVICE_MOCK=true`).

**Pendiente / problemas**
- Apunta a `http://ms-usuarios:8080`, pero ms-usuarios corre en el puerto `3004`.

### 2.3 ms-evaluaciones — Spring Boot (Josué)

**Qué hace**
- Crear y listar evaluaciones, también por curso (`/api/v1/evaluaciones`).
- `CursoClient` para consultar ms-cursos por HTTP.

**Pendiente / problemas**
- **No sigue el contrato de eventos del equipo:**

  | Concepto | ms-evaluaciones usa | Contrato del equipo |
  |---|---|---|
  | Exchange | `lms.exchange` | `lms.eventos.exchange` |
  | Evento que escucha | `curso.inscrito` | `inscripcion.creada` |
  | Evento que publica | `evaluacion.aprobada` | `evaluacion.calificada`, `certificado.emitido` |

- El productor (`EvaluacionProducer`) existe, pero nadie lo llama.
- El consumidor solo imprime el mensaje, no lo procesa.
- `CursoClient` no se usa para validar que el curso exista.
- No hay endpoint para calificar (el frontend tiene `CalificarEvaluacion`).
- Configuración fija en `application.yml` (`localhost`, usuario `guest`, BD `db_evaluaciones`), sin variables de entorno.

### 2.4 ms-notificaciones — Node + Express + pg (María)

**Qué hace**
- Consume `inscripcion.creada`, `cursos.evento.#`, `evaluacion.calificada` y `certificado.emitido` y los guarda como notificaciones por estudiante.
- Valida UUIDs y envía mensajes inválidos a una cola de errores (DLQ `lms.notificaciones.dlq`).
- Reconexión automática a RabbitMQ y a la BD.
- Endpoints: `GET /health`, `GET /notificaciones/:estudianteId`, `PATCH /notificaciones/:id/leida`.
- Documentación propia en `ms-notificaciones/DOCUMENTACION.md`.

**Pendiente / problemas**
- El broker local necesita el usuario `lms` / `lms123` (el usuario `guest` solo funciona desde localhost, no desde contenedores):
  ```bash
  docker exec rabbitmq_broker rabbitmqctl add_user lms lms123
  docker exec rabbitmq_broker rabbitmqctl set_permissions -p / lms ".*" ".*" ".*"
  ```

### 2.5 api-gateway — Express + express-http-proxy

**Qué hace**
- Redirige `/api/auth` hacia ms-usuarios.

**Pendiente**
- Faltan las rutas hacia cursos, evaluaciones y notificaciones.

### 2.6 frontend — React + Vite + axios

**Qué hace**
- Pantallas de evaluaciones (crear, ver, calificar) y lista de cursos.

**Pendiente / problemas**
- Llama directamente a los puertos `8081` y `8083`, sin pasar por el gateway.
- No tiene login ni pantalla de notificaciones.

## 3. Problemas de integración (prioridad alta)

1. **Nadie publica `inscripcion.creada`.** ms-usuarios debería publicarlo en `lms.eventos.exchange` con este formato (el que ya esperan ms-cursos y ms-notificaciones):
   ```json
   {
     "inscripcionId": "uuid",
     "cursoId": "uuid",
     "estudianteId": "uuid",
     "estadoInscripcion": "ACTIVA",
     "fechaInscripcion": "2026-11-10T10:00:00"
   }
   ```
2. **ms-evaluaciones está desconectado** del resto (otro exchange y otros nombres de evento).
3. **El `docker-compose.yml` raíz está incompleto:**
   - No incluye ms-evaluaciones, ms-notificaciones ni el frontend.
   - Puertos inconsistentes de ms-usuarios (`3004` en el gateway, `8080` en ms-cursos).
   - Las bases de datos no tienen volúmenes ni healthchecks.
4. **Credenciales de RabbitMQ distintas:** unos usan `guest`, ms-notificaciones usa `lms`. Conviene unificar en un solo usuario.
5. **PostgreSQL mezclado** (versiones 15 y 16) y credenciales distintas por servicio.

## 4. Contrato de eventos actual

Exchange compartido: **`lms.eventos.exchange`** (topic, durable).

| Routing key | Publica | Consume |
|---|---|---|
| `inscripcion.creada` | ms-usuarios *(pendiente)* | ms-cursos, ms-notificaciones |
| `cursos.evento.*` | ms-cursos | ms-notificaciones |
| `evaluacion.calificada` | ms-evaluaciones *(pendiente)* | ms-notificaciones |
| `certificado.emitido` | ms-evaluaciones *(pendiente)* | ms-notificaciones |

## 5. Estado general

| Servicio | Avance |
|---|---|
| ms-cursos | Alto |
| ms-notificaciones | Alto |
| ms-usuarios | Medio: login listo, inscripciones rotas |
| ms-evaluaciones | Bajo-medio: CRUD sí, eventos no alineados |
| api-gateway | Bajo |
| frontend | Bajo: solo evaluaciones |

## 6. Próximos pasos sugeridos

1. ms-usuarios: arreglar las rutas de inscripción y publicar `inscripcion.creada`.
2. ms-evaluaciones: cambiar al exchange `lms.eventos.exchange` y a las routing keys del contrato, y usar variables de entorno.
3. Unificar las credenciales de RabbitMQ y completar el `docker-compose.yml` raíz con todos los servicios.
4. api-gateway: agregar las rutas de todos los servicios y hacer que el frontend pase por él.
5. frontend: agregar login y la vista de notificaciones.
