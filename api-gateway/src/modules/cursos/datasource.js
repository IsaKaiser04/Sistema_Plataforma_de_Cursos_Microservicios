const CURSOS_URL = process.env.CURSOS_URL || "http://ms-cursos:8081";

async function llamarCursos(ruta, opciones = {}, ctx = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(ctx?.usuario?.id ? { "X-User-Id": ctx.usuario.id } : {}),
    ...(ctx?.usuario?.rol ? { "X-User-Rol": ctx.usuario.rol } : {}),
    ...(opciones.headers || {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${CURSOS_URL}${ruta}`, {
      ...opciones,
      headers,
      signal: controller.signal,
    });
    if (res.status === 204) return true;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(data?.mensaje || "Error en ms-cursos");
      err.extensions = { code: data?.error || "SERVICIO_NO_DISPONIBLE", status: res.status };
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  catalogoCursos: (ctx) => llamarCursos("/api/v1/cursos/activos", {}, ctx),
  listarCursos: ({ categoria, estado } = {}, ctx) => {
    const params = new URLSearchParams();
    if (categoria) params.append("categoria", categoria);
    if (estado) params.append("estado", estado);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return llamarCursos(`/api/v1/cursos${qs}`, {}, ctx);
  },
  obtenerCurso: (id, ctx) => llamarCursos(`/api/v1/cursos/${id}`, {}, ctx),
  cursosPorDocente: (docenteId, ctx) => llamarCursos(`/api/v1/cursos/docente/${docenteId}`, {}, ctx),
  crearCurso: (input, ctx) =>
    llamarCursos("/api/v1/cursos", { method: "POST", body: JSON.stringify(input) }, ctx),
  actualizarCurso: (id, input, ctx) =>
    llamarCursos(`/api/v1/cursos/${id}`, { method: "PUT", body: JSON.stringify(input) }, ctx),
  cambiarEstadoCurso: (id, estado, ctx) =>
    llamarCursos(`/api/v1/cursos/${id}/estado?estado=${estado}`, { method: "PATCH" }, ctx),
  agregarModulo: (cursoId, input, ctx) =>
    llamarCursos(`/api/v1/cursos/${cursoId}/modulos`, { method: "POST", body: JSON.stringify(input) }, ctx),
  actualizarModulo: (cursoId, moduloId, input, ctx) =>
    llamarCursos(`/api/v1/cursos/${cursoId}/modulos/${moduloId}`, { method: "PUT", body: JSON.stringify(input) }, ctx),
  eliminarModulo: (cursoId, moduloId, ctx) =>
    llamarCursos(`/api/v1/cursos/${cursoId}/modulos/${moduloId}`, { method: "DELETE" }, ctx),
  eliminarCurso: (id, ctx) =>
    llamarCursos(`/api/v1/cursos/${id}`, { method: "DELETE" }, ctx),
};
