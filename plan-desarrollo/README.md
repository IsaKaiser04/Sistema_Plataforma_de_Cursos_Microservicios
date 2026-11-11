# Plan de desarrollo de la Plataforma de Cursos (LMS)

Grupo 1 · Sistemas Distribuidos · UNL · noviembre 2026

Esta carpeta tiene el plan de lo que queda por desarrollar. Cada integrante tiene un archivo con las tareas de su microservicio y un cuestionario para dejar escritas sus decisiones antes de programar. Esos archivos sirven como guía para el agente de IA que use cada uno, y la idea es que nadie programe algo que no esté en el plan.

## Archivos

| Archivo | Contenido |
|---|---|
| `analisis-integral.md` | Resumen y opinión en cuatro análisis: evaluaciones, sus dependencias, frontend y proyecto general |

### Planes por componente

| Archivo | Responsable | Carpeta del repo |
|---|---|---|
| `ms-usuarios.md` | Isauro Rivera | `ms-usuarios/` |
| `ms-cursos.md` | Cristian Tomalá | `ms-cursos/` |
| `ms-evaluaciones.md` | Josué Asanza | `ms-evaluaciones/` |
| `ms-notificaciones.md` (incluye certificados) | María Chuico | `ms-notificaciones/` |
| `api-gateway.md` | Todos (cada uno sus resolvers) | `api-gateway/` |
| `frontend.md` | Todos (cada uno sus pantallas) | `frontend/` |
| `integracion.md` | Todo el equipo | raíz del repo, `contratos/` |

## Cómo se usan

1. Cada integrante abre su archivo y responde el cuestionario de la sección 4. Cada pregunta trae una opción recomendada. Si estás de acuerdo con ella, escribe "recomendada" en la respuesta.
2. Las preguntas del cuestionario de `integracion.md` afectan a todos, así que se responden juntos en una reunión antes de empezar.
3. Cuando el cuestionario está completo, se sube el archivo a la rama `develop` en la carpeta `plan-desarrollo/`.
4. Cada uno le pasa al agente su archivo y `integracion.md`, con una instrucción como esta:

```
Lee plan-desarrollo/integracion.md y plan-desarrollo/ms-cursos.md.
Sigue las reglas de la sección 1 de ms-cursos.md.
Haz la tarea T3 y nada más.
```

5. Cuando termina una tarea, se marca `[x]` en la lista de tareas del archivo, en el mismo PR del código.

## Reglas para el agente (valen para todos los archivos)

- Si alguna respuesta del cuestionario de tu archivo o de `integracion.md` está vacía, no programes. Avísale al integrante qué preguntas faltan.
- Trabaja una tarea por vez y en el orden de la lista, a menos que el integrante diga otra cosa.
- Solo modifica la carpeta del servicio que te tocó. Si una tarea necesita un cambio en otro servicio, no lo hagas: escríbelo en la sección "Notas para otros servicios" del archivo y avísale al integrante.
- No agregues endpoints, eventos, tablas, campos ni librerías que no estén en el plan o en las respuestas del cuestionario. Si crees que hace falta algo, propónlo y espera la respuesta.
- Los nombres de eventos, routing keys, campos JSON, puertos y cabeceras salen de `integracion.md`. Si tu archivo y `integracion.md` no coinciden, manda `integracion.md` y avisas del conflicto.
- No subas `.env`, `target/`, `node_modules/` ni credenciales reales.
- Los commits los firma el integrante, con el formato `tipo(servicio): qué cambió`. No agregues la línea `Co-Authored-By` del agente.
