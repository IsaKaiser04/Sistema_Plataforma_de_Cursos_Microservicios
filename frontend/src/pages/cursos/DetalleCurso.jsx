import { useEffect, useState } from "react";
import { cursosApi } from "../../api/cursos";

export default function DetalleCurso({ cursoId, rol, onVolver, onVerEvaluaciones }) {
  const [curso, setCurso] = useState(null);
  const [error, setError] = useState("");
  const [editandoModuloId, setEditandoModuloId] = useState(null);
  const [nuevoModulo, setNuevoModulo] = useState({
    titulo: "",
    descripcion: "",
    orden: 1,
    duracionMinutos: 60,
    recursoUrl: "",
  });

  const esDocenteOAdmin = rol === "DOCENTE" || rol === "ADMINISTRADOR";

  const cargar = async () => {
    try {
      setError("");
      const data = await cursosApi.obtenerPorId(cursoId);
      setCurso(data);
      setNuevoModulo((prev) => ({ ...prev, orden: (data.modulos?.length || 0) + 1 }));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (cursoId) cargar();
  }, [cursoId]);

  const handleGuardarModulo = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const payload = {
        ...nuevoModulo,
        orden: Number(nuevoModulo.orden),
        duracionMinutos: Number(nuevoModulo.duracionMinutos),
      };
      if (editandoModuloId) {
        await cursosApi.actualizarModulo(cursoId, editandoModuloId, payload);
        setEditandoModuloId(null);
      } else {
        await cursosApi.agregarModulo(cursoId, payload);
      }
      setNuevoModulo({ titulo: "", descripcion: "", orden: (curso.modulos?.length || 0) + 2, duracionMinutos: 60, recursoUrl: "" });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEliminarModulo = async (moduloId) => {
    try {
      setError("");
      await cursosApi.eliminarModulo(cursoId, moduloId);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!curso) return <p>Cargando curso...</p>;

  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 10, border: "1px solid #cbd5e1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={onVolver} style={{ padding: "6px 12px", cursor: "pointer" }}>
          ← Volver
        </button>
        <button
          onClick={() => onVerEvaluaciones(curso)}
          style={{ padding: "8px 14px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
        >
          Ir a Evaluaciones del Curso
        </button>
      </div>

      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

      <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "#2563eb", fontWeight: 700 }}>{curso.codigo} · {curso.estado} · {curso.nivel}</span>
        <h2 style={{ margin: "4px 0 8px" }}>{curso.titulo}</h2>
        <p style={{ color: "#334155" }}>{curso.descripcion}</p>
        <small style={{ color: "#64748b" }}>
          UUID Curso: {curso.id} | Docente UUID: {curso.docenteId} | Cupos: {curso.cuposDisponibles}/{curso.cupoMaximo}
        </small>
      </div>

      <h3>Contenido y Módulos del Curso ({curso.modulos?.length || 0})</h3>
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        {curso.modulos?.map((m) => (
          <div key={m.id} style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>Módulo {m.orden}: {m.titulo}</strong> ({m.duracionMinutos} min)
              <p style={{ margin: "4px 0", fontSize: 13, color: "#475569" }}>{m.descripcion}</p>
              {m.recursoUrl && (
                <a href={m.recursoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#2563eb", fontWeight: 600 }}>
                  Abrir material de estudio →
                </a>
              )}
            </div>
            {esDocenteOAdmin && (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => {
                    setEditandoModuloId(m.id);
                    setNuevoModulo({
                      titulo: m.titulo,
                      descripcion: m.descripcion || "",
                      orden: m.orden,
                      duracionMinutos: m.duracionMinutos,
                      recursoUrl: m.recursoUrl || "",
                    });
                  }}
                  style={{ background: "#0284c7", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}
                >
                  Editar
                </button>
                <button
                  onClick={() => handleEliminarModulo(m.id)}
                  style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}
                >
                  Borrar módulo
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {esDocenteOAdmin && (
        <form onSubmit={handleGuardarModulo} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #cbd5e1" }}>
          <h4 style={{ gridColumn: "span 2", margin: "0 0 4px" }}>
            {editandoModuloId ? "Editar Módulo (T7)" : "Agregar Nuevo Módulo (T7 — valida orden único)"}
          </h4>
          <input placeholder="Título del módulo" value={nuevoModulo.titulo} onChange={(e) => setNuevoModulo({ ...nuevoModulo, titulo: e.target.value })} required style={{ padding: 8 }} />
          <input placeholder="URL del recurso (opcional)" value={nuevoModulo.recursoUrl} onChange={(e) => setNuevoModulo({ ...nuevoModulo, recursoUrl: e.target.value })} style={{ padding: 8 }} />
          <input type="number" min="1" placeholder="Orden" value={nuevoModulo.orden} onChange={(e) => setNuevoModulo({ ...nuevoModulo, orden: e.target.value })} required style={{ padding: 8 }} />
          <input type="number" min="5" placeholder="Duración (minutos)" value={nuevoModulo.duracionMinutos} onChange={(e) => setNuevoModulo({ ...nuevoModulo, duracionMinutos: e.target.value })} required style={{ padding: 8 }} />
          <textarea placeholder="Descripción del módulo" value={nuevoModulo.descripcion} onChange={(e) => setNuevoModulo({ ...nuevoModulo, descripcion: e.target.value })} style={{ gridColumn: "span 2", padding: 8 }} />
          <button type="submit" style={{ gridColumn: "span 2", padding: 8, background: "#0f172a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
            {editandoModuloId ? "Actualizar Módulo" : "+ Guardar Módulo"}
          </button>
        </form>
      )}
    </div>
  );
}
