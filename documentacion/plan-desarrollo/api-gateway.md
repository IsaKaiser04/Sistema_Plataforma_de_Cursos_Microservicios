# Plan de desarrollo: api-gateway

| Dato | Valor |
|---|---|
| Responsables | Todos. La base la hace quien se elija en P1; después cada integrante agrega los resolvers de su servicio |
| Carpeta | `api-gateway/` |
| Rama de trabajo | `feature/gateway-<tema>` desde `develop` |
| Tecnología propuesta | Node.js 20, Apollo Server 4, jsonwebtoken |
| Puerto | 4000, endpoint `POST /graphql` |
| Base de datos | ninguna |
| Depende de | los cuatro microservicios por HTTP |
| Lo usa | frontend |

## 1. Reglas para el agente

Además de las reglas del `README.md`:

- El gateway no tiene lógica de negocio ni base de datos. Si una tarea pide decidir algo del negocio (si hay cupo, si aprobó), eso va en el microservicio, no aquí.
- El esquema GraphQL de `contratos/graphql/schema.graphql` es el contrato con el frontend. No agregues tipos, campos ni operaciones que no estén ahí. Para cambiarlo, primero se cambia el contrato en un PR aparte.
- Cada integrante solo edita los archivos de su módulo (ver sección 3). Los archivos de la base (`index`, contexto, errores, cliente HTTP) solo los cambia el responsable de P1.
- El gateway es el único que valida el JWT y el único que reenvía `X-User-Id` y `X-User-Rol`.

## 2. Qué hay hoy

`src/index.js` con Express y `express-http-proxy` que solo redirige `/api/auth` a `ms-usuarios:3004`, y `/api/health`. Se reemplaza por Apollo Server, que es lo que define el ABP.

## 3. Estructura y dueños

```
api-gateway/src/
├── index.js                 # base
├── context.js               # base: lee y valida el JWT
├── errors.js                # base: traduce errores REST a GraphQL
├── http.js                  # base: cliente HTTP con tiempo límite y cabeceras X-User-*
├── schema/
│   └── schema.graphql       # copia de contratos/graphql/schema.graphql
└── modules/
    ├── usuarios/            # Isauro: Usuario, AuthPayload, Inscripcion
    ├── cursos/              # Cristian: Curso, Modulo
    ├── evaluaciones/        # Josué: Evaluacion, Calificacion, NotaFinal
    └── notificaciones/      # María: Notificacion, Certificado
```

Cada carpeta de `modules/` tiene `datasource.js` (llamadas REST a su servicio) y `resolvers.js` (Query, Mutation y campos de sus tipos).

## 4. Tareas

Base (responsable de P1):

- [ ] **T1. Proyecto base.** Apollo Server 4 en el puerto 4000, carga del esquema desde `schema/schema.graphql`, unión de los resolvers de `modules/`, CORS para `CORS_ORIGIN`, `GET /health`. Quitar `express-http-proxy`.
  Aceptación: Apollo Sandbox abre en `http://localhost:4000/graphql` y muestra el esquema.

- [ ] **T2. Contexto y JWT.** Leer `Authorization: Bearer`, validar con `JWT_SECRET`, poner `{ id, email, rol }` en el contexto o `null` si no hay token. Funciones `requiereLogin(ctx)` y `requiereRol(ctx, [...])` que lanzan `NO_AUTENTICADO` o `PROHIBIDO`.
  Aceptación: `me` sin token devuelve error con `extensions.code = NO_AUTENTICADO`.

- [ ] **T3. Cliente HTTP común.** Función para llamar a un servicio con tiempo límite de P3, que agrega `X-User-Id` y `X-User-Rol` del contexto y convierte el error común de `integracion.md` sección 5 en un error GraphQL con el código de la tabla de la sección 6 de este archivo.
  Aceptación: un 409 `CUPO_AGOTADO` de un servicio llega al frontend como `extensions.code = CUPO_AGOTADO`.

- [ ] **T4. Dockerfile y variables.** `Dockerfile` con Node 20 y `.env.example` con las variables de la sección 7.

Por módulo (cada integrante):

- [ ] **T5. Módulo usuarios (Isauro).** `login`, `registro`, `me`, `usuarios`, `crearUsuario`, `cambiarEstadoUsuario`, `inscribirse`, `cancelarInscripcion`, `misInscripciones`, `inscritosCurso`, y los campos `Inscripcion.estudiante` y `Curso.docente`.
- [ ] **T6. Módulo cursos (Cristian).** `catalogoCursos`, `cursos`, `curso`, `misCursosDocente`, `crearCurso`, `actualizarCurso`, `cambiarEstadoCurso`, `agregarModulo`, `eliminarCurso`, y el campo `Inscripcion.curso`.
- [ ] **T7. Módulo evaluaciones (Josué).** `evaluacionesCurso`, `calificacionesEvaluacion`, `misCalificaciones`, `notasFinalesCurso`, `crearEvaluacion`, `publicarEvaluacion`, `cerrarEvaluacion`, `calificar`, y los campos `Curso.evaluaciones`, `Inscripcion.calificaciones`.
- [ ] **T8. Módulo notificaciones y certificados (María).** `misNotificaciones`, `totalNoLeidas`, `marcarNotificacionLeida`, `marcarTodasLeidas`, `misCertificados`, `verificarCertificado` (pública, sin token) y el campo `Certificado.curso` (lo resuelve con ms-cursos).

Aceptación de T5 a T8: cada operación probada en Apollo Sandbox con el servicio real, con un caso correcto y uno de error.

- [ ] **T9. Prueba de caída parcial.** Con ms-evaluaciones detenido, la consulta `curso(id)` con `evaluaciones` devuelve los datos del curso y `evaluaciones` en `null` con el error en `errors`.

## 5. Cuestionario del equipo para el gateway

Se responde en la reunión del equipo.

**P1. ¿Quién hace la base (T1 a T4)?**
Recomendada: una sola persona, antes que los módulos, para que los demás tengan dónde agregar sus resolvers.
Respuesta:

**P2. ¿Apollo Server 4 o GraphQL Yoga?**
Recomendada: Apollo Server 4, por la documentación y porque el frontend usa Apollo Client.
Respuesta:

**P3. Tiempo límite de las llamadas a los servicios.**
Recomendada: 5 segundos.
Respuesta:

**P4. ¿Se usa DataLoader para no pedir el mismo curso varias veces en una consulta?**
Recomendada: sí, solo en `Inscripcion.curso` y `Curso.docente`, que son los que se repiten en listas.
Respuesta:

**P5. ¿Se mantiene `/api/auth` como REST además de las mutations `login` y `registro`?**
Recomendada: no, todo por GraphQL para que el frontend use un solo cliente.
Respuesta:

**P6. ¿Con qué se prueba?**
Recomendada: Apollo Sandbox para el desarrollo y una colección de Postman (GraphQL) para las evidencias.
Respuesta:

**P7. ¿Algo que el equipo quiera hacer distinto?**
Respuesta:

## 6. Códigos de error GraphQL

| Error del servicio (`error`) o situación | `extensions.code` |
|---|---|
| sin token o token inválido | `NO_AUTENTICADO` |
| rol sin permiso, 403 | `PROHIBIDO` |
| 400 | `DATOS_INVALIDOS` |
| 404 | `NO_ENCONTRADO` |
| 409 | el valor de `error` que mandó el servicio (`CUPO_AGOTADO`, `YA_INSCRITO`, etc.) |
| sin respuesta o 503 | `SERVICIO_NO_DISPONIBLE` |

## 7. Variables de entorno

| Variable | Valor en Docker |
|---|---|
| `PORT` | `4000` |
| `JWT_SECRET` | el mismo de ms-usuarios |
| `USUARIOS_URL` | `http://ms-usuarios:3004` |
| `CURSOS_URL` | `http://ms-cursos:8081` |
| `EVALUACIONES_URL` | `http://ms-evaluaciones:8083` |
| `NOTIFICACIONES_URL` | `http://ms-notificaciones:3000` |
| `CORS_ORIGIN` | `http://localhost:5173` |

## 8. Fuera de alcance

No hacer: suscripciones GraphQL, caché, límite de peticiones, federación de Apollo.

## 9. Terminado cuando

- El frontend hace todas sus operaciones por `:4000/graphql` y ningún servicio se llama directo desde el navegador.
- Todas las operaciones del esquema tienen resolver.

## 10. Notas para otros servicios

(El agente escribe aquí lo que encontró que otro servicio tiene que cambiar.)
