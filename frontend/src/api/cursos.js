const REST_URL = import.meta.env.VITE_CURSOS_REST_URL || "http://localhost:8081/api/v1/cursos";
const EVAL_URL = import.meta.env.VITE_EVAL_REST_URL || "http://localhost:8083/api/v1/evaluaciones";

function obtenerCabeceras() {
  const rol = localStorage.getItem("rol_actual") || "ESTUDIANTE";
  const userId =
    rol === "ESTUDIANTE"
      ? "22222222-3333-4444-5555-666666666666"
      : "11111111-2222-3333-4444-555555555555";
  return {
    "Content-Type": "application/json",
    "X-User-Id": userId,
    "X-User-Rol": rol,
  };
}

async function peticionRest(ruta = "", opciones = {}) {
  const res = await fetch(`${REST_URL}${ruta}`, {
    ...opciones,
    headers: { ...obtenerCabeceras(), ...(opciones.headers || {}) },
  });
  if (res.status === 204) return true;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.mensaje || data?.error || "Error en ms-cursos");
  return data;
}

export const cursosApi = {
  listarCatalogoActivo: () => peticionRest("/activos"),
  listarTodos: () => peticionRest(""),
  obtenerPorId: (id) => peticionRest(`/${id}`),
  crearCurso: (payload) => peticionRest("", { method: "POST", body: JSON.stringify(payload) }),
  actualizarCurso: (id, payload) => peticionRest(`/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  cambiarEstado: (id, nuevoEstado) => peticionRest(`/${id}/estado?estado=${nuevoEstado}`, { method: "PATCH" }),
  agregarModulo: (cursoId, modulo) => peticionRest(`/${cursoId}/modulos`, { method: "POST", body: JSON.stringify(modulo) }),
  actualizarModulo: (cursoId, moduloId, modulo) => peticionRest(`/${cursoId}/modulos/${moduloId}`, { method: "PUT", body: JSON.stringify(modulo) }),
  eliminarModulo: (cursoId, moduloId) => peticionRest(`/${cursoId}/modulos/${moduloId}`, { method: "DELETE" }),
  eliminarCurso: (id) => peticionRest(`/${id}`, { method: "DELETE" }),
  inscribirEstudiante: (cursoId) => peticionRest(`/simulador/inscripcion-creada/${cursoId}`, { method: "POST" }),
  cancelarInscripcion: (cursoId, inscripcionId) =>
    peticionRest(`/simulador/inscripcion-cancelada/${cursoId}/${inscripcionId}`, { method: "POST" }),
  listarEvaluacionesCurso: async (cursoId) => {
    try {
      const res = await fetch(`${EVAL_URL}/curso/${cursoId}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return JSON.parse(localStorage.getItem(`eval_${cursoId}`) || "[]");
    }
  },
  crearEvaluacionCurso: async (evaluacion) => {
    try {
      const res = await fetch(EVAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evaluacion),
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      const prev = JSON.parse(localStorage.getItem(`eval_${evaluacion.cursoId}`) || "[]");
      const nueva = { ...evaluacion, id: crypto.randomUUID(), estado: "PUBLICADA" };
      localStorage.setItem(`eval_${evaluacion.cursoId}`, JSON.stringify([...prev, nueva]));
      return nueva;
    }
  },
};
