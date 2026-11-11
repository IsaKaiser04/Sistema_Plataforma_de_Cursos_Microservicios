import { useEffect, useState } from "react";
import { cursosApi } from "../../api/cursos";

export default function CatalogoCursos({ rol, inscritos, onInscribir, onVerDetalle, onVerEvaluaciones }) {
  const [cursos, setCursos] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = async () => {
    try {
      setError("");
      const data = await cursosApi.listarCatalogoActivo();
      setCursos(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleInscribirse = async (curso) => {
    try {
      setError("");
      const res = await cursosApi.inscribirEstudiante(curso.id);
      const inscripcionId = res?.evento?.inscripcionId || crypto.randomUUID();
      onInscribir({ ...curso, inscripcionId, estadoInscripcion: "ACTIVA" });
      setMensaje(`Inscripción procesada por RabbitMQ en "${curso.titulo}" (-1 cupo).`);
      setTimeout(() => {
        cargar();
        setMensaje("");
      }, 600);
    } catch (err) {
      setError(err.message);
    }
  };

  const filtrados = cursos.filter((c) =>
    filtroCategoria ? c.categoria.toLowerCase().includes(filtroCategoria.toLowerCase()) : true
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2>Catálogo de Cursos Disponibles</h2>
        <input
          placeholder="Filtrar por categoría..."
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", width: 260 }}
        />
      </div>

      {mensaje && <div style={{ background: "#dcfce7", color: "#166534", padding: 12, borderRadius: 6, marginBottom: 12, fontWeight: 600 }}>{mensaje}</div>}
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {filtrados.map((c) => {
          const yaInscrito = inscritos.some((i) => i.id === c.id);
          return (
            <div key={c.id} style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: 16, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginBottom: 6 }}>
                <span><b>{c.codigo}</b> · {c.categoria}</span>
                <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>{c.nivel}</span>
              </div>
              <h3 style={{ margin: "6px 0 8px", color: "#0f172a" }}>{c.titulo}</h3>
              <p style={{ fontSize: 14, color: "#334155", minHeight: 40 }}>{c.descripcion}</p>
              <div style={{ fontSize: 13, color: "#475569", margin: "12px 0" }}>
                <div>Estado: <b>{c.estado}</b> · Cupos: <b>{c.cuposDisponibles} / {c.cupoMaximo}</b></div>
                <div>Duración: <b>{c.duracionHoras} horas</b> · Módulos: <b>{c.modulos?.length || 0}</b></div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => onVerDetalle(c.id)}
                  style={{ flex: 1, padding: "8px 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                >
                  Ver Módulos
                </button>
                <button
                  onClick={() => onVerEvaluaciones(c)}
                  style={{ flex: 1, padding: "8px 10px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                >
                  Evaluaciones
                </button>
                {rol === "ESTUDIANTE" && (
                  <button
                    disabled={yaInscrito || c.cuposDisponibles <= 0}
                    onClick={() => handleInscribirse(c)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: yaInscrito ? "#94a3b8" : c.cuposDisponibles <= 0 ? "#dc2626" : "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: yaInscrito || c.cuposDisponibles <= 0 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {yaInscrito ? "✓ Ya Inscrito" : c.cuposDisponibles <= 0 ? "Cupo Agotado" : "Inscribirme al Curso"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
