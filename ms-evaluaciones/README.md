# Microservicio de evaluaciones

Servicio REST de evaluaciones y calificaciones para la plataforma LMS. Usa Java 17, Spring Boot, PostgreSQL y RabbitMQ.

## Ejecución local

1. Configura en el entorno las variables documentadas en `.env.example`.
2. Asegura que PostgreSQL tenga una base `evaluaciones_db` y RabbitMQ tenga el usuario configurado.
3. Ejecuta `mvn spring-boot:run` desde esta carpeta.

El servicio escucha en `http://localhost:8083`. Swagger UI está en `/swagger-ui.html`; health check en `/actuator/health`.

## Compose de desarrollo

Desde la raíz del repositorio, el perfil de evaluaciones inicia RabbitMQ, PostgreSQL y este servicio, sin levantar los demás componentes:

```sh
docker compose --profile evaluaciones up -d --build ms-evaluaciones
docker compose ps
docker compose logs -f ms-evaluaciones
```

El puerto REST queda disponible solo en `127.0.0.1:8083`. RabbitMQ usa el usuario `lms` y contraseña `lms123` por defecto; se pueden cambiar con `RABBITMQ_USER` y `RABBITMQ_PASSWORD`. PostgreSQL conserva los datos en `db_evaluaciones_data`.

Para abrir el prototipo aislado de la futura integración GraphQL:

```sh
docker compose --profile evaluaciones --profile prototipo-evaluaciones \
  up -d --build ms-evaluaciones prototipo-evaluaciones
```

Abre `http://localhost:5174`. El prototipo no forma parte del frontend principal, usa únicamente la API REST de evaluaciones y permite introducir cabeceras/IDs simulados. Debe usarse solo en desarrollo local.

## API

Todos los endpoints protegidos esperan `X-User-Id` (UUID) y `X-User-Rol` (`ADMINISTRADOR`, `DOCENTE` o `ESTUDIANTE`). En el despliegue integrado, esas cabeceras las agrega el API Gateway después de validar el JWT.

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/v1/evaluaciones` | Crear borrador |
| GET | `/api/v1/evaluaciones` | Listar (administrador) |
| GET | `/api/v1/evaluaciones/{id}` | Consultar evaluación |
| GET | `/api/v1/evaluaciones/curso/{cursoId}` | Consultar por curso |
| PUT | `/api/v1/evaluaciones/{id}` | Editar borrador |
| PATCH | `/api/v1/evaluaciones/{id}/publicar` | Publicar |
| PATCH | `/api/v1/evaluaciones/{id}/cerrar` | Cerrar |
| POST | `/api/v1/evaluaciones/{id}/calificaciones` | Registrar o corregir una calificación |
| GET | `/api/v1/evaluaciones/{id}/calificaciones` | Listar calificaciones (docente/administrador) |
| GET | `/api/v1/calificaciones/estudiante/{estudianteId}?cursoId=` | Consultar calificaciones |
| GET | `/api/v1/calificaciones/curso/{cursoId}/final` | Consultar notas finales |

Ejemplo para crear una evaluación:

```json
{
  "cursoId": "UUID",
  "titulo": "Examen parcial",
  "descripcion": "Unidades 1 y 2",
  "tipo": "EXAMEN",
  "peso": 30,
  "fechaApertura": "2026-11-18T08:00:00",
  "fechaCierre": "2026-11-25T23:59:00"
}
```

La nota máxima se establece en 10 si se omite. La suma de los pesos de las evaluaciones de un curso no puede superar 100.

## Mensajería

Publica y consume eventos JSON en `lms.eventos.exchange`. Consume `acceso.habilitado`, `inscripcion.cancelada` y `cursos.evento.*`. Los eventos entrantes se deduplican por `eventoId`; mensajes inválidos y mensajes que exceden los reintentos van a `lms.evaluaciones.dlq`.

Publica `evaluacion.publicada`, `evaluacion.calificada` y `nota.final.calculada`. La nota final es la suma ponderada `nota × peso / 100`; una evaluación sin calificación aporta cero. Al finalizar el curso, las evaluaciones se cierran y las notas finales ya guardadas no se recalculan.

Los detalles de campos y eventos se mantienen en `../plan-desarrollo/integracion.md`.

## Pruebas

Las pruebas unitarias se ejecutan con `mvn test`. La prueba de integración inicia PostgreSQL y RabbitMQ desechables con Testcontainers y recorre el flujo de evento de curso, habilitación del estudiante, creación/publicación, calificación y cálculo de nota final:

```sh
mvn verify
```

Docker debe estar disponible para ejecutar `EvaluacionesIntegrationTest`.
