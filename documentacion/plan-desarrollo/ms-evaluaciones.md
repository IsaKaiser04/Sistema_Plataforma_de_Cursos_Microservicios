# Plan de desarrollo: ms-evaluaciones

| Dato | Valor |
|---|---|
| Responsable | Josué Asanza |
| Carpeta | `ms-evaluaciones/` |
| Rama de trabajo | `feature/ms-evaluaciones-<tema>` desde `develop` |
| Tecnología actual | Spring Boot 3.2.5, Java 21, Spring Data JPA, PostgreSQL, Spring AMQP, Lombok, Bean Validation |
| Puerto | 8083 |
| Base de datos | `evaluaciones_db` |
| Depende de | ms-cursos (HTTP, solo si falta la copia local), RabbitMQ |
| Lo usan | api-gateway |

## 1. Reglas para el agente

Además de las reglas del `README.md`:

- Este servicio no emite certificados. Calcula la nota final cuando el curso termina y publica `nota.final.calculada`; el certificado lo genera ms-notificaciones (María). No crees tablas ni endpoints de certificados aquí.
- Los datos de cursos y de estudiantes inscritos se guardan como copias locales que llegan por eventos. No llames a ms-cursos en cada operación.
- Antes de agregar funciones nuevas hay que alinear la mensajería con el resto del equipo (T1). Hasta que T1 esté hecha, este servicio no se puede integrar.

## 2. Qué hay hoy y qué se conserva

Funciona y se conserva:
- `POST /api/v1/evaluaciones`, `GET /api/v1/evaluaciones` y `GET /api/v1/evaluaciones/curso/{cursoId}`.
- Entidad `Evaluacion` con `id`, `titulo`, `cursoId`, `calificacionMinima`, `fechaCreacion`.
- `CursoClient` con `RestClient`.

Está mal o falta:
- Usa el exchange `lms.exchange`; el del equipo es `lms.eventos.exchange`.
- Escucha `curso.inscrito`, que nadie publica, y publica `evaluacion.aprobada`, que nadie escucha.
- Los mensajes son `String`; los demás servicios mandan objetos JSON.
- El consumidor solo imprime el mensaje y el productor no se usa.
- `CursoClient` apunta a `localhost:8081` fijo y no se usa.
- `application.yml` tiene `localhost`, usuario `guest` y BD `db_evaluaciones` fijos.
- El controlador devuelve la entidad directamente y recibe la entidad en el POST.
- `@CrossOrigin` en el controlador (el frontend va a pasar por el gateway).
- No hay calificaciones ni nota final, aunque el frontend ya tiene `CalificarEvaluacion`.
- `target/` está en el repositorio y no hay `.gitignore` ni `Dockerfile` funcional probado.

## 3. Tareas

- [ ] **T1. Alinear la mensajería.** Exchange `lms.eventos.exchange` (topic, durable). `Jackson2JsonMessageConverter` en `RabbitTemplate` y en el listener. Quitar `curso.inscrito` y `evaluacion.aprobada`. Cola `lms.evaluaciones.queue` con las routing keys de T5. Cola de errores `lms.evaluaciones.dlq`.
  Aceptación: al arrancar, en el panel de RabbitMQ aparece `lms.evaluaciones.queue` enlazada a `lms.eventos.exchange`.

- [ ] **T2. Configuración por variables.** `application.yml` con `${DB_HOST:localhost}`, `${DB_NAME:evaluaciones_db}`, etc., igual que ms-cursos. Usuario de RabbitMQ `lms`. `CursoClient` con la URL desde `CURSOS_SERVICE_URL`. Agregar `.gitignore`, sacar `target/` del repo, revisar el `Dockerfile`. Agregar springdoc-openapi y Actuator.
  Aceptación: el servicio arranca en Docker sin tocar el código, solo con variables.

- [ ] **T3. Reestructurar paquetes.** Según P1. Separar DTO de entidades: `EvaluacionRequest` y `EvaluacionResponse`. Agregar manejador global de errores con el formato de `integracion.md` sección 5. Quitar `@CrossOrigin`.
  Aceptación: crear una evaluación sin título devuelve 400 con el formato común.

- [ ] **T4. Modelo de datos completo.** Entidades y tablas:
  - `evaluaciones`: agregar `descripcion`, `tipo` (`EXAMEN`, `TAREA`, `PROYECTO`), `estado` (`BORRADOR`, `PUBLICADA`, `CERRADA`), `peso`, `nota_maxima`, `fecha_apertura`, `fecha_cierre`, `modulo_id` (opcional). Quitar `calificacion_minima` según P4.
  - `calificaciones`: `id`, `evaluacion_id` (FK), `estudiante_id`, `nota`, `retroalimentacion`, `calificado_por`, `fecha_calificacion`. Única por `(evaluacion_id, estudiante_id)`.
  - `estudiantes_habilitados`: PK `(curso_id, estudiante_id)`, `inscripcion_id`, `estado` (`ACTIVO`, `RETIRADO`), `fecha`.
  - `cursos_local`: `curso_id` (PK), `codigo`, `titulo`, `estado`, `docente_id`.
  - `notas_finales`: PK `(curso_id, estudiante_id)`, `nota_final`, `aprobado`, `fecha_calculo`.
  - `eventos_procesados`: `evento_id` (PK), `fecha`.
  Aceptación: las seis tablas se crean al arrancar.

- [ ] **T5. Consumir eventos.** `acceso.habilitado` agrega al estudiante habilitado; `inscripcion.cancelada` lo marca RETIRADO; `cursos.evento.creado` y `cursos.evento.actualizado` actualizan `cursos_local`; `cursos.evento.eliminado` borra la copia; `cursos.evento.estado` actualiza el estado y, si es `FINALIZADO`, dispara T9. Idempotencia por `eventoId`.
  Aceptación: con el simulador de ms-cursos, después de una inscripción el estudiante aparece en `estudiantes_habilitados`.

- [ ] **T6. CRUD de evaluaciones.** `POST /api/v1/evaluaciones` (queda en BORRADOR), `GET /{id}`, `PUT /{id}` (solo en BORRADOR), `PATCH /{id}/publicar`, `PATCH /{id}/cerrar`. Al crear, si el curso no está en `cursos_local`, consultarlo con `CursoClient`; si no existe, 404. La suma de pesos de un curso no pasa de 100. Al publicar, publicar `evaluacion.publicada`.
  Aceptación: crear evaluaciones con pesos 60 y 50 en el mismo curso devuelve 409 en la segunda.

- [ ] **T7. Calificar.** `POST /api/v1/evaluaciones/{id}/calificaciones` con `{ estudianteId, nota, retroalimentacion }`. La nota va de 0 a la nota máxima. Solo estudiantes habilitados y solo en evaluaciones PUBLICADAS. Si ya tiene nota, se actualiza según P5. Publicar `evaluacion.calificada`. Además `GET /api/v1/evaluaciones/{id}/calificaciones` y `GET /api/v1/calificaciones/estudiante/{estudianteId}?cursoId=`.
  Aceptación: calificar a un estudiante que no está inscrito devuelve 409.

- [ ] **T8. Permisos.** Leer `X-User-Id` y `X-User-Rol`. Crear, editar, publicar, cerrar y calificar: solo el docente del curso (`cursos_local.docente_id`) o ADMINISTRADOR. Un estudiante solo ve sus propias notas.
  Aceptación: un estudiante que consulta las notas de otro recibe 403.

- [ ] **T9. Nota final.** Al recibir `cursos.evento.estado` con `FINALIZADO`: calcular la nota final de cada estudiante habilitado como suma de `nota × peso / 100` (sin nota cuenta 0), marcar `aprobado` si es mayor o igual a la mínima de P4, guardarla en `notas_finales` y publicar un `nota.final.calculada` por cada estudiante (payload en `integracion.md` sección 6). Si el curso ya tenía notas finales, no se recalcula (según P6). Endpoint: `GET /api/v1/calificaciones/curso/{cursoId}/final`.
  Aceptación: con dos estudiantes (8.0 y 5.0), al finalizar el curso se publican dos eventos, uno con `aprobado: true` y otro con `aprobado: false`.

- [ ] **T10. Pruebas.** Según P8. Como mínimo: suma de pesos, calificar a no inscrito, cálculo de nota final y que no se publique dos veces la nota final del mismo estudiante.

## 4. Cuestionario del desarrollador

Responde debajo de cada pregunta. Si eliges la recomendada, escribe "recomendada".

**P1. ¿Se reorganizan los paquetes igual que ms-cursos (`api`, `application`, `domain`, `infrastructure`, `core/config`)?**
Recomendada: sí, para que el equipo se ubique igual en los dos servicios Java. Hoy usas `core/models` y `application/services`.
Respuesta:

**P2. ¿Se sigue usando Lombok?**
Recomendada: sí en entidades; para DTO usar `record` de Java como ms-cursos.
Respuesta:

**P3. ¿Las evaluaciones tienen preguntas y respuestas dentro de la plataforma?**
Recomendada: no. La evaluación es un registro con título, tipo, peso y fechas, y el docente pone la nota. Resolver exámenes en línea queda fuera de alcance.
Respuesta:

**P4. ¿Cuál es la nota mínima para aprobar y dónde se guarda?**
Recomendada: 7.0 sobre 10 para todos los cursos, en `application.yml` (`lms.evaluaciones.nota-minima`). Hoy la entidad tiene `calificacionMinima` con 3.0 por defecto en cada evaluación.
Respuesta:

**P5. ¿Se puede cambiar una nota ya registrada?**
Recomendada: sí, mientras la evaluación no esté CERRADA; cada cambio vuelve a publicar `evaluacion.calificada`.
Respuesta:

**P6. ¿Se puede recalcular la nota final si el docente corrige una nota después de finalizar el curso?**
Recomendada: no. Al finalizar, la nota final queda fija y las evaluaciones del curso pasan a CERRADA.
Respuesta:

**P7. ¿Se muestra la nota final al estudiante antes de que el curso finalice?**
Recomendada: no, solo las notas de cada evaluación. La nota final existe desde que el curso pasa a FINALIZADO.
Respuesta:

**P8. ¿Con qué se hacen las pruebas?**
Recomendada: JUnit 5 + Mockito para el cálculo de nota final y las reglas, y Postman para las evidencias.
Respuesta:

**P9. ¿Las fechas de apertura y cierre bloquean la calificación?**
Recomendada: no, son informativas para el estudiante. Lo que bloquea es el estado CERRADA.
Respuesta:

**P10. ¿Algo que quieras hacer distinto a lo que dice este plan?**
Respuesta:

## 5. Contrato de este servicio

| Método | Ruta | Rol |
|---|---|---|
| POST | `/api/v1/evaluaciones` | DOCENTE del curso |
| GET | `/api/v1/evaluaciones` | ADMINISTRADOR |
| GET | `/api/v1/evaluaciones/{id}` | con acceso al curso |
| GET | `/api/v1/evaluaciones/curso/{cursoId}` | inscritos, DOCENTE |
| PUT | `/api/v1/evaluaciones/{id}` | DOCENTE del curso |
| PATCH | `/api/v1/evaluaciones/{id}/publicar` | DOCENTE del curso |
| PATCH | `/api/v1/evaluaciones/{id}/cerrar` | DOCENTE del curso |
| POST | `/api/v1/evaluaciones/{id}/calificaciones` | DOCENTE del curso |
| GET | `/api/v1/evaluaciones/{id}/calificaciones` | DOCENTE del curso |
| GET | `/api/v1/calificaciones/estudiante/{estudianteId}?cursoId=` | el estudiante, DOCENTE |
| GET | `/api/v1/calificaciones/curso/{cursoId}/final` | DOCENTE del curso |
| GET | `/actuator/health` | interno |

Crear evaluación:

```json
{ "cursoId": "UUID", "titulo": "Examen parcial", "descripcion": "Unidades 1 y 2", "tipo": "EXAMEN",
  "peso": 30, "fechaApertura": "2026-11-18T08:00:00", "fechaCierre": "2026-11-25T23:59:00" }
```

Calificar:

```json
{ "estudianteId": "UUID", "nota": 8.5, "retroalimentacion": "Faltó el diagrama de secuencia" }
```

Eventos: publica `evaluacion.publicada`, `evaluacion.calificada` y `nota.final.calculada`; consume `acceso.habilitado`, `inscripcion.cancelada` y `cursos.evento.*`. Payloads en `integracion.md` sección 6.

Variables de entorno:

| Variable | Ejemplo |
|---|---|
| `SERVER_PORT` | `8083` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `db_evaluaciones`, `5432`, `evaluaciones_db`, `admin`, `password` |
| `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD` | `rabbitmq`, `5672`, `lms`, `lms123` |
| `CURSOS_SERVICE_URL` | `http://ms-cursos:8081` |
| `LMS_NOTA_MINIMA` | `7.0` |

## 6. Fuera de alcance

No hacer: exámenes en línea con preguntas, entrega de archivos de tareas, cronómetro de examen, calificación automática, certificados (los genera ms-notificaciones).

## 7. Terminado cuando

- Todas las tareas marcadas y sus criterios probados.
- Con ms-cursos real, un estudiante inscrito recibe nota y, al finalizar el curso, su nota final.
- ms-notificaciones recibe `evaluacion.calificada` y `nota.final.calculada` sin errores en su DLQ.

## 8. Notas para otros servicios

(El agente escribe aquí lo que encontró que otro servicio tiene que cambiar.)
