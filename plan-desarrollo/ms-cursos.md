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

Falta o está mal:
- Después de descontar el cupo no avisa a nadie si la inscripción quedó confirmada o rechazada.
- Si falla el descuento, el listener solo escribe en el log y el mensaje se pierde.
- Si llega dos veces el mismo `inscripcion.creada`, descuenta dos cupos.
- No libera cupos cuando se cancela una inscripción.
- `PATCH /estado` deja pasar de cualquier estado a cualquier otro.
- La URL por defecto de ms-usuarios es `http://ms-usuarios:8080`; ms-usuarios corre en 3004.
- Declara la cola `lms.cursos.eventos.queue` enlazada a sus propios eventos y nadie la consume, así que se llena.
- No se pueden editar ni borrar módulos.

## 3. Tareas

- [ ] **T1. Tabla de reservas de cupo.** Entidad `ReservaCupo` (tabla `reservas_cupo`): `inscripcion_id` (PK), `curso_id`, `estudiante_id`, `estado` (`RESERVADO`, `LIBERADO`), `fecha`.
  Aceptación: la tabla se crea al arrancar.

- [ ] **T2. Respuesta a la inscripción.** Modificar `procesarReservaCupoPorInscripcion`: si ya existe reserva para ese `inscripcionId`, no hacer nada. Si el curso acepta inscripciones y hay cupo, descontar, guardar la reserva, publicar `cursos.evento.cupo` y publicar `acceso.habilitado`. Si no, publicar `inscripcion.rechazada` con el motivo (`CUPO_AGOTADO`, `CURSO_NO_DISPONIBLE` o `CURSO_NO_EXISTE`). Payloads en `integracion.md` sección 6.
  Aceptación: con un curso de 1 cupo, dos simulaciones seguidas dan un `acceso.habilitado` y un `inscripcion.rechazada`.

- [ ] **T3. Liberar cupo.** Enlazar `inscripcion.cancelada` a `lms.cursos.inscripciones.queue`. Si hay reserva `RESERVADO`, liberar el cupo, marcarla `LIBERADO` y publicar `cursos.evento.cupo`.
  Aceptación: cancelar una inscripción sube `cuposDisponibles` en 1, y cancelar dos veces no lo sube dos veces.

- [ ] **T4. Errores en el consumidor.** Configurar la cola de errores según P4 para que un mensaje inválido no se pierda ni se reintente sin fin.
  Aceptación: publicar un JSON roto desde el panel de RabbitMQ lo deja en la cola de errores.

- [ ] **T5. Transiciones de estado.** Validar en el dominio solo estas transiciones: BORRADOR→PUBLICADO, PUBLICADO→BORRADOR, PUBLICADO→EN_CURSO, EN_CURSO→FINALIZADO, FINALIZADO→ARCHIVADO. Las demás lanzan `BusinessRuleException` (409).
  Aceptación: pasar un curso de BORRADOR a FINALIZADO devuelve 409.

- [ ] **T6. Eliminar solo borradores.** `DELETE /{id}` solo en estado BORRADOR; en otro estado devuelve 409 y se debe archivar.
  Aceptación: borrar un curso PUBLICADO devuelve 409.

- [ ] **T7. Editar y borrar módulos.** `PUT /api/v1/cursos/{id}/modulos/{moduloId}` y `DELETE /api/v1/cursos/{id}/modulos/{moduloId}`. El `orden` no se repite dentro del curso. Publicar `cursos.evento.actualizado`.
  Aceptación: dos módulos con el mismo orden devuelven 409.

- [ ] **T8. Permisos.** Leer `X-User-Id` y `X-User-Rol` (ver `integracion.md` sección 4) según P2. Crear curso: ADMINISTRADOR o DOCENTE. Editar, cambiar estado y módulos: el docente dueño (`docenteId == X-User-Id`) o ADMINISTRADOR. Eliminar: ADMINISTRADOR.
  Aceptación: un docente que intenta editar un curso de otro docente recibe 403.

- [ ] **T9. Limpieza de configuración.** Cambiar la URL por defecto de usuarios a `http://ms-usuarios:3004`. Quitar la cola `lms.cursos.eventos.queue` y su binding. Credenciales de RabbitMQ por variable de entorno con el usuario `lms`. Error con el formato común de `integracion.md` sección 5 (revisar que `GlobalExceptionHandler` lo cumpla).
  Aceptación: con `USUARIOS_SERVICE_MOCK=false` y ms-usuarios levantado, crear un curso con un docente real funciona.

- [ ] **T10. Pruebas.** Según P7. Como mínimo: regla de transiciones, descuento con cupo agotado, idempotencia de la reserva y liberación de cupo.

## 4. Cuestionario del desarrollador

Responde debajo de cada pregunta. Si eliges la recomendada, escribe "recomendada".

**P1. ¿Dónde va la lógica de decidir habilitar o rechazar?**
Recomendada: en `CursoServiceImpl`, y el listener solo recibe el mensaje y llama al servicio, como ahora.
Respuesta:

**P2. ¿Cómo se leen las cabeceras del usuario?**
Recomendada: un `HandlerInterceptor` que lee `X-User-Id` y `X-User-Rol` y los guarda en un objeto de petición, y las reglas de permiso en el servicio. Alternativa: Spring Security con un filtro propio (más trabajo).
Respuesta:

**P3. ¿El curso que se rechaza por cupo publica algo más que `inscripcion.rechazada`?**
Recomendada: no, solo ese evento.
Respuesta:

**P4. ¿Cómo se configura la cola de errores?**
Recomendada: `lms.cursos.dlq` con un dead-letter exchange `lms.cursos.dlx`, y `default-requeue-rejected: false` en el listener para que los errores de formato vayan ahí.
Respuesta:

**P5. ¿Se mantiene `ddl-auto: update`?**
Recomendada: sí por el alcance. Alternativa: Flyway con scripts de migración.
Respuesta:

**P6. ¿Cuándo se carga el simulador de eventos?**
Recomendada: solo con el perfil `dev` (`@Profile("dev")`), y en el compose final se arranca sin ese perfil.
Respuesta:

**P7. ¿Con qué se hacen las pruebas?**
Recomendada: JUnit 5 + Mockito para el servicio, y `@SpringBootTest` con Testcontainers (PostgreSQL y RabbitMQ) para una prueba de integración del flujo de inscripción.
Respuesta:

**P8. ¿Se publica `acceso.habilitado` en la misma transacción que el descuento?**
Recomendada: publicar después de que la transacción se confirma (`@TransactionalEventListener` o publicar al final del método). Si RabbitMQ falla, se registra en el log como ya se hace.
Respuesta:

**P9. ¿Algo que quieras hacer distinto a lo que dice este plan?**
Respuesta:

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
| PUT | `/api/v1/cursos/{id}/modulos/{moduloId}` | dueño, ADMINISTRADOR (nuevo) |
| DELETE | `/api/v1/cursos/{id}/modulos/{moduloId}` | dueño, ADMINISTRADOR (nuevo) |
| DELETE | `/api/v1/cursos/{id}` | ADMINISTRADOR |
| GET | `/actuator/health` | interno |

Eventos: publica `cursos.evento.*`, `acceso.habilitado` e `inscripcion.rechazada`; consume `inscripcion.creada` e `inscripcion.cancelada`. Payloads en `integracion.md` sección 6.

Variables de entorno:

| Variable | Ejemplo |
|---|---|
| `SERVER_PORT` | `8081` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `db_cursos`, `5432`, `cursos_db`, `admin`, `password` |
| `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD` | `rabbitmq`, `5672`, `lms`, `lms123` |
| `USUARIOS_SERVICE_MOCK` | `false` |
| `USUARIOS_SERVICE_URL` | `http://ms-usuarios:3004` |

## 6. Fuera de alcance

No hacer: subida de archivos para los recursos de los módulos (se guarda solo `recursoUrl`), caché con Redis, búsqueda por texto, precios con descuentos, lista de espera cuando no hay cupo.

## 7. Terminado cuando

- Todas las tareas marcadas y sus criterios probados.
- Con ms-usuarios real, una inscripción pasa a ACTIVA y el cupo baja en 1.
- Swagger muestra los endpoints nuevos.

## 8. Notas para otros servicios

(El agente escribe aquí lo que encontró que otro servicio tiene que cambiar.)
