import { useEffect, useState } from "react";
import { cursosApi } from "../../api/cursos";

// Vista de evaluaciones que estaba dentro de App.jsx en la rama cursos-Cristian, sin cambios de lógica.
export default function EvaluacionesCurso({ curso, rol, onVolver }) {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [nuevaEval, setNuevaEval] = useState({ titulo: "", descripcion: "", puntajeMaximo: 10 });

  const cargar = async () => {
    const lista = await cursosApi.listarEvaluacionesCurso(curso.id);
    setEvaluaciones(lista);
  };

  useEffect(() => {
    if (curso?.id) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curso?.id]);

  const handleCrearEval = async (e) => {
    e.preventDefault();
    await cursosApi.crearEvaluacionCurso({
      ...nuevaEval,
      puntajeMaximo: Number(nuevaEval.puntajeMaximo),
      cursoId: curso.id,
    });
    setNuevaEval({ titulo: "", descripcion: "", puntajeMaximo: 10 });
    cargar();
  };

  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 10, border: "1px solid #cbd5e1" }}>
      <button onClick={onVolver} style={{ marginBottom: 12, padding: "6px 12px", cursor: "pointer" }}>
        ← Volver a Cursos
      </button>
      <h2>Evaluaciones del Curso: [{curso.codigo}] {curso.titulo}</h2>

      {evaluaciones.length === 0 ? (
        <p style={{ color: "#64748b" }}>No hay evaluaciones registradas todavía para este curso.</p>
      ) : (
        <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
          {evaluaciones.map((ev) => (
            <div key={ev.id} style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{ev.titulo}</strong> — Puntaje máx: <b>{ev.puntajeMaximo || 10} pts</b>
                <p style={{ margin: "4px 0", fontSize: 13, color: "#475569" }}>{ev.descripcion}</p>
              </div>
              <span style={{ background: "#f3e8ff", color: "#6b21a8", padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                {rol === "ESTUDIANTE" ? "Disponible para rendir" : "Publicada"}
              </span>
            </div>
          ))}
        </div>
      )}

      {(rol === "DOCENTE" || rol === "ADMINISTRADOR") && (
        <form onSubmit={handleCrearEval} style={{ display: "grid", gap: 10, background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #cbd5e1" }}>
          <h4 style={{ margin: 0 }}>+ Crear Evaluación para este Curso</h4>
          <input placeholder="Título de la evaluación (ej. Examen Parcial 1)" value={nuevaEval.titulo} onChange={(e) => setNuevaEval({ ...nuevaEval, titulo: e.target.value })} required style={{ padding: 8 }} />
          <textarea placeholder="Instrucciones o descripción" value={nuevaEval.descripcion} onChange={(e) => setNuevaEval({ ...nuevaEval, descripcion: e.target.value })} required style={{ padding: 8 }} />
          <button type="submit" style={{ padding: 10, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>
            Publicar Evaluación
          </button>
        </form>
      )}
    </div>
  );
}
