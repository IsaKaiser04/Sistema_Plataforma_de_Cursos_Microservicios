# Plan de desarrollo: ms-cursos

| Dato | Valor |
|---|---|
| Responsable | Cristian Tomalá |
| Carpeta | `ms-cursos/` |
| Rama de trabajo | `feature/ms-cursos-<tema>` desde `develop` |
| Tecnología actual | Spring Boot 3.3.5, Java 21, Spring Data JPA, PostgreSQL 15, Spring AMQP, springdoc-openapi, Actuator |
| Puerto | 8081 |
| Base de datos | `cursos_db` |
| Depende de | ms-usuarios (HTTP, valida docentes), RabbitMQ |
| Lo usan | api-gateway, ms-usuarios (valida cursos), ms-evaluaciones |

## 1. Reglas para el agente

Además de las reglas del `README.md`:

- Este es el servicio más avanzado. No reestructures paquetes ni renombres clases que ya funcionan. Las tareas agregan cosas; no reescriben.
- Respeta la estructura actual: `api`, `application`, `domain`, `infrastructure`, `core/config`.
- El payload `CursoEventoPayload` y el `InscripcionCreadaEvent` ya los consumen otros servicios. No cambies nombres de campos.
- El `SimuladorEventosController` se queda mientras se desarrolla, pero solo debe cargarse con el perfil que se defina en P6.

## 2. Qué hay hoy y qué se conserva

Funciona y se conserva:
- CRUD de cursos y módulos en `/api/v1/cursos`, con validaciones en `CursoRequest` y `ModuloRequest`.
- Estados `BORRADOR`, `PUBLICADO`, `EN_CURSO`, `FINALIZADO`, `ARCHIVADO` y niveles `BASICO`, `INTERMEDIO`, `AVANZADO`.
- `GET /{id}/validar` para ms-usuarios.
- Publica `cursos.evento.creado|actualizado|estado|cupo|eliminado` en `lms.eventos.exchange`.
- Consume `inscripcion.creada` en `lms.cursos.inscripciones.queue` y descuenta cupo.
- `GlobalExceptionHandler`, Swagger, `DataInitializer` con el curso SD-2026-01.
- Cliente de usuarios con modo simulado (`USUARIOS_SERVICE_MOCK`).

## 3. Tareas

- [x] **T1. Tabla de reservas de cupo.** Entidad `ReservaCupo` (tabla `reservas_cupo`): `inscripcion_id` (PK), `curso_id`, `estudiante_id`, `estado` (`RESERVADO`, `LIBERADO`), `fecha`.
- [x] **T2. Respuesta a la inscripción.** Modificar `procesarReservaCupoPorInscripcion`: idempotencia por `inscripcionId`, descuento de cupo, guardado de reserva, publicación de `cursos.evento.cupo` y `acceso.habilitado` o `inscripcion.rechazada` (`CUPO_AGOTADO`, `CURSO_NO_DISPONIBLE`, `CURSO_NO_EXISTE`).
- [x] **T3. Liberar cupo.** Enlazar `inscripcion.cancelada` a `lms.cursos.inscripciones.queue`. Liberar cupo si existe reserva `RESERVADO`, marcar `LIBERADO` y publicar `cursos.evento.cupo`.
- [x] **T4. Errores en el consumidor.** Configurar `lms.cursos.dlq` con `lms.cursos.dlx` y `default-requeue-rejected: false`.
- [x] **T5. Transiciones de estado.** Validar en el dominio solo BORRADOR→PUBLICADO, PUBLICADO→BORRADOR, PUBLICADO→EN_CURSO, EN_CURSO→FINALIZADO, FINALIZADO→ARCHIVADO. Las demás lanzan `BusinessRuleException` (409 `TRANSICION_INVALIDA`).
- [x] **T6. Eliminar solo borradores.** `DELETE /{id}` solo en estado BORRADOR; en otro estado devuelve 409.
- [x] **T7. Editar y borrar módulos.** `PUT /api/v1/cursos/{id}/modulos/{moduloId}` y `DELETE /api/v1/cursos/{id}/modulos/{moduloId}`. El `orden` no se repite dentro del curso. Publicar `cursos.evento.actualizado`.
- [x] **T8. Permisos.** Leer `X-User-Id` y `X-User-Rol` mediante `HandlerInterceptor`. Crear curso: ADMINISTRADOR o DOCENTE. Editar, cambiar estado y módulos: docente dueño o ADMINISTRADOR. Eliminar: ADMINISTRADOR.
- [x] **T9. Limpieza de configuración.** URL por defecto `http://ms-usuarios:3004`, eliminación de `lms.cursos.eventos.queue`, credenciales RabbitMQ por variables de entorno y formato de error común de `integracion.md` sección 5.
- [x] **T10. Pruebas.** Pruebas unitarias con JUnit 5 y Mockito para transiciones, cupo agotado, idempotencia de reserva y liberación de cupo.

## 4. Cuestionario del desarrollador

**P1. ¿Dónde va la lógica de decidir habilitar o rechazar?**
Respuesta: recomendada

**P2. ¿Cómo se leen las cabeceras del usuario?**
Respuesta: recomendada

**P3. ¿El curso que se rechaza por cupo publica algo más que `inscripcion.rechazada`?**
Respuesta: recomendada

**P4. ¿Cómo se configura la cola de errores?**
Respuesta: recomendada

**P5. ¿Se mantiene `ddl-auto: update`?**
Respuesta: recomendada

**P6. ¿Cuándo se carga el simulador de eventos?**
Respuesta: recomendada

**P7. ¿Con qué se hacen las pruebas?**
Respuesta: recomendada

**P8. ¿Se publica `acceso.habilitado` en la misma transacción que el descuento?**
Respuesta: recomendada

**P9. ¿Algo que quieras hacer distinto a lo que dice este plan?**
Respuesta: Ninguno, se sigue el plan al 100%.

## 5. Contrato de este servicio

| Método | Ruta | Rol |
|---|---|---|
| POST | `/api/v1/cursos` | ADMINISTRADOR, DOCENTE |
| GET | `/api/v1/cursos?categoria=&estado=` | cualquiera |
| GET | `/api/v1/cursos/activos` | público |
| GET | `/api/v1/cursos/{id}` | cualquiera |
| GET | `/api/v1/cursos/codigo/{codigo}` | cualquiera |
| GET | `/api/v1/cursos/docente/{docenteId}` | DOCENTE, ADMINISTRADOR |
| GET | `/api/v1/cursos/{id}/validar` | interno |
| PUT | `/api/v1/cursos/{id}` | dueño, ADMINISTRADOR |
| PATCH | `/api/v1/cursos/{id}/estado?estado=` | dueño, ADMINISTRADOR |
| POST | `/api/v1/cursos/{id}/modulos` | dueño, ADMINISTRADOR |
| PUT | `/api/v1/cursos/{id}/modulos/{moduloId}` | dueño, ADMINISTRADOR |
| DELETE | `/api/v1/cursos/{id}/modulos/{moduloId}` | dueño, ADMINISTRADOR |
| DELETE | `/api/v1/cursos/{id}` | ADMINISTRADOR |

Eventos: publica `cursos.evento.*`, `acceso.habilitado` e `inscripcion.rechazada`; consume `inscripcion.creada` e `inscripcion.cancelada`. Payloads en `integracion.md`, sección 6.
