import { useEffect, useState } from "react";
import { cursosApi } from "../../api/cursos";

const TRANSICIONES = {
  BORRADOR: [{ destino: "PUBLICADO", label: "Publicar", color: "#16a34a" }],
  PUBLICADO: [
    { destino: "EN_CURSO", label: "Iniciar Curso (EN_CURSO)", color: "#2563eb" },
    { destino: "BORRADOR", label: "Volver a Borrador", color: "#64748b" },
  ],
  EN_CURSO: [{ destino: "FINALIZADO", label: "Finalizar Curso", color: "#7c3aed" }],
  FINALIZADO: [{ destino: "ARCHIVADO", label: "Archivar Curso", color: "#475569" }],
  ARCHIVADO: [],
};

export default function MisCursosDocente({ onEditar, onVerDetalle, onVerEvaluaciones }) {
  const [cursos, setCursos] = useState([]);
  const [error, setError] = useState("");

  const cargar = async () => {
    try {
      setError("");
      const data = await cursosApi.listarTodos();
      setCursos(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      setError("");
      await cursosApi.cambiarEstado(id, nuevoEstado);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEliminar = async (id) => {
    try {
      setError("");
      await cursosApi.eliminarCurso(id);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Gestión de Cursos del Docente / Administrador</h2>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {cursos.map((c) => (
          <div key={c.id} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <strong>[{c.codigo}] {c.titulo}</strong> — <span style={{ fontWeight: 700, color: "#1d4ed8" }}>{c.estado}</span> ({c.nivel})
              <p style={{ margin: "4px 0", fontSize: 13, color: "#334155" }}>{c.descripcion}</p>
              <small style={{ color: "#64748b" }}>
                Cupos: <b>{c.cuposDisponibles}/{c.cupoMaximo}</b> · Módulos: <b>{c.modulos?.length || 0}</b> · ID: {c.id}
              </small>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
              <button onClick={() => onVerDetalle(c.id)} style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #94a3b8", background: "#f8fafc", cursor: "pointer" }}>
                Módulos ({c.modulos?.length || 0})
              </button>
              <button onClick={() => onVerEvaluaciones(c)} style={{ padding: "6px 10px", borderRadius: 4, border: "none", background: "#7c3aed", color: "#fff", cursor: "pointer" }}>
                Evaluaciones
              </button>
              <button onClick={() => onEditar(c)} style={{ padding: "6px 10px", borderRadius: 4, border: "none", background: "#0284c7", color: "#fff", cursor: "pointer" }}>
                Editar
              </button>

              {(TRANSICIONES[c.estado] || []).map((t) => (
                <button
                  key={t.destino}
                  onClick={() => handleCambiarEstado(c.id, t.destino)}
                  style={{ padding: "6px 10px", borderRadius: 4, border: "none", background: t.color, color: "#fff", cursor: "pointer" }}
                >
                  {t.label}
                </button>
              ))}

              {c.estado === "BORRADOR" && (
                <button
                  onClick={() => handleEliminar(c.id)}
                  style={{ padding: "6px 10px", borderRadius: 4, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer" }}
                >
                  Eliminar (Borrador)
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
