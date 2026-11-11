# Microservicio de Cursos (`ms-cursos`) — Plataforma LMS / SIGED (UNL)

Backend del microservicio **`ms-cursos`** implementado con **Spring Boot 3.3.5 + OpenJDK 21 LTS**, **PostgreSQL 15** y **RabbitMQ**, siguiendo **Clean Architecture / DDD** y preconfigurado con las credenciales exactas del `docker-compose.yml` raíz del repositorio (`cursos_db`, `admin`, `password`, `db_cursos`).

## Ejecución Local Aislada (igual que `ms-notificaciones`)

1. Para levantar únicamente `ms-cursos` con su base de datos y RabbitMQ:
   ```bash
   docker compose -f docker-compose.local.yml up -d --build
   ```
2. Para programar y depurar desde **VS Code** con **`F5`**:
   ```bash
   docker compose -f docker-compose.local.yml up -d db_cursos rabbitmq
   ```
   Luego presiona **`F5`** en VS Code.

## Endpoints Principales (Puerto `8081`)
- **Swagger UI**: `http://localhost:8081/swagger-ui.html`
- **Catálogo de Cursos**: `GET http://localhost:8081/api/v1/cursos`
- **Cursos Activos (para API Gateway)**: `GET http://localhost:8081/api/v1/cursos/activos`
- **Validar Curso y Cupos (para `ms-inscripciones`)**: `GET http://localhost:8081/api/v1/cursos/{id}/validar`
- **Simular Evento `InscripcionCreada` en RabbitMQ**: `POST http://localhost:8081/api/v1/cursos/simulador/inscripcion-creada/{cursoId}`

-----------------------------------------------
Info adicional>
🚀 Info de integración de ms-cursos (Rama: cursos-Cristian | Puerto: 8081)

Ya está listo y funcionando el microservicio ms-cursos (Spring Boot 3 + Java 21 + PostgreSQL + RabbitMQ). Al levantar el contenedor se crea automáticamente un curso de prueba (codigo: "SD-2026-01", estado PUBLICADO, 40 cupos).

1. URLs HTTP (para api-gateway, frontend y ms-inscripciones):

Swagger UI (para ver y probar todos los endpoints): http://localhost:8081/swagger-ui.html

URL base desde el navegador / local: http://localhost:8081/api/v1/cursos

URL interna entre contenedores Docker: http://ms-cursos:8081/api/v1/cursos

Catálogo de cursos activos (para GraphQL / Frontend): GET /api/v1/cursos/activos

2. Para ms-inscripciones (Validación de curso + Descuento de cupos):

Validar por HTTP antes de inscribir: GET http://ms-cursos:8081/api/v1/cursos/{cursoId}/validar
Responde este JSON indicando si el curso existe y si tiene cupos disponibles:
{"cursoId":"...","codigo":"SD-2026-01","titulo":"...","estado":"PUBLICADO","existe":true,"inscribible":true,"cuposDisponibles":40,"precio":0.00}

Descontar cupo por RabbitMQ al confirmar inscripción:
Publicar en el Exchange lms.eventos.exchange con Routing Key inscripcion.creada (cola: lms.cursos.inscripciones.queue) este JSON:
{"inscripcionId":"UUID","cursoId":"UUID","estudianteId":"UUID","estadoInscripcion":"APROBADA","fechaInscripcion":"2026-11-09T10:00:00"}
(Nota: también dejé un endpoint simulador POST http://localhost:8081/api/v1/cursos/simulador/inscripcion-creada/{cursoId} para probar el evento sin levantar ms-inscripciones).

3. Para ms-notificaciones y ms-evaluaciones (Eventos que emite ms-cursos en RabbitMQ):

Exchange: lms.eventos.exchange (tipo topic)

Cola durable ya creada: lms.cursos.eventos.queue

Routing Keys: cursos.evento.creado, cursos.evento.actualizado, cursos.evento.estado, cursos.evento.cupo (o escuchar todo con cursos.evento.#)

Formato JSON que emite ms-cursos:
{"eventoId":"UUID","tipoEvento":"CursoCreado | CursoPublicado | CupoCursoActualizado","cursoId":"UUID","codigoCurso":"SD-2026-01","titulo":"...","docenteId":"11111111-2222-3333-4444-555555555555","estado":"PUBLICADO","cuposDisponibles":40,"precio":0.00,"fechaEvento":"2026-11-09T10:00:00"}
