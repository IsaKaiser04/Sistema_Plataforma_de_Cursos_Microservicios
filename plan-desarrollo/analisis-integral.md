# Análisis integral del proyecto LMS

Este documento resume el contenido de `plan-desarrollo/` en cuatro análisis. Distingue entre lo que describen los planes y lo que se observa actualmente en el código; las tareas y contratos de los planes son la arquitectura objetivo, no necesariamente funcionalidades ya implementadas.

## 1. Análisis del microservicio de evaluaciones

### Propósito y alcance

`ms-evaluaciones` debe administrar evaluaciones de los cursos, registrar las calificaciones de estudiantes habilitados y calcular una nota final cuando un curso pasa a `FINALIZADO`. No debe resolver exámenes en línea ni emitir certificados: esos quedan fuera de alcance y los certificados corresponden a `ms-notificaciones`.

El plan propone:

- Estados de evaluación `BORRADOR`, `PUBLICADA` y `CERRADA`, con creación, edición, publicación y cierre.
- Evaluaciones con título, descripción, tipo, peso y fechas. La suma de los pesos de un curso no debe superar 100.
- Calificaciones de 0 a 10 asociadas a un estudiante y una evaluación, con retroalimentación.
- Control de acceso para docentes del curso y administradores; estudiantes consultan sus propias notas.
- Cálculo de la nota final ponderada al finalizar el curso, con nota mínima de aprobación recomendada de 7.0.
- Publicación de eventos de evaluación y nota final, además de consumo de eventos de cursos e inscripciones.

### Estado observado en el código

La implementación actual es todavía un esqueleto: el controlador expone listar evaluaciones, listar por curso y crear; la entidad guarda título, curso, calificación mínima y fecha de creación. El servicio valida el curso mediante `CursoClient`, pero no se observan aún las entidades ni operaciones completas de calificaciones, estados, pesos o notas finales descritas por el plan. El productor y consumidor RabbitMQ actuales usan nombres y mensajes distintos al contrato de integración, y el consumidor solo registra mensajes.

También hay diferencias que conviene resolver al implementar el plan:

- La configuración usa direcciones locales y valores fijos; el plan pide variables de entorno y nombres DNS de Docker.
- El `pom.xml` declara Java 17, mientras el plan describe Java 21.
- La entidad actual guarda `calificacionMinima` por evaluación, mientras el plan recomienda eliminarla y usar una nota mínima global.
- El frontend actual califica de 0 a 5, pero el contrato del equipo define notas de 0 a 10.

### Opinión

El alcance está bien separado y la secuencia de tareas es razonable. La decisión de copiar datos necesarios desde eventos reduce llamadas síncronas y permite calcular notas aunque otro servicio tenga una interrupción. El riesgo principal es empezar por las operaciones REST sin cerrar antes los eventos, las reglas de notas y permisos: eso produciría contratos incompatibles y cambios de modelo posteriores. Recomiendo acordar primero las respuestas del cuestionario y alinear Java, escalas de calificación, configuración y mensajería con el resto del equipo.

## 2. Análisis de las dependencias de evaluaciones

### API Gateway

Según [api-gateway.md](./api-gateway.md), el gateway es la única entrada del frontend. Debe validar el JWT, convertir la identidad en las cabeceras `X-User-Id` y `X-User-Rol`, y reenviar las peticiones GraphQL a los microservicios. Para evaluaciones, el plan prevé resolvers para:

- Consultar evaluaciones y calificaciones de un curso.
- Consultar las calificaciones propias y las notas finales.
- Crear, publicar, cerrar y calificar evaluaciones.
- Incluir las evaluaciones de un curso y las calificaciones de una inscripción como campos GraphQL.

El gateway no debe decidir reglas académicas; debe delegar esas operaciones a `ms-evaluaciones`. En el repositorio, `api-gateway/` contiene actualmente un `package.json` básico y un Dockerfile que arranca `src/index.js`, pero no se observa ese código fuente ni las dependencias de Apollo Server descritas en el plan. Por tanto, las operaciones de evaluaciones en GraphQL son todavía parte de la arquitectura objetivo.

### ms-cursos

`ms-cursos` es la dependencia de dominio más directa:

1. Las evaluaciones pertenecen a un curso; el servicio necesita conocer su identidad, docente y estado.
2. El plan de evaluaciones propone mantener una copia local de cursos mediante `cursos.evento.creado`, `actualizado`, `eliminado` y `estado`.
3. La transición del curso a `FINALIZADO` dispara el cálculo de las notas finales.
4. Si el curso no está en la copia local al crear una evaluación, se permite una consulta REST de respaldo a `GET /api/v1/cursos/{id}`.
5. La autorización del docente se verifica comparando el usuario autenticado con el `docenteId` almacenado localmente.

La integración no debería consultar `ms-cursos` en cada operación: la copia local y los eventos son el flujo normal. El código actual de `CursoClient`, en cambio, usa `localhost:8081` y el servicio lo llama al crear una evaluación; eso debe migrar a la estrategia y URL configurable del plan.

### Inscripciones, identidad y notificaciones

- **ms-usuarios / inscripciones:** `ms-evaluaciones` no debe llamar directamente a usuarios. Recibe `acceso.habilitado` para habilitar a un estudiante y `inscripcion.cancelada` para retirarlo. El gateway entrega identidad y rol por cabeceras.
- **RabbitMQ:** el contrato define el exchange `lms.eventos.exchange`, JSON y eventos idempotentes identificados por `eventoId`. La cola de evaluaciones debe consumir `acceso.habilitado`, `inscripcion.cancelada` y `cursos.evento.#`.
- **ms-notificaciones:** consume `evaluacion.publicada`, `evaluacion.calificada` y `nota.final.calculada`. Este último evento permite notificar al estudiante y emitir un certificado si `aprobado` es `true`. `ms-evaluaciones` no debe crear certificados ni publicar el antiguo evento `certificado.emitido`.
- **Base de datos:** evaluaciones conserva su propia base PostgreSQL. Las tablas planeadas incluyen evaluaciones, calificaciones, estudiantes habilitados, copia local de cursos, notas finales y eventos procesados.

Los nombres de eventos, formatos y políticas comunes están definidos en [integracion.md](./integracion.md); ese documento indica que prevalece si otro plan no coincide.

## 3. Análisis del frontend

### Estado observado

La aplicación actual muestra un módulo de evaluaciones con componentes para crear, listar y calificar. La pantalla principal usa IDs de prueba fijos. Los servicios Axios llaman directamente a `localhost:8081` (cursos) y `localhost:8083` (evaluaciones), y no se observan login, rutas protegidas ni contexto de sesión.

Hay diferencias funcionales adicionales con el objetivo: la interfaz de calificación acepta notas de 0 a 5; el plan de integración establece 0 a 10. Además, `CalificarEvaluacion` invoca `evaluacionService.calificarEvaluacion`, que no está definido en el servicio Axios actual.

### Arquitectura y alcance planeados

Según [frontend.md](./frontend.md), el frontend debe migrar a React, Apollo Client y React Router, hablar únicamente con `http://localhost:4000/graphql` y enviar el JWT mediante el cliente común. Se planea un contexto de sesión, rutas protegidas por rol, páginas de catálogo y cursos, evaluaciones, notas, notificaciones y certificados.

En evaluaciones, el alcance incluye adaptar las pantallas actuales y agregar el flujo para consultar evaluaciones de un curso, crear/publicar/cerrar, calificar estudiantes, ver notas finales y permitir que cada estudiante consulte sus notas. Los mensajes de error del gateway deben ser comprensibles para el usuario.

### Opinión

Conviene migrar en una sola dirección: definir primero el contrato GraphQL aprobado, completar el gateway y después adaptar las pantallas. Mantener llamadas directas a los microservicios durante la transición facilita pruebas locales, pero no debe quedar como arquitectura final porque evita el control centralizado de autenticación y duplica la configuración de servicios. También hay que reemplazar los IDs de prueba, corregir la escala de notas y completar el servicio de calificación antes de considerar funcional la pantalla actual.

## 4. Análisis general del proyecto

### Resumen de la plataforma

La propuesta es una plataforma LMS con servicios separados por dominio: usuarios e inscripciones, cursos, evaluaciones, notificaciones y certificados. El frontend entra por un API Gateway GraphQL; los servicios conservan sus propios datos y se integran por REST para validaciones puntuales y por RabbitMQ para flujos asíncronos.

El recorrido académico esperado es:

1. El estudiante se registra e inicia sesión; el gateway valida el JWT.
2. Se solicita una inscripción, inicialmente `PENDIENTE`.
3. `ms-cursos` valida cupo y disponibilidad; emite habilitación o rechazo.
4. `ms-evaluaciones` registra al estudiante habilitado y recibe los cambios del curso.
5. El docente crea y califica evaluaciones; las calificaciones generan notificaciones.
6. Al finalizar el curso, se calculan notas finales; `ms-notificaciones` crea notificaciones y certificados para quienes aprueban.
7. El usuario completa el recorrido desde el frontend, sin acceder directamente a los puertos de los microservicios.

### Opinión general y prioridades

La documentación es una buena base de coordinación: asigna responsables, delimita responsabilidades y propone criterios de aceptación concretos. La separación entre decisiones de negocio, gateway, interfaz y notificaciones es acertada; también lo son la idempotencia de eventos y las colas de errores para un sistema distribuido.

Sin embargo, hay una brecha importante entre la arquitectura documentada y lo que está desplegado actualmente. Por ejemplo, el `docker-compose.yml` no incluye todos los servicios planeados; el gateway carece de su implementación de GraphQL en el árbol observado; y el código de evaluaciones aún no refleja los contratos completos de eventos, calificaciones ni notas finales. Los cuestionarios de decisión de los planes también contienen respuestas vacías, pese a que el README pide resolverlas antes de programar.

Recomiendo este orden:

1. Resolver los cuestionarios pendientes y ratificar [integracion.md](./integracion.md), sobre todo roles, escala de notas, configuración de RabbitMQ, URLs y payloads.
2. Alinear configuraciones y versiones: Java, puertos, bases, nombres de variables y direcciones dentro de Docker.
3. Implementar y probar el flujo de inscripción/eventos antes de depender de él para habilitar evaluaciones.
4. Completar las operaciones y eventos de `ms-evaluaciones`, y después sus resolvers GraphQL.
5. Migrar el frontend al gateway y terminar con el recorrido integral de usuario y pruebas de tolerancia a fallos.

En síntesis: el diseño está bien encaminado como plan de trabajo, pero todavía no debe confundirse con un sistema integrado terminado. El mayor valor ahora está en cerrar los contratos y poner a prueba un flujo vertical pequeño antes de ampliar todas las pantallas y operaciones.
