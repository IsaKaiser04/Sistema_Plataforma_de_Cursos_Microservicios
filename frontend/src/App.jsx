import { useEffect, useState } from "react";
import CatalogoCursos from "./pages/cursos/CatalogoCursos";
import DetalleCurso from "./pages/cursos/DetalleCurso";
import MisCursosDocente from "./pages/cursos/MisCursosDocente";
import FormularioCurso from "./pages/cursos/FormularioCurso";
import { cursosApi } from "./api/cursos";

export default function App() {
  const [rol, setRol] = useState(localStorage.getItem("rol_actual") || "ESTUDIANTE");
  const [vista, setVista] = useState("catalogo"); // catalogo | mis_inscripciones | docente | formulario | detalle | evaluaciones
  const [cursoIdDetalle, setCursoIdDetalle] = useState(null);
  const [cursoEditar, setCursoEditar] = useState(null);
  const [cursoEvaluacion, setCursoEvaluacion] = useState(null);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [nuevaEval, setNuevaEval] = useState({ titulo: "", descripcion: "", puntajeMaximo: 10 });
  const [inscritos, setInscritos] = useState(() => JSON.parse(localStorage.getItem("mis_inscripciones") || "[]"));

  const cambiarRol = (nuevoRol) => {
    localStorage.setItem("rol_actual", nuevoRol);
    setRol(nuevoRol);
    if (nuevoRol === "ESTUDIANTE" && (vista === "docente" || vista === "formulario")) {
      setVista("catalogo");
    }
  };

  const guardarInscripcion = (cursoInscrito) => {
    const actualizados = [...inscritos.filter((i) => i.id !== cursoInscrito.id), cursoInscrito];
    setInscritos(actualizados);
    localStorage.setItem("mis_inscripciones", JSON.stringify(actualizados));
  };

  const cancelarInscripcion = async (item) => {
    await cursosApi.cancelarInscripcion(item.id, item.inscripcionId);
    const actualizados = inscritos.filter((i) => i.id !== item.id);
    setInscritos(actualizados);
    localStorage.setItem("mis_inscripciones", JSON.stringify(actualizados));
  };

  const abrirEvaluaciones = async (curso) => {
    setCursoEvaluacion(curso);
    const lista = await cursosApi.listarEvaluacionesCurso(curso.id);
    setEvaluaciones(lista);
    setVista("evaluaciones");
  };

  const handleCrearEval = async (e) => {
    e.preventDefault();
    await cursosApi.crearEvaluacionCurso({
      ...nuevaEval,
      puntajeMaximo: Number(nuevaEval.puntajeMaximo),
      cursoId: cursoEvaluacion.id,
    });
    setNuevaEval({ titulo: "", descripcion: "", puntajeMaximo: 10 });
    const lista = await cursosApi.listarEvaluacionesCurso(cursoEvaluacion.id);
    setEvaluaciones(lista);
  };

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "1.5rem", fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e2e8f0", paddingBottom: 14, marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Plataforma de Cursos LMS — UNL</h1>
          <small style={{ color: "#64748b" }}>
            Vista actual: <b style={{ color: "#2563eb" }}>{rol}</b>
          </small>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={rol}
            onChange={(e) => cambiarRol(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 6, border: "2px solid #2563eb", fontWeight: 700, background: "#eff6ff", color: "#1e40af", cursor: "pointer" }}
          >
            <option value="ESTUDIANTE">👤 Modo: ESTUDIANTE</option>
            <option value="DOCENTE">👨‍🏫 Modo: DOCENTE</option>
            <option value="ADMINISTRADOR">🛡️ Modo: ADMINISTRADOR</option>
          </select>

          <button
            onClick={() => setVista("catalogo")}
            style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: vista === "catalogo" ? "#2563eb" : "#e2e8f0", color: vista === "catalogo" ? "#fff" : "#0f172a", cursor: "pointer", fontWeight: 600 }}
          >
            Catálogo Público
          </button>

          {rol === "ESTUDIANTE" && (
            <button
              onClick={() => setVista("mis_inscripciones")}
              style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: vista === "mis_inscripciones" ? "#2563eb" : "#e2e8f0", color: vista === "mis_inscripciones" ? "#fff" : "#0f172a", cursor: "pointer", fontWeight: 600 }}
            >
              Mis Cursos Inscritos ({inscritos.length})
            </button>
          )}

          {(rol === "DOCENTE" || rol === "ADMINISTRADOR") && (
            <>
              <button
                onClick={() => setVista("docente")}
                style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: vista === "docente" ? "#2563eb" : "#e2e8f0", color: vista === "docente" ? "#fff" : "#0f172a", cursor: "pointer", fontWeight: 600 }}
              >
                Gestión Docente
              </button>
              <button
                onClick={() => { setCursoEditar(null); setVista("formulario"); }}
                style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: vista === "formulario" ? "#16a34a" : "#dcfce7", color: vista === "formulario" ? "#fff" : "#166534", cursor: "pointer", fontWeight: 600 }}
              >
                + Nuevo Curso
              </button>
            </>
          )}
        </div>
      </header>

      {vista === "catalogo" && (
        <CatalogoCursos
          rol={rol}
          inscritos={inscritos}
          onInscribir={guardarInscripcion}
          onVerDetalle={(id) => { setCursoIdDetalle(id); setVista("detalle"); }}
          onVerEvaluaciones={abrirEvaluaciones}
        />
      )}

      {vista === "mis_inscripciones" && (
        <div>
          <h2>Mis Cursos Inscritos (Vista Estudiante)</h2>
          {inscritos.length === 0 ? (
            <p style={{ color: "#64748b" }}>Aún no te has inscrito a ningún curso. Ve al Catálogo Público y haz clic en "Inscribirme al Curso".</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {inscritos.map((item) => (
                <div key={item.id} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>[{item.codigo}] {item.titulo}</strong> — <span style={{ color: "#16a34a", fontWeight: 700 }}>INSCRIPCIÓN ACTIVA</span>
                    <p style={{ margin: "4px 0", fontSize: 13 }}>{item.descripcion}</p>
                    <small style={{ color: "#64748b" }}>ID Inscripción: {item.inscripcionId}</small>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setCursoIdDetalle(item.id); setVista("detalle"); }} style={{ padding: "8px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                      Ver Módulos
                    </button>
                    <button onClick={() => abrirEvaluaciones(item)} style={{ padding: "8px 12px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                      Evaluaciones
                    </button>
                    <button onClick={() => cancelarInscripcion(item)} style={{ padding: "8px 12px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                      Cancelar Inscripción (+1 cupo)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {vista === "docente" && (
        <MisCursosDocente
          onEditar={(curso) => { setCursoEditar(curso); setVista("formulario"); }}
          onVerDetalle={(id) => { setCursoIdDetalle(id); setVista("detalle"); }}
          onVerEvaluaciones={abrirEvaluaciones}
        />
      )}

      {vista === "formulario" && (
        <FormularioCurso
          cursoEditar={cursoEditar}
          onGuardado={() => { setCursoEditar(null); setVista("docente"); }}
          onCancelar={() => setVista("docente")}
        />
      )}

      {vista === "detalle" && (
        <DetalleCurso
          cursoId={cursoIdDetalle}
          rol={rol}
          onVolver={() => setVista(rol === "ESTUDIANTE" ? "catalogo" : "docente")}
          onVerEvaluaciones={abrirEvaluaciones}
        />
      )}

      {vista === "evaluaciones" && cursoEvaluacion && (
        <div style={{ background: "#fff", padding: 20, borderRadius: 10, border: "1px solid #cbd5e1" }}>
          <button onClick={() => setVista("catalogo")} style={{ marginBottom: 12, padding: "6px 12px", cursor: "pointer" }}>
            ← Volver a Cursos
          </button>
          <h2>Evaluaciones del Curso: [{cursoEvaluacion.codigo}] {cursoEvaluacion.titulo}</h2>

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
      )}
    </div>
  );
}
