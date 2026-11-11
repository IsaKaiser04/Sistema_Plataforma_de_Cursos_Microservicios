# Plan de desarrollo: ms-notificaciones (incluye certificados)

| Dato | Valor |
|---|---|
| Responsable | María Chuico |
| Carpeta | `ms-notificaciones/` |
| Rama de trabajo | `feature/ms-notificaciones-<tema>` desde `develop` |
| Tecnología actual | Node.js 22, Express 4, pg, amqplib |
| Puerto | 3000 interno (8004 en local) |
| Base de datos | `notificaciones_db` |
| Depende de | RabbitMQ (no llama a ningún servicio por HTTP) |
| Lo usan | api-gateway |

Este servicio tiene dos módulos dentro del mismo proyecto:

- Notificaciones: convierte los eventos del sistema en mensajes para el estudiante.
- Certificados: cuando ms-evaluaciones avisa que un estudiante aprobó un curso, genera su certificado con un código de verificación y lo expone por REST.

En el diagrama de arquitectura del ABP aparece como "ms-notificaciones (Alertas y Certificados)".

## 1. Reglas para el agente

Además de las reglas del `README.md`:

- Este servicio ya está probado (ver `DOCUMENTACION.md`, pruebas del 9 de noviembre). No cambies la lógica de idempotencia, DLQ, reconexión ni transacciones; las tareas solo agregan manejadores, tablas y endpoints.
- No agregues llamadas HTTP a otros servicios. Todo lo que necesita (inscritos, título y código del curso, nota final) sale de los eventos.
- El módulo de certificados va en sus propios archivos (`handlers/certificados`, `routes/certificados`, etc.), separado del de notificaciones, aunque comparten la base de datos y la conexión a RabbitMQ.
- ms-evaluaciones calcula la nota final y decide si el estudiante aprobó. Este servicio no recalcula notas; solo emite el certificado cuando el evento dice `aprobado: true`.
- Cada manejador nuevo sigue la misma forma que los que ya están en `manejadorPara()`.
- Actualiza `DOCUMENTACION.md` en cada tarea.

## 2. Qué hay hoy y qué se conserva

Funciona y se conserva:
- Consume `inscripcion.creada`, `cursos.evento.*`, `evaluacion.calificada` y `certificado.emitido` desde `lms.notificaciones.queue`.
- Tablas `notificaciones`, `inscritos` y `cursos`, creadas al arrancar.
- Idempotencia por `eventoId`, DLQ `lms.notificaciones.dlq`, reconexión a RabbitMQ y BD.
- `GET /health`, `GET /notificaciones/:estudianteId?estado=`, `PATCH /notificaciones/:id/leida`.

Falta o cambia:
- La bienvenida se manda con `inscripcion.creada`, pero la inscripción ahora nace PENDIENTE y se confirma con `acceso.habilitado`.
- No escucha `acceso.habilitado`, `inscripcion.rechazada`, `inscripcion.cancelada` ni `evaluacion.publicada`.
- Hoy espera `certificado.emitido` desde ms-evaluaciones. Como los certificados ahora los genera este servicio, ese evento ya no llega: se reemplaza por `nota.final.calculada`.
- No hay tabla ni endpoints de certificados.
- No hay contador de no leídas ni "marcar todas".
- No está en el `docker-compose.yml` raíz (solo su base).
- Todo está en `index.js`.

## 3. Tareas

Notificaciones:

- [ ] **T1. Separar archivos.** Según P1, dividir `index.js` en `src/config`, `src/db`, `src/messaging` (conexión y consumidor), `src/handlers/notificaciones`, `src/handlers/certificados`, `src/routes`. Sin cambiar comportamiento.
  Aceptación: las pruebas 1 a 6 de `DOCUMENTACION.md` siguen dando el mismo resultado.

- [ ] **T2. Bienvenida con `acceso.habilitado`.** `inscripcion.creada` ya no crea notificación; solo registra al estudiante en `inscritos` (según P2). `acceso.habilitado` crea la notificación `INSCRIPCION` con el título del curso y, si el estudiante no estaba en `inscritos`, lo agrega.
  Aceptación: con el flujo real, el estudiante recibe una sola bienvenida y solo después de que ms-cursos confirma el cupo.

- [ ] **T3. Rechazo y cancelación.** `inscripcion.rechazada` crea `INSCRIPCION_RECHAZADA` con un mensaje según el motivo (`CUPO_AGOTADO`, `CURSO_NO_DISPONIBLE`, `CURSO_NO_EXISTE`) y quita al estudiante de `inscritos`. `inscripcion.cancelada` lo quita de `inscritos` sin notificar (según P3).
  Aceptación: un estudiante rechazado no recibe el aviso de "el curso ha comenzado".

- [ ] **T4. Nueva evaluación.** `evaluacion.publicada` crea `EVALUACION_NUEVA` para todos los inscritos del curso, con el título y la fecha de cierre.
  Aceptación: con tres inscritos se crean tres notificaciones con el mismo `eventoId`.

Certificados:

- [ ] **T5. Tabla de certificados.** Tabla `certificados`: `id` (UUID, PK), `codigo_verificacion` (único), `curso_id`, `estudiante_id`, `codigo_curso`, `titulo_curso`, `nota_final`, `fecha_emision`. Única por `(curso_id, estudiante_id)`. Se crea al arrancar, como las demás.
  Aceptación: la tabla existe después de arrancar y las tablas anteriores no se tocan.

- [ ] **T6. Emitir certificados con `nota.final.calculada`.** Quitar el manejador de `certificado.emitido` y el binding de esa routing key. Nuevo manejador para `nota.final.calculada`:
  - Si `aprobado` es `true`: crear el certificado con el código de P5 (si ya existe para ese curso y estudiante, no hacer nada) y crear la notificación `CERTIFICADO` con el enlace de verificación (`FRONTEND_URL/certificados/<codigo>`).
  - Si `aprobado` es `false`: crear la notificación `NOTA_FINAL` con la nota, según P6.
  - Todo en una transacción, como los otros manejadores.
  Aceptación: con dos eventos (8.0 aprobado y 5.0 no aprobado) hay un certificado, una notificación CERTIFICADO y una NOTA_FINAL. Si se repite el evento aprobado, sigue habiendo un solo certificado.

- [ ] **T7. Endpoints de certificados.** `GET /api/v1/certificados/estudiante/:estudianteId` (lista del estudiante), `GET /api/v1/certificados/:id` (detalle, solo el dueño) y `GET /api/v1/certificados/verificar/:codigo` (público; responde los datos del certificado o 404). Formato en la sección 5.
  Aceptación: verificar un código que no existe devuelve 404 con el formato común.

- [ ] **T8. PDF del certificado.** Solo si en P7 se responde que sí: `GET /api/v1/certificados/:id/pdf` que genera el PDF al momento con los datos de la tabla. Si en P7 se responde que no, marcar esta tarea como descartada.

Comunes:

- [ ] **T9. Endpoints nuevos de notificaciones.** `GET /api/v1/notificaciones/:estudianteId/no-leidas/total` responde `{ "total": 3 }`. `PATCH /api/v1/notificaciones/:estudianteId/leidas` marca todas como leídas y responde `{ "actualizadas": 3 }`. Mover las rutas actuales a `/api/v1/...` según P4.
  Aceptación: después de marcar todas, el total es 0.

- [ ] **T10. Dueño de los datos.** Leer `X-User-Id`. Un estudiante solo puede ver y marcar sus propias notificaciones y ver sus propios certificados; si no coincide responde 403. La verificación por código es pública.
  Aceptación: pedir los certificados de otro estudiante devuelve 403.

- [ ] **T11. Formato de error común.** Respuestas de error con el formato de `integracion.md` sección 5.
  Aceptación: `GET /api/v1/notificaciones/abc` devuelve 400 con ese formato.

- [ ] **T12. Pruebas.** Según P8. Repetir las pruebas de `DOCUMENTACION.md` con los eventos nuevos y agregar los casos de T2 a T10, en especial el certificado duplicado.

## 4. Cuestionario del desarrollador

Responde debajo de cada pregunta. Si eliges la recomendada, escribe "recomendada".

**P1. ¿Se divide `index.js` en varios archivos?**
Recomendada: sí, con la estructura de T1, para que los módulos de notificaciones y certificados queden separados.
Respuesta:

**P2. ¿`inscripcion.creada` sigue generando algún mensaje?**
Recomendada: no, solo registra al inscrito. El mensaje lo manda `acceso.habilitado`.
Respuesta:

**P3. ¿Se notifica cuando el estudiante cancela su inscripción?**
Recomendada: no, porque la acción la hizo él mismo.
Respuesta:

**P4. ¿Las rutas pasan a `/api/v1/notificaciones` y `/api/v1/certificados`?**
Recomendada: sí, igual que los demás servicios.
Respuesta:

**P5. ¿Cómo es el código de verificación del certificado?**
Recomendada: `LMS-<codigoCurso sin guiones>-<4 dígitos correlativos por curso>`, por ejemplo `LMS-SD202601-0001`. Es fácil de leer y de escribir en la página de verificación.
Respuesta:

**P6. ¿Se avisa la nota final a los que no aprobaron?**
Recomendada: sí, con una notificación `NOTA_FINAL` que dice la nota y que no alcanzó el mínimo.
Respuesta:

**P7. ¿Se genera un PDF del certificado?**
Recomendada: no. El certificado se muestra en una página del frontend con su código de verificación. Si el docente lo pide, se hace T8 con la librería `pdfkit`.
Respuesta:

**P8. ¿Con qué se hacen las pruebas?**
Recomendada: seguir con las pruebas manuales documentadas (curl y panel de RabbitMQ) y agregar Jest para los manejadores con una BD de prueba.
Respuesta:

**P9. ¿Certificados queda como módulo dentro de este servicio o como contenedor aparte (ms-certificados)?**
Recomendada: módulo dentro de ms-notificaciones, con el mismo contenedor y la misma base. Separarlo implica otra base, otra cola y otra entrada en el compose y en el gateway.
Respuesta:

**P10. ¿Se borran notificaciones viejas?**
Recomendada: no, se guardan todas.
Respuesta:

**P11. ¿Se mandan correos además de guardar la notificación?**
Recomendada: no, solo notificaciones dentro de la plataforma.
Respuesta:

**P12. ¿Algo que quieras hacer distinto a lo que dice este plan?**
Respuesta:

## 5. Contrato de este servicio

| Método | Ruta | Rol |
|---|---|---|
| GET | `/health` | interno |
| GET | `/api/v1/notificaciones/:estudianteId?estado=ENVIADA\|LEIDA` | el estudiante |
| GET | `/api/v1/notificaciones/:estudianteId/no-leidas/total` | el estudiante (nuevo) |
| PATCH | `/api/v1/notificaciones/:id/leida` | el estudiante |
| PATCH | `/api/v1/notificaciones/:estudianteId/leidas` | el estudiante (nuevo) |
| GET | `/api/v1/certificados/estudiante/:estudianteId` | el estudiante (nuevo) |
| GET | `/api/v1/certificados/:id` | el estudiante (nuevo) |
| GET | `/api/v1/certificados/verificar/:codigo` | público (nuevo) |
| GET | `/api/v1/certificados/:id/pdf` | el estudiante (solo si P7 es sí) |

Respuesta de un certificado:

```json
{ "id": "UUID", "codigoVerificacion": "LMS-SD202601-0001", "estudianteId": "UUID", "cursoId": "UUID",
  "codigoCurso": "SD-2026-01", "tituloCurso": "Sistemas Distribuidos", "notaFinal": 8.7,
  "fechaEmision": "2026-12-20T10:00:00", "url": "http://localhost:5173/certificados/LMS-SD202601-0001" }
```

Tipos de notificación: `INSCRIPCION`, `INSCRIPCION_RECHAZADA`, `CURSO_INICIADO`, `CURSO_FINALIZADO`, `EVALUACION_NUEVA`, `NOTA`, `NOTA_FINAL`, `CERTIFICADO`.

Eventos que consume: `inscripcion.creada`, `inscripcion.cancelada`, `acceso.habilitado`, `inscripcion.rechazada`, `cursos.evento.*`, `evaluacion.publicada`, `evaluacion.calificada`, `nota.final.calculada`. No publica eventos. Payloads en `integracion.md` sección 6.

Variables de entorno:

| Variable | Ejemplo |
|---|---|
| `PORT` | `3000` |
| `DATABASE_URL` | `postgresql://admin:password@db_notificaciones:5432/notificaciones_db` |
| `RABBIT_URL` | `amqp://lms:lms123@rabbitmq:5672` |
| `RABBIT_EXCHANGE` | `lms.eventos.exchange` |
| `FRONTEND_URL` | `http://localhost:5173` (para armar el enlace del certificado) |

## 6. Fuera de alcance

No hacer: correo electrónico, notificaciones push, WebSockets, notificaciones para docentes, preferencias de notificación por usuario, firma digital del certificado, revocar certificados, recalcular notas.

## 7. Terminado cuando

- Todas las tareas marcadas y sus criterios probados (T8 solo si P7 es sí).
- Con todos los servicios reales, el estudiante del flujo completo recibe en orden: INSCRIPCION, CURSO_INICIADO, EVALUACION_NUEVA, NOTA, CURSO_FINALIZADO, CERTIFICADO.
- El código del certificado se puede verificar en `/api/v1/certificados/verificar/:codigo`.
- `DOCUMENTACION.md` actualizada.

## 8. Notas para otros servicios

(El agente escribe aquí lo que encontró que otro servicio tiene que cambiar.)
