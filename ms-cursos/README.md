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
