import { useEffect, useState } from "react";
import { cursosApi } from "../../api/cursos";

const INITIAL = {
  codigo: "",
  titulo: "",
  descripcion: "",
  categoria: "Sistemas Distribuidos",
  nivel: "INTERMEDIO",
  docenteId: "11111111-2222-3333-4444-555555555555",
  cupoMaximo: 35,
  duracionHoras: 48,
  precio: 0,
};

export default function FormularioCurso({ cursoEditar, onGuardado, onCancelar }) {
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState("");

  useEffect(() => {
    if (cursoEditar) {
      setForm({
        codigo: cursoEditar.codigo,
        titulo: cursoEditar.titulo,
        descripcion: cursoEditar.descripcion,
        categoria: cursoEditar.categoria,
        nivel: cursoEditar.nivel,
        docenteId: cursoEditar.docenteId,
        cupoMaximo: cursoEditar.cupoMaximo,
        duracionHoras: cursoEditar.duracionHoras,
        precio: cursoEditar.precio,
      });
    } else {
      setForm(INITIAL);
    }
  }, [cursoEditar]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const payload = {
        ...form,
        cupoMaximo: Number(form.cupoMaximo),
        duracionHoras: Number(form.duracionHoras),
        precio: Number(form.precio),
        modulos: [],
      };
      if (cursoEditar?.id) {
        await cursosApi.actualizarCurso(cursoEditar.id, payload);
      } else {
        await cursosApi.crearCurso(payload);
      }
      onGuardado();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 10, border: "1px solid #cbd5e1" }}>
      <h3>{cursoEditar ? `Editar Curso: ${cursoEditar.codigo}` : "Crear Nuevo Curso"}</h3>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <input placeholder="Código (ej. SD-2026-02)" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required style={{ padding: 8 }} />
        <input placeholder="Título del curso" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required style={{ padding: 8 }} />
        <input placeholder="Categoría" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required style={{ padding: 8 }} />
        <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} style={{ padding: 8 }}>
          <option value="BASICO">BÁSICO</option>
          <option value="INTERMEDIO">INTERMEDIO</option>
          <option value="AVANZADO">AVANZADO</option>
        </select>
        <input type="number" min="1" placeholder="Cupo Máximo" value={form.cupoMaximo} onChange={(e) => setForm({ ...form, cupoMaximo: e.target.value })} required style={{ padding: 8 }} />
        <input type="number" min="1" placeholder="Duración (horas)" value={form.duracionHoras} onChange={(e) => setForm({ ...form, duracionHoras: e.target.value })} required style={{ padding: 8 }} />
        <input placeholder="UUID del Docente" value={form.docenteId} onChange={(e) => setForm({ ...form, docenteId: e.target.value })} required style={{ gridColumn: "span 2", padding: 8 }} />
        <textarea placeholder="Descripción completa del curso" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required style={{ gridColumn: "span 2", padding: 8, minHeight: 70 }} />

        <div style={{ gridColumn: "span 2", display: "flex", gap: 10 }}>
          <button type="submit" style={{ flex: 1, padding: 10, background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>
            {cursoEditar ? "Guardar Cambios" : "Crear Curso en Borrador"}
          </button>
          {onCancelar && (
            <button type="button" onClick={onCancelar} style={{ padding: "10px 16px", borderRadius: 6, border: "1px solid #cbd5e1", cursor: "pointer" }}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
