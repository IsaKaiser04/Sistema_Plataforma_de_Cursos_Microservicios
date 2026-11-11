# Documentación ms-certificados (certificados y notificaciones) — Plataforma de Cursos LMS

11 de noviembre de 2026 · María Chuico

## Resumen

El microservicio es `ms-certificados`, y su función principal es emitir el certificado del estudiante que aprueba un curso. Las notificaciones no son un microservicio aparte: son alertas que el mismo servicio guarda cuando pasa algo que afecta al estudiante. Todo comparte un contenedor, la base `notificaciones_db` y la conexión a RabbitMQ.

El servicio se llama `ms-certificados` (carpeta, nombre en Docker y URL `http://ms-certificados:3000`). Los nombres que son parte del contrato del grupo se mantienen: la cola `lms.notificaciones.queue`, la DLQ `lms.notificaciones.dlq` y la base `notificaciones_db`. Hay que avisar al grupo para que el compose raíz y el gateway (`NOTIFICACIONES_URL`) usen el nombre nuevo.

- **Certificados (función principal):** cuando ms-evaluaciones avisa con `nota.final.calculada` que un estudiante aprobó, genera su certificado con un código de verificación y lo expone por REST, incluida una verificación pública.
- **Notificaciones (alertas):** componente interno que convierte los eventos del sistema (inscripción, curso, evaluaciones, notas, certificado emitido) en avisos que el estudiante ve en la plataforma.

El servicio solo consume eventos: no publica ninguno y no llama a otros servicios por HTTP. Todo lo que necesita (inscritos, título y código del curso, nota final) llega en los eventos.

| Dato | Valor |
| --- | --- |
| Responsable | María Chuico |
| Carpeta del repo | `ms-certificados/` |
| Tecnología | Node.js 22, Express 4, pg, amqplib |
| Puerto | 3000 interno, 8004 en local |
| Base de datos | `db_notificaciones` / `notificaciones_db` (PostgreSQL 16) |
| Cola propia | `lms.notificaciones.queue`, errores en `lms.notificaciones.dlq` |
| Lo usa | api-gateway (GraphQL) |

### Decisiones del cuestionario

Se toman las opciones recomendadas del plan.

| Pregunta | Decisión |
| --- | --- |
| P1. Dividir `index.js` | Sí, en carpetas por responsabilidad (ver estructura) |
| P2. `inscripcion.creada` genera mensaje | No, solo registra al inscrito; la bienvenida llega con `acceso.habilitado` |
| P3. Avisar al cancelar | No, la acción la hizo el propio estudiante |
| P4. Rutas | `/api/v1/notificaciones` y `/api/v1/certificados` |
| P5. Código de verificación | `LMS-<codigoCurso sin guiones>-<4 dígitos por curso>`, ej. `LMS-SD202601-0001` |
| P6. Avisar nota a reprobados | Sí, notificación `NOTA_FINAL` |
| P7. PDF del certificado | No; se muestra en una página del frontend (T8 descartada) |
| P8. Pruebas | Manuales (curl y panel de RabbitMQ) + Jest para los manejadores |
| P9. Certificados aparte | Un solo servicio, renombrado ms-certificados, con los dos módulos |
| P10. Borrar notificaciones viejas | No |
| P11. Correos | No, solo dentro de la plataforma |

## Qué dice la guía del docente

Para el tema 05 (LMS), la guía reparte cuatro microservicios: Cursos, Inscripciones, Evaluaciones y **Certificados**. Notificaciones no está en esa lista, por eso aquí va como alertas dentro de `ms-certificados`.

| Lo que dice la guía | Cómo lo cumple esta parte |
| --- | --- |
| Notificaciones "solo consume colas y envía mensajes" | Las alertas solo escuchan eventos de RabbitMQ y guardan mensajes; no publican ni llaman a nadie |
| Flujo del tema: inscripción → habilitar acceso → enviar bienvenida | La bienvenida se crea al recibir `acceso.habilitado` |
| Sin llamadas directas entre servicios para procesos asíncronos | El certificado nace del evento `nota.final.calculada`, sin llamar a ms-evaluaciones |
| Cada microservicio con su propia base de datos | `notificaciones_db`, solo de este servicio |
| El frontend refleja los cambios que llegan por colas | La campana de alertas y "Mis certificados" muestran lo que llegó por eventos |
| Demo: frontend → API → cola → microservicio → pantalla | Calificar y finalizar el curso hace aparecer el certificado y su alerta en pantalla |

## Ubicación en la arquitectura

```mermaid
flowchart LR
    U["ms-usuarios<br/>inscripcion.*"] --> EX
    C["ms-cursos<br/>acceso.habilitado<br/>inscripcion.rechazada<br/>cursos.evento.*"] --> EX
    E["ms-evaluaciones<br/>evaluacion.*<br/>nota.final.calculada"] --> EX
    EX[("RabbitMQ<br/>lms.eventos.exchange")] -- routing keys --> Q["lms.notificaciones.queue"]
    Q -- mensaje inválido --> DLQ["lms.notificaciones.dlq"]
    Q -- consume --> MS
    GW["api-gateway :4000<br/>GraphQL hacia el frontend"] -- "REST /api/v1/..." --> MS
    subgraph MS["ms-certificados :3000"]
        CERT["Certificados (principal)"]
        ALE["Alertas (notificaciones)"]
        DB[("PostgreSQL<br/>notificaciones_db")]
    end
```

Los otros tres servicios publican eventos en el exchange; la cola propia los entrega a ms-certificados, y los mensajes inválidos terminan en la cola de errores. El frontend nunca llama directo al servicio: pasa por el api-gateway.

## Módulo certificados

Emite un certificado cuando recibe `nota.final.calculada` con `aprobado: true`. No recalcula notas: esa decisión es de ms-evaluaciones.

### Reglas de negocio

1. Si `aprobado` es `true`, crea el certificado y la notificación `CERTIFICADO` con el enlace `FRONTEND_URL/certificados/<codigo>`.
2. Si ya existe un certificado para ese curso y estudiante, no hace nada (idempotencia por `(curso_id, estudiante_id)` además de por `eventoId`).
3. Si `aprobado` es `false`, no crea certificado; crea la notificación `NOTA_FINAL` con la nota.
4. El certificado y su notificación se guardan en una sola transacción.
5. El código es correlativo por curso: el primero de `SD-2026-01` es `LMS-SD202601-0001`.
6. Un estudiante solo ve sus propios certificados (cabecera `X-User-Id`, si no coincide responde 403 `PROHIBIDO`; si falta, 401 `NO_AUTENTICADO`). La verificación por código es pública.
7. El correlativo se calcula con un bloqueo por curso (`pg_advisory_xact_lock`) dentro de la transacción, para que dos emisiones simultáneas no repitan número.
8. Si el evento no trae `codigoCurso` o `tituloCurso`, se toman de la copia local `cursos`.

### Tabla `certificados`

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | UUID | PK |
| `codigo_verificacion` | VARCHAR(40) | Único |
| `curso_id` | UUID | Único junto con `estudiante_id` |
| `estudiante_id` | UUID | |
| `codigo_curso` | VARCHAR(30) | Copiado del evento |
| `titulo_curso` | VARCHAR(200) | Copiado del evento |
| `nota_final` | NUMERIC(3,1) | De 0 a 10 |
| `fecha_emision` | TIMESTAMPTZ | Al crear |

```sql
CREATE TABLE IF NOT EXISTS certificados (
  id UUID PRIMARY KEY,
  codigo_verificacion VARCHAR(40) NOT NULL UNIQUE,
  curso_id UUID NOT NULL,
  estudiante_id UUID NOT NULL,
  codigo_curso VARCHAR(30) NOT NULL,
  titulo_curso VARCHAR(200) NOT NULL,
  nota_final NUMERIC(3,1) NOT NULL CHECK (nota_final BETWEEN 0 AND 10),
  fecha_emision TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (curso_id, estudiante_id)
);
```

### Endpoints

| Método | Ruta | Quién | Respuesta |
| --- | --- | --- | --- |
| GET | `/api/v1/certificados/estudiante/:estudianteId` | El estudiante | Lista de sus certificados |
| GET | `/api/v1/certificados/:id` | El dueño | Detalle; 403 si no es suyo |
| GET | `/api/v1/certificados/verificar/:codigo` | Público | Datos del certificado o 404 `NO_ENCONTRADO` |

Respuesta de un certificado:

```json
{
  "id": "UUID",
  "codigoVerificacion": "LMS-SD202601-0001",
  "estudianteId": "UUID",
  "cursoId": "UUID",
  "codigoCurso": "SD-2026-01",
  "tituloCurso": "Sistemas Distribuidos",
  "notaFinal": 8.7,
  "fechaEmision": "2026-12-20T15:00:00.000Z",
  "url": "http://localhost:5173/certificados/LMS-SD202601-0001"
}
```

No entra en el alcance: PDF, firma digital ni revocar certificados.

## Notificaciones (alertas)

Las notificaciones son alertas dentro de `ms-certificados`, no un servicio propio: guardan un mensaje por estudiante cuando llega un evento que le afecta, y el frontend las muestra en una campana. Lo que ya funciona (idempotencia, DLQ, reconexión, transacciones; pruebas del 9 de noviembre) se conserva sin cambios.

### Qué genera cada evento

| Evento | Acción | Tipo de notificación |
| --- | --- | --- |
| `inscripcion.creada` | Registra al estudiante en `inscritos`, sin mensaje | — |
| `acceso.habilitado` | Mensaje de bienvenida; agrega a `inscritos` si faltaba | `INSCRIPCION` |
| `inscripcion.rechazada` | Mensaje según el motivo; quita de `inscritos` | `INSCRIPCION_RECHAZADA` |
| `inscripcion.cancelada` | Quita de `inscritos`, sin mensaje | — |
| `cursos.evento.estado` (EN_CURSO) | Aviso a todos los inscritos | `CURSO_INICIADO` |
| `cursos.evento.estado` (FINALIZADO) | Aviso a todos los inscritos | `CURSO_FINALIZADO` |
| `cursos.evento.*` (otros) | Actualiza la copia local del curso | — |
| `evaluacion.publicada` | Aviso a todos los inscritos con título y fecha de cierre | `EVALUACION_NUEVA` |
| `evaluacion.calificada` | Aviso al estudiante con su nota | `NOTA` |
| `nota.final.calculada` | Ver módulo certificados | `CERTIFICADO` o `NOTA_FINAL` |

Mensajes de rechazo por motivo: `CUPO_AGOTADO` (el curso ya no tiene cupos), `CURSO_NO_DISPONIBLE` (el curso no acepta inscripciones) y `CURSO_NO_EXISTE` (el curso no existe).

### Tablas

| Tabla | Columnas | Para qué |
| --- | --- | --- |
| `notificaciones` | id (SERIAL), evento_id, estudiante_id, curso_id, tipo, mensaje, estado (`ENVIADA` o `LEIDA`), fecha | Un mensaje por estudiante. `UNIQUE (evento_id, estudiante_id)` evita duplicados si el evento se repite |
| `inscritos` | curso_id, estudiante_id, inscripcion_id, fecha | Quién está en cada curso, para avisar a todos |
| `cursos` | curso_id, codigo, titulo, estado, actualizado | Copia local del curso, para armar los textos |

### Endpoints

| Método | Ruta | Quién | Respuesta |
| --- | --- | --- | --- |
| GET | `/health` | Interno | Estado del servicio |
| GET | `/api/v1/notificaciones/:estudianteId?estado=ENVIADA\|LEIDA` | El estudiante | Lista, la más reciente primero |
| GET | `/api/v1/notificaciones/:estudianteId/no-leidas/total` | El estudiante | `{ "total": 3 }` |
| PATCH | `/api/v1/notificaciones/:id/leida` | El estudiante | La notificación marcada |
| PATCH | `/api/v1/notificaciones/:estudianteId/leidas` | El estudiante | `{ "actualizadas": 3 }` |

Respuesta de una notificación:

```json
{
  "id": 42,
  "estudianteId": "UUID",
  "cursoId": "UUID",
  "tipo": "CERTIFICADO",
  "mensaje": "Aprobaste Sistemas Distribuidos con 8.7. Verifica tu certificado en http://localhost:5173/certificados/LMS-SD202601-0001",
  "estado": "ENVIADA",
  "fecha": "2026-12-20T15:00:02.000Z"
}
```

Las fechas de las respuestas van en ISO 8601 UTC (`...Z`).

Error común (igual en todos los servicios del grupo):

```json
{ "timestamp": "2026-11-10T10:15:30", "status": 400, "error": "DATOS_INVALIDOS",
  "mensaje": "estudianteId no es un UUID válido", "ruta": "/api/v1/notificaciones/abc" }
```

| Código | `error` | Cuándo |
| --- | --- | --- |
| 400 | `DATOS_INVALIDOS` | UUID o id mal formado, `estado` distinto de `ENVIADA`/`LEIDA` |
| 401 | `NO_AUTENTICADO` | Falta `X-User-Id` en una ruta que no es pública |
| 403 | `PROHIBIDO` | El recurso es de otro estudiante |
| 404 | `NO_ENCONTRADO` | No existe la notificación, el certificado o la ruta |
| 500 | `ERROR_INTERNO` | Error no previsto (se registra en el log) |

No entra en el alcance: correos, notificaciones push, WebSockets ni avisos para docentes.

## Contrato de eventos (RabbitMQ)

El servicio escucha en el exchange compartido `lms.eventos.exchange` (topic, durable) con el usuario `lms` / `lms123`. Los nombres y campos salen de `integracion.md`; si algo no coincide, manda ese archivo.

| Elemento | Valor |
| --- | --- |
| Cola | `lms.notificaciones.queue` (durable) |
| Routing keys enlazadas | `inscripcion.#`, `acceso.habilitado`, `cursos.evento.#`, `evaluacion.#`, `nota.final.calculada` |
| Dead letter | exchange `lms.notificaciones.dlx` (fanout) → cola `lms.notificaciones.dlq` |
| Publica | Nada |

Cambio respecto a la v1: al arrancar el servicio quita el binding de `certificado.emitido` (el certificado ahora nace aquí) y agrega `acceso.habilitado`, `inscripcion.#`, `evaluacion.#` y `nota.final.calculada`.

Claves de idempotencia (`evento_id` de la notificación): la bienvenida usa `inscripcionId`, así un `acceso.habilitado` repetido con otro `eventoId` no genera una segunda; `evaluacion.publicada` usa `eventoId` o, si falta, `evaluacionId`; el resto usa `eventoId`. El certificado además es único por `(curso_id, estudiante_id)`.

### Reglas del consumidor

- Si el `eventoId` ya se procesó, confirma el mensaje (ack) sin hacer nada.
- JSON roto, UUID inválido o campo obligatorio faltante: rechaza sin reintentar y el mensaje va a la DLQ.
- Error temporal (BD caída): devuelve el mensaje a la cola para reintentar.
- Si se cae RabbitMQ, reconecta solo.
- Cada evento se procesa en una transacción (`BEGIN`/`COMMIT`); con `prefetch(1)` se consume de a uno.

### Payloads que usa

Todos llevan `eventoId`, `tipoEvento` y `fechaEvento`.

`acceso.habilitado` (bienvenida):

```json
{ "eventoId": "UUID", "tipoEvento": "AccesoHabilitado", "inscripcionId": "UUID", "cursoId": "UUID",
  "estudianteId": "UUID", "codigoCurso": "SD-2026-01", "tituloCurso": "Sistemas Distribuidos",
  "fechaEvento": "2026-11-10T10:00:01" }
```

`inscripcion.rechazada`:

```json
{ "eventoId": "UUID", "tipoEvento": "InscripcionRechazada", "inscripcionId": "UUID", "cursoId": "UUID",
  "estudianteId": "UUID", "motivo": "CUPO_AGOTADO", "fechaEvento": "2026-11-10T10:00:01" }
```

`evaluacion.publicada`:

```json
{ "eventoId": "UUID", "tipoEvento": "EvaluacionPublicada", "evaluacionId": "UUID", "cursoId": "UUID",
  "tituloEvaluacion": "Examen parcial", "fechaCierre": "2026-11-25T23:59:00", "fechaEvento": "2026-11-18T08:00:00" }
```

`evaluacion.calificada` (obligatorios: `estudianteId`, `nota`):

```json
{ "eventoId": "UUID", "tipoEvento": "EvaluacionCalificada", "evaluacionId": "UUID", "estudianteId": "UUID",
  "cursoId": "UUID", "tituloEvaluacion": "Examen parcial", "tituloCurso": "Sistemas Distribuidos",
  "nota": 8.5, "fechaEvento": "2026-11-20T15:00:00" }
```

`nota.final.calculada` (dispara el certificado; obligatorios: `cursoId`, `estudianteId`, `notaFinal`, `aprobado`):

```json
{ "eventoId": "UUID", "tipoEvento": "NotaFinalCalculada", "cursoId": "UUID", "codigoCurso": "SD-2026-01",
  "tituloCurso": "Sistemas Distribuidos", "estudianteId": "UUID", "notaFinal": 8.7, "aprobado": true,
  "notaMinima": 7.0, "fechaEvento": "2026-12-20T10:00:00" }
```

`inscripcion.creada`, `inscripcion.cancelada` y `cursos.evento.*` usan los formatos de `integracion.md` 6.5, sin cambios.

## Estructura e integración como microservicio

El servicio funciona como microservicio cuando tiene su propio contenedor, su propia base y su cola, y los demás solo le hablan por eventos o por el gateway. Todo va dentro de `ms-certificados/`; no se toca la carpeta de otro servicio.

### Estructura de carpetas (tarea T1)

```
ms-certificados/
├── Dockerfile
├── package.json
├── .env.example
├── docker-compose.local.yml      # Postgres + este servicio; usa el RabbitMQ que ya corre
├── DOCUMENTACION.md
├── src/
│   ├── index.js                  # arranca Express, BD y RabbitMQ
│   ├── app.js                    # Express: /health, rutas y errores
│   ├── config/env.js             # lee las variables de entorno
│   ├── db/
│   │   ├── pool.js               # pool y enTransaccion()
│   │   └── schema.js             # CREATE TABLE notificaciones, inscritos, cursos, certificados
│   ├── messaging/
│   │   ├── conexion.js           # conexión y reconexión
│   │   └── consumidor.js         # cola, bindings, DLQ, ack/nack
│   ├── handlers/
│   │   ├── index.js              # manejadorPara(routingKey)
│   │   ├── notificaciones/       # inscripcion.js (creada, acceso, rechazada, cancelada), curso.js, evaluacion.js
│   │   └── certificados/
│   │       └── notaFinal.js      # nota.final.calculada
│   ├── routes/
│   │   ├── notificaciones.js
│   │   └── certificados.js
│   ├── middleware/
│   │   ├── duenio.js             # compara X-User-Id
│   │   └── errores.js            # formato de error común
│   └── lib/                      # validacion.js, notificar.js, estado.js, util.js
└── tests/                        # Jest: handlers.test.js, consumidor.test.js, fakeDb.js
```

El `start` del `package.json` es `node src/index.js`; `npm test` corre Jest.

### Variables de entorno

| Variable | Valor en Docker |
| --- | --- |
| `PORT` | `3000` |
| `DATABASE_URL` | `postgresql://admin:password@db_notificaciones:5432/notificaciones_db` |
| `RABBIT_URL` | `amqp://lms:lms123@rabbitmq:5672` |
| `RABBIT_EXCHANGE` | `lms.eventos.exchange` |
| `FRONTEND_URL` | `http://localhost:5173` |

### Dockerfile

Ya actualizado: copia solo `src/`, instala sin dependencias de desarrollo y tiene healthcheck.

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "src/index.js"]
```

### Entrada en el `docker-compose.yml` raíz

La agrega quien mantiene el compose (pregunta I5), pero este es el bloque de este servicio:

```yaml
  ms-certificados:
    build: ./ms-certificados
    container_name: lms_ms_certificados
    environment:
      PORT: 3000
      DATABASE_URL: postgresql://${NOTIF_DB_USER}:${NOTIF_DB_PASSWORD}@db_notificaciones:5432/notificaciones_db
      RABBIT_URL: amqp://${RABBIT_USER}:${RABBIT_PASS}@rabbitmq:5672
      RABBIT_EXCHANGE: lms.eventos.exchange
      FRONTEND_URL: http://localhost:5173
    depends_on:
      db_notificaciones: { condition: service_healthy }
      rabbitmq: { condition: service_healthy }
    networks: [lms-back]
    restart: unless-stopped
```

En desarrollo, `docker-compose.override.yml` publica el puerto `8004:3000`.

### Lo que te toca fuera de tu carpeta

- **api-gateway (T8):** resolvers `misNotificaciones`, `totalNoLeidas`, `marcarNotificacionLeida`, `marcarTodasLeidas`, `misCertificados`, `verificarCertificado` (pública) y el campo `Certificado.curso`. Llaman a `http://ms-certificados:3000`.
- **frontend (T7):** campana con el número de no leídas (consulta cada 15 s), lista de notificaciones con filtro, marcar una y marcar todas, "Mis certificados" y la página pública `/certificados/:codigo`.

### Rama

El plan dice `feature/ms-notificaciones-<tema>` desde `develop`, pero la guía del docente pide una rama por integrante. Pregunta abierta para el grupo: ¿se sigue con `certificados-Maria` o se crean ramas `feature/...`?

## Pasos de implementación y pruebas

Se hace una tarea por vez, en este orden, y se marca al terminar. Después de cada una se actualiza `DOCUMENTACION.md`.

- [x] **T1.** Separar `index.js` en la estructura de carpetas, sin cambiar comportamiento. Las pruebas 1 a 6 de `DOCUMENTACION.md` dan el mismo resultado.
- [x] **T2.** Bienvenida con `acceso.habilitado`; `inscripcion.creada` solo registra al inscrito. El estudiante recibe una sola bienvenida.
- [x] **T3.** Manejar `inscripcion.rechazada` y `inscripcion.cancelada`. Un rechazado no recibe "el curso ha comenzado".
- [x] **T4.** `evaluacion.publicada` avisa a todos los inscritos. Con tres inscritos hay tres notificaciones.
- [x] **T5.** Crear la tabla `certificados` al arrancar.
- [x] **T6.** Manejador de `nota.final.calculada` y quitar `certificado.emitido`.
- [x] **T7.** Endpoints de certificados.
- [x] **T9.** Contador de no leídas, marcar todas y rutas `/api/v1/...`.
- [x] **T10.** Validar `X-User-Id` (403 si no es el dueño).
- [x] **T11.** Formato de error común.
- [x] **T12.** Pruebas (tabla siguiente) con Jest para los manejadores.

### Estado de las pruebas (11 de noviembre)

- **Jest:** `npm test` → 33 pruebas pasan (manejadores de cada evento, código de verificación, duplicados, validaciones, y consumidor: JSON roto a DLQ, BD caída se reintenta).
- **Flujo completo con RabbitMQ y PostgreSQL reales** (eventos publicados en `lms.eventos.exchange`): el estudiante aprobado recibió en orden `INSCRIPCION`, `CURSO_INICIADO`, `EVALUACION_NUEVA`, `NOTA`, `CURSO_FINALIZADO`, `CERTIFICADO`; un `acceso.habilitado` repetido no duplicó la bienvenida; el rechazado solo recibió `INSCRIPCION_RECHAZADA`; tres `nota.final.calculada` aprobados del mismo alumno dejaron un solo `LMS-SD202601-0001`; el reprobado recibió `NOTA_FINAL`; el JSON roto quedó en la DLQ.
- **REST con curl:** 200 en lista, detalle y verificación pública; 403 al pedir lo de otro estudiante; 401 sin `X-User-Id`; 404 `NO_ENCONTRADO` en código falso; marcar todas deja `{ "total": 0 }`.
- Falta para el informe: capturas y la prueba de caída del servicio con Docker.

### Pruebas que se guardan para el informe

Cada una con captura (Postman o panel de RabbitMQ) y tiempo.

| Prueba | Cómo | Resultado esperado |
| --- | --- | --- |
| Bienvenida | Publicar `inscripcion.creada` y luego `acceso.habilitado` | Una sola notificación `INSCRIPCION` |
| Rechazo | Publicar `inscripcion.rechazada` con `CUPO_AGOTADO` | Notificación `INSCRIPCION_RECHAZADA`; sale de `inscritos` |
| Evaluación nueva | Tres inscritos y `evaluacion.publicada` | Tres `EVALUACION_NUEVA` con el mismo `eventoId` |
| Certificado | `nota.final.calculada` con 8.0 y `aprobado: true` | Un certificado `LMS-...-0001` y una notificación `CERTIFICADO` |
| No aprobado | `nota.final.calculada` con 5.0 y `aprobado: false` | Sin certificado; una `NOTA_FINAL` |
| Certificado duplicado | Publicar dos veces el mismo evento aprobado | Sigue habiendo un solo certificado |
| Verificación | `GET /api/v1/certificados/verificar/<real>` y `/<falso>` sin token | 200 con datos; 404 `NO_ENCONTRADO` |
| Dueño | Pedir certificados de otro estudiante | 403 `PROHIBIDO` |
| Marcar todas | `PATCH .../leidas` y luego `.../no-leidas/total` | `{ "total": 0 }` |
| Mensaje inválido | Publicar JSON roto | Queda en `lms.notificaciones.dlq`; el servicio sigue |
| Caída del servicio | `docker stop`, inscribir, volver a levantar | La notificación aparece al volver |

### Prueba rápida desde la terminal

```bash
# levantar este servicio y su base (RabbitMQ debe estar corriendo aparte, usuario lms)
cd ms-certificados
cp .env.example .env
docker compose -f docker-compose.local.yml up -d --build

# pruebas unitarias
npm install && npm test

# verificar que responde
curl http://localhost:8004/health

# ver certificados de un estudiante
curl -H "X-User-Id: <estudianteId>" \
  http://localhost:8004/api/v1/certificados/estudiante/<estudianteId>
```

Los eventos de prueba se publican desde el panel `http://localhost:15672` (Exchanges → `lms.eventos.exchange` → Publish message), con la routing key y el JSON de la sección de eventos.

### Pendientes detectados en otros servicios

- **ms-evaluaciones** publica hoy en el exchange `lms.exchange` con la routing key `evaluacion.aprobada`. Para que llegue el certificado debe publicar en `lms.eventos.exchange` los eventos `evaluacion.publicada`, `evaluacion.calificada` y `nota.final.calculada` con los payloads de arriba.
- **RabbitMQ** local no tiene el usuario `lms`/`lms123`; hay que crearlo (o definirlo en el compose raíz) para que el contenedor se conecte.
- **Compose raíz:** aún no tiene el bloque `ms-certificados` ni el healthcheck de `db_notificaciones` y `rabbitmq`.

### Terminado cuando

- Con todos los servicios reales, el estudiante del flujo completo recibe en orden: `INSCRIPCION`, `CURSO_INICIADO`, `EVALUACION_NUEVA`, `NOTA`, `CURSO_FINALIZADO`, `CERTIFICADO`.
- El código del certificado se verifica en `/api/v1/certificados/verificar/:codigo`.
- `DOCUMENTACION.md` está actualizada.
