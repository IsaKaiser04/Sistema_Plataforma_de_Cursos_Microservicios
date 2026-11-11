# ms-notificaciones — Documentación

Microservicio de notificaciones del LMS (Sistema Plataforma de Cursos con Microservicios).

## 1. Descripción

Servicio Node.js que:

- **Consume eventos** de RabbitMQ (exchange topic `lms.eventos.exchange`, cola `lms.notificaciones.queue`).
- **Genera notificaciones** para los estudiantes: inscripción, inicio y fin de curso, notas y certificados.
- **Guarda una copia local** de inscritos y cursos (a partir de los eventos), para saber a quién avisar sin llamar a otros servicios.
- **Expone una API REST** para consultarlas y marcarlas como leídas.

### Flujo

```
ms-inscripciones ──inscripcion.creada──────┐
ms-cursos ─────────cursos.evento.*─────────┤
ms-evaluaciones ───evaluacion.calificada───┤
                   certificado.emitido ────┤
                                           ▼
             RabbitMQ  exchange "lms.eventos.exchange" (topic)
                                           │
                                           ▼
                          cola "lms.notificaciones.queue"
                                           │  (mensajes inválidos → "lms.notificaciones.dlq")
                                           ▼
                                  ms-notificaciones
                                           │
                     PostgreSQL: notificaciones · inscritos · cursos
                                           │
                                           ▼
                        GET /notificaciones/:estudianteId
```

## 2. Contrato de eventos

Todos los IDs son **UUID** y los campos van en **camelCase** (mismo formato que ms-cursos).

| Routing key | Publica | Qué hace ms-notificaciones | Tipo de notificación |
|---|---|---|---|
| `inscripcion.creada` | ms-inscripciones | Registra al estudiante como inscrito y le avisa | `INSCRIPCION` |
| `cursos.evento.estado` con `estado: "EN_CURSO"` | ms-cursos | Avisa a **todos los inscritos** del curso | `CURSO_INICIADO` |
| `cursos.evento.estado` con `estado: "FINALIZADO"` | ms-cursos | Avisa a todos los inscritos | `CURSO_FINALIZADO` |
| `cursos.evento.*` (resto) | ms-cursos | Solo actualiza la copia local del curso (título, estado) | — |
| `evaluacion.calificada` | ms-evaluaciones | Avisa la nota al estudiante | `NOTA` |
| `certificado.emitido` | ms-evaluaciones | Avisa que el certificado está listo | `CERTIFICADO` |

### Payloads

**`inscripcion.creada`** (ya lo usa ms-cursos):
```json
{"inscripcionId":"UUID","cursoId":"UUID","estudianteId":"UUID","estadoInscripcion":"APROBADA","fechaInscripcion":"2026-11-09T10:00:00"}
```
Si `estadoInscripcion` es `RECHAZADA` o `CANCELADA`, se ignora.

**`cursos.evento.*`** (lo emite ms-cursos):
```json
{"eventoId":"UUID","tipoEvento":"EstadoCursoCambiado","cursoId":"UUID","codigoCurso":"SD-2026-01","titulo":"...","estado":"EN_CURSO", "...": "..."}
```

**`evaluacion.calificada`** (propuesta para ms-evaluaciones):
```json
{"eventoId":"UUID","estudianteId":"UUID","cursoId":"UUID","tituloEvaluacion":"Examen parcial","nota":9.5}
```
Obligatorios: `estudianteId`, `nota`. Opcionales: `eventoId`, `cursoId`, `tituloEvaluacion`, `tituloCurso`.

**`certificado.emitido`** (propuesta para ms-evaluaciones):
```json
{"certificadoId":"UUID","estudianteId":"UUID","cursoId":"UUID","certificadoUrl":"http://.../123.pdf"}
```
Obligatorio: `estudianteId`. Opcionales: `eventoId`/`certificadoId`, `cursoId`, `certificadoUrl`, `tituloCurso`.

### Fiabilidad

- **Idempotencia:** si un evento llega dos veces (mismo `eventoId`; en inscripciones, el `inscripcionId`; en certificados, el `certificadoId`), no se duplica la notificación.
- **Mensajes inválidos** (JSON roto, `null`, IDs que no son UUID, campos faltantes): no se reintentan; van a la cola `lms.notificaciones.dlq` para revisarlos en el panel.
- **Errores temporales** (BD caída): el mensaje se devuelve a la cola y se reintenta cada 2 s.
- **Reconexión automática** si se cae la conexión o el canal de RabbitMQ, o la BD.
- Cada evento se procesa en una **transacción**: o se guarda todo o nada.

## 3. Archivos del servicio

```
ms-notificaciones/
├── Dockerfile               # node:22-alpine, npm install --omit=dev, EXPOSE 3000
├── .dockerignore            # excluye node_modules, .env, npm-debug.log
├── package.json             # express, amqplib, pg; start → node index.js
├── package-lock.json        # versiones exactas de dependencias
├── index.js                 # API REST + consumidor de RabbitMQ + init de BD
├── .env.example             # plantilla de variables de entorno
├── .env                     # copia local (no se sube a Git, está en .gitignore)
├── .gitignore               # node_modules, .env
├── docker-compose.local.yml # stack local: PostgreSQL 16 + servicio
└── DOCUMENTACION.md         # este documento
```

### Variables de entorno

| Variable | Ejemplo | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto interno del servicio |
| `DATABASE_URL` | `postgresql://user:pass@db-notificaciones:5432/notificaciones` | Conexión a PostgreSQL |
| `RABBIT_URL` | `amqp://lms:lms123@host.docker.internal:5672` | Conexión a RabbitMQ |
| `RABBIT_EXCHANGE` | `lms.eventos.exchange` | Exchange compartido del LMS |

> En Linux, `host.docker.internal` requiere `extra_hosts: "host.docker.internal:host-gateway"` (ya está en el compose).
> Al conectar con compañeros, reemplazar el host por la IP de la máquina que hospeda RabbitMQ (ej. `192.168.1.50`).
> El usuario `guest` de RabbitMQ solo funciona desde `localhost`; desde un contenedor hay que usar otro usuario (ej. `lms`).

### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio, BD y RabbitMQ (503 si alguno está caído) |
| GET | `/notificaciones/:estudianteId` | Notificaciones de un estudiante (más recientes primero) |
| GET | `/notificaciones/:estudianteId?estado=ENVIADA` | Filtra por estado (`ENVIADA` o `LEIDA`) |
| PATCH | `/notificaciones/:id/leida` | Marca una notificación como leída |

`estudianteId` debe ser UUID (si no, responde 400).

### Tablas

```sql
notificaciones (
  id            SERIAL PRIMARY KEY,
  evento_id     UUID,                 -- para no duplicar
  estudiante_id UUID NOT NULL,
  curso_id      UUID,
  tipo          VARCHAR(30),          -- INSCRIPCION, CURSO_INICIADO, CURSO_FINALIZADO, NOTA, CERTIFICADO
  mensaje       TEXT,
  estado        VARCHAR(10) DEFAULT 'ENVIADA',   -- ENVIADA | LEIDA
  fecha         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (evento_id, estudiante_id)
)
inscritos (curso_id UUID, estudiante_id UUID, inscripcion_id UUID, fecha, PK (curso_id, estudiante_id))
cursos    (curso_id UUID PK, codigo, titulo, estado, actualizado)
```

Las tablas se crean automáticamente al arrancar. Si existe la tabla de la versión 1 (`estudiante_id INT`), se renombra a `notificaciones_v1` y se conserva.

## 4. Puesta en marcha

### Requisitos

- Docker y Docker Compose v2
- RabbitMQ en los puertos 5672/15672

### Opción A: RabbitMQ en contenedor

```bash
docker run -d --name rabbitmq-lms \
  -p 5672:5672 -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=lms \
  -e RABBITMQ_DEFAULT_PASS=lms123 \
  rabbitmq:3-management-alpine
```

### Opción B: RabbitMQ instalado en el host

```bash
sudo rabbitmqctl add_user lms lms123
sudo rabbitmqctl set_permissions -p / lms ".*" ".*" ".*"
```

### Arrancar el servicio (Docker)

```bash
cd ms-notificaciones
docker compose -f docker-compose.local.yml up -d --build
```

- Servicio: http://localhost:8004
- Panel RabbitMQ: http://localhost:15672
- PostgreSQL: `localhost:5433` (base `notificaciones`, usuario `user`, clave `pass`)

### Arrancar el servicio sin Docker (desarrollo)

```bash
docker compose -f docker-compose.local.yml up -d db-notificaciones
npm install
PORT=8004 \
DATABASE_URL=postgresql://user:pass@localhost:5433/notificaciones \
RABBIT_URL=amqp://guest:guest@localhost:5672 \
node index.js
```

Para detener: `docker compose -f docker-compose.local.yml down`

## 5. Pruebas realizadas (9-nov-2026, todas aprobadas)

Probado junto a **ms-cursos** (rama `cursos-Cristian`, puerto 8081) en el mismo RabbitMQ. Los eventos de ms-evaluaciones se simularon desde la API del panel.

### Prueba 1 — Arranque y salud

```bash
curl http://localhost:8004/health
# {"status":"ok","servicio":"ms-notificaciones","baseDatos":"UP","rabbitmq":"UP"}
```
Log: `Escuchando eventos en lms.eventos.exchange -> lms.notificaciones.queue`

### Prueba 2 — Inscripción → curso inicia → curso finaliza (con ms-cursos real)

```bash
C=http://localhost:8081/api/v1/cursos
ID=<cursoId>
curl -X PATCH "$C/$ID/estado?estado=PUBLICADO"           # guarda el título del curso
curl -X POST  "$C/simulador/inscripcion-creada/$ID"      # estudiante 1
curl -X POST  "$C/simulador/inscripcion-creada/$ID"      # estudiante 2
curl -X PATCH "$C/$ID/estado?estado=EN_CURSO"
curl -X PATCH "$C/$ID/estado?estado=FINALIZADO"
```

Log del servicio:
```
[cursos.evento.estado] caché de curso actualizada
[inscripcion.creada] 1 notificación(es)
[inscripcion.creada] 1 notificación(es)
[cursos.evento.estado] 2 notificación(es) a inscritos     ← EN_CURSO
[cursos.evento.estado] 2 notificación(es) a inscritos     ← FINALIZADO
```

### Prueba 3 — Nota y certificado (simulando ms-evaluaciones)

```bash
curl -u guest:guest -H "content-type: application/json" -X POST \
  http://localhost:15672/api/exchanges/%2F/lms.eventos.exchange/publish \
  -d '{"properties":{},"routing_key":"evaluacion.calificada","payload":"{\"eventoId\":\"aaaaaaaa-0000-4000-8000-000000000001\",\"estudianteId\":\"<UUID>\",\"cursoId\":\"<UUID>\",\"tituloEvaluacion\":\"Examen parcial\",\"nota\":9.5}","payload_encoding":"string"}'
```
Igual con `certificado.emitido`. Resultado: `{"routed":true}` y 1 notificación de cada tipo.

### Prueba 4 — Consulta por la API

```bash
curl http://localhost:8004/notificaciones/<estudianteId>
```
El estudiante 1 recibió 5 notificaciones, en orden:
```
CURSO_FINALIZADO | El curso "Arquitectura de Microservicios..." ha finalizado.
CERTIFICADO      | ¡Felicitaciones! Tu certificado del curso "..." está listo. Descárgalo aquí: http://...
NOTA             | Tu evaluación "Examen parcial" del curso "..." fue calificada: 9.5
CURSO_INICIADO   | El curso "..." ha comenzado. ¡Éxitos!
INSCRIPCION      | Te inscribiste en el curso "...". ¡Bienvenido!
```

### Prueba 5 — Duplicados y mensajes inválidos

| Envío | Resultado |
|---|---|
| Mismo `evaluacion.calificada` dos veces | `0 notificación(es)` la segunda vez (no se duplica) |
| Payload `null` | A la DLQ: `El cuerpo no es un objeto JSON` |
| JSON roto | A la DLQ: `Expected property name...` |
| `estudianteId: "abc"` | A la DLQ: `Campo 'estudianteId' ausente o no es UUID` |

El servicio siguió funcionando; `lms.notificaciones.dlq` quedó con 3 mensajes y la cola principal con 0.

### Prueba 6 — API REST

| Petición | Resultado |
|---|---|
| `PATCH /notificaciones/1/leida` | 200, `estado: "LEIDA"` |
| `GET /notificaciones/<id>?estado=LEIDA` | 1 resultado |
| `GET /notificaciones/abc` | 400 `estudianteId debe ser un UUID` |
| `PATCH /notificaciones/99999/leida` | 404 `Notificación no encontrada` |

**Conclusión:** el ciclo completo evento → cola → servicio → base de datos → API funciona con ms-cursos real.

## 6. Pendiente con el equipo

- **ms-evaluaciones:** confirmar los nombres `evaluacion.calificada` y `certificado.emitido` y sus payloads (sección 2).
- **ms-inscripciones:** publicar `inscripcion.creada` en `lms.eventos.exchange` con el formato de la sección 2.
- **docker-compose.yml raíz:** agregar el servicio `ms-notificaciones` (hoy solo tiene su base `db_notificaciones`).

## 7. Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| `RabbitMQ no disponible, reintentando...` | RabbitMQ no corre o credenciales mal. Verificar con `docker ps`. Recordar que `guest` solo sirve desde localhost. |
| `Base de datos no disponible, reintentando...` | PostgreSQL aún arrancando; reintenta cada 3 s. |
| `/health` responde 503 | La BD o RabbitMQ están caídos; el JSON indica cuál. |
| `{"routed":false}` al publicar | Ninguna cola está enlazada a esa routing key. Revisar el nombre (ej. `evaluacion.calificada`) y que el servicio esté conectado. |
| Mensajes en `lms.notificaciones.dlq` | El evento llegó con datos inválidos; verlo en el panel → Queues → `lms.notificaciones.dlq` → Get messages. |
| Llegan inscripciones pero "el curso inició" no avisa a nadie | Las inscripciones llegaron antes de que el servicio existiera; solo se avisa a los inscritos que ms-notificaciones registró. |
| No llegan mensajes desde otra máquina | Cambiar la IP en `RABBIT_URL` por la del host de RabbitMQ y abrir el puerto 5672. |
