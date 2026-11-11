# Plan de desarrollo: frontend

| Dato | Valor |
|---|---|
| Responsables | Todos. La base la hace quien se elija en P1; después cada integrante hace las pantallas de su servicio |
| Carpeta | `frontend/` |
| Rama de trabajo | `feature/frontend-<tema>` desde `develop` |
| Tecnología actual | React 19, Vite, axios |
| Tecnología propuesta | React 19, Vite, Apollo Client, React Router |
| Puerto | 5173 |
| Depende de | api-gateway (`http://localhost:4000/graphql`) |

## 1. Reglas para el agente

Además de las reglas del `README.md`:

- El frontend solo habla con el gateway por GraphQL. No llames a los puertos 3004, 8081, 8083 ni 8004.
- Las consultas usan solo los campos que existen en `contratos/graphql/schema.graphql`.
- Cada integrante solo edita la carpeta de su módulo en `pages/` y `api/` (ver sección 3). Los archivos de la base los cambia el responsable de P1.
- No agregues librerías de componentes ni de estilos que no se hayan elegido en P3.

## 2. Qué hay hoy

Pantallas `CrearEvaluacion`, `MisEvaluaciones` y `CalificarEvaluacion`, y servicios con axios que llaman directo a `localhost:8081` y `localhost:8083`. `App.jsx` tiene IDs de prueba fijos. No hay login, rutas ni notificaciones. Las pantallas de evaluaciones se reutilizan, cambiando axios por consultas GraphQL.

## 3. Estructura y dueños

```
frontend/src/
├── main.jsx, App.jsx        # base
├── apollo.js                # base: cliente con la URL y el token
├── context/SesionContext.jsx# base: token, usuario y rol
├── routes/RutaProtegida.jsx # base: redirige según rol
├── components/              # base: Layout, menú, campana de notificaciones
├── api/
│   ├── usuarios.js          # Isauro
│   ├── cursos.js            # Cristian
│   ├── evaluaciones.js      # Josué
│   └── notificaciones.js    # María
└── pages/
    ├── auth/                # Isauro: Login, Registro
    ├── admin/               # Isauro: Usuarios
    ├── inscripciones/       # Isauro: Mis cursos
    ├── cursos/              # Cristian: Catálogo, Detalle, Mis cursos (docente), Formulario de curso
    ├── evaluaciones/        # Josué: Evaluaciones del curso, Calificar, Notas finales, Mis notas
    ├── certificados/        # María: Mis certificados, Verificar certificado
    └── notificaciones/      # María: lista de notificaciones
```

## 4. Tareas

Base (responsable de P1):

- [ ] **T1. Apollo y rutas.** Instalar Apollo Client y React Router. Cliente con `VITE_GATEWAY_URL` que agrega `Authorization: Bearer <token>`. Quitar axios cuando ya no se use.
- [ ] **T2. Sesión.** Contexto con el token y el usuario, guardado según P2. Cerrar sesión. Si una respuesta trae `NO_AUTENTICADO`, limpiar la sesión y mandar al login.
- [ ] **T3. Layout y rutas protegidas.** Menú según el rol, `RutaProtegida` que recibe los roles permitidos, página 403.
  Aceptación de la base: un estudiante que entra a la URL de una página de docente ve la página 403.

Por módulo:

- [ ] **T4. Isauro.** Login, registro, administración de usuarios (crear docente, activar o desactivar), botón Inscribirme en el detalle del curso, y Mis cursos del estudiante. Después de inscribirse, la inscripción aparece PENDIENTE y se vuelve a consultar cada 3 segundos (polling) hasta que cambie a ACTIVA o RECHAZADA.
- [ ] **T5. Cristian.** Catálogo público, detalle del curso con módulos, Mis cursos del docente, formulario para crear y editar curso con módulos, botones para cambiar el estado según las transiciones permitidas.
- [ ] **T6. Josué.** Adaptar las tres pantallas actuales a GraphQL. Evaluaciones del curso, crear, publicar y cerrar evaluación, calificar estudiantes del curso, notas finales y Mis notas del estudiante.
- [ ] **T7. María.** Campana en el menú con el número de no leídas (`totalNoLeidas`, polling cada 15 segundos), lista de notificaciones con filtro de leídas y no leídas, marcar una y marcar todas. Mis certificados del estudiante y página pública `/certificados/:codigo` para verificar un certificado sin iniciar sesión (es el enlace que llega en la notificación CERTIFICADO).

Aceptación de T4 a T7: cada pantalla probada con el gateway y los servicios reales, mostrando los mensajes de error del gateway (por ejemplo "No quedan cupos" para `CUPO_AGOTADO`).

- [ ] **T8. Recorrido completo.** Un estudiante se registra, se inscribe, el docente inicia el curso, crea y califica una evaluación, finaliza el curso, y el estudiante ve su nota, sus notificaciones y su certificado. Todo desde el navegador.

## 5. Cuestionario del equipo para el frontend

Se responde en la reunión del equipo.

**P1. ¿Quién hace la base (T1 a T3)?**
Recomendada: la misma persona que haga la base del gateway, para que el contrato quede igual en los dos lados.
Respuesta:

**P2. ¿Dónde se guarda el token?**
Recomendada: `localStorage`, para no perder la sesión al recargar. Es suficiente para el alcance del proyecto.
Respuesta:

**P3. ¿Con qué se hacen los estilos?**
Recomendada: CSS propio con variables en `index.css`, sin librerías. Alternativas: Tailwind, Material UI, Bootstrap.
Respuesta:

**P4. ¿Se usa TypeScript?**
Recomendada: no, el proyecto ya está en JavaScript.
Respuesta:

**P5. ¿Cada cuánto se consulta el estado de la inscripción y el contador de notificaciones?**
Recomendada: inscripción cada 3 segundos hasta que cambie; contador cada 15 segundos.
Respuesta:

**P6. ¿Hay pruebas automáticas del frontend?**
Recomendada: no; se prueba con el recorrido de T8 y se guardan capturas para el informe.
Respuesta:

**P7. ¿Algo que el equipo quiera hacer distinto?**
Respuesta:

## 6. Variables de entorno

| Variable | Valor |
|---|---|
| `VITE_GATEWAY_URL` | `http://localhost:4000/graphql` |

## 7. Fuera de alcance

No hacer: modo oscuro, varios idiomas, aplicación móvil, subir archivos, actualización en tiempo real con WebSockets.

## 8. Terminado cuando

- El recorrido de T8 funciona.
- No queda ninguna llamada directa a un microservicio.

## 9. Notas para otros servicios

(El agente escribe aquí lo que encontró que otro servicio tiene que cambiar.)
