import React, { useState, useEffect } from 'react';
import { evaluacionService } from '../services/evaluacionService';
import { cursoService } from '../services/cursoServices';

export const CrearEvaluacion = ({ onEvaluacionCreada }) => {
  const [titulo, setTitulo] = useState('');
  const [calificacionMinima, setCalificacionMinima] = useState('7.0');
  const [cursos, setCursos] = useState([]);
  const [cursoIdSeleccionado, setCursoIdSeleccionado] = useState('');
  const [estudianteId] = useState('b1b2b3b4-1111-2222-3333-444455556666');
  const [inscripcionId] = useState('a5d8f6d2-8b43-4b68-b7d1-0f49c0d38e21');

  // Cargar los cursos del microservicio de tu compañero al iniciar
  useEffect(() => {
    cursoService.obtenerCursos().then(data => {
      setCursos(data);
      if (data.length > 0) setCursoIdSeleccionado(data[0].id); // Selecciona el primero por defecto
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await evaluacionService.crearEvaluacion({
        titulo,
        calificacionMinima: parseFloat(calificacionMinima),
        estudianteId,
        cursoId: cursoIdSeleccionado, // Usamos el ID real que viene del otro microservicio
        inscripcionId
      });
      alert('¡Evaluación creada y validada con el microservicio de Cursos!');
      setTitulo('');
      if (onEvaluacionCreada) onEvaluacionCreada();
    } catch (error) {
      alert('Error: Asegúrate de que el microservicio de Cursos esté encendido y tenga registros.');
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', background: '#f9f9f9' }}>
      <h3>Asignar Nueva Evaluación (Conectado a Cursos)</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Título del Examen:</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Seleccionar Curso (Microservicio Externo):</label>
          <select 
            value={cursoIdSeleccionado} 
            onChange={(e) => setCursoIdSeleccionado(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            required
          >
            {cursos.map(curso => (
              <option key={curso.id} value={curso.id}>
                {curso.nombre || curso.titulo || curso.id}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Calificación Mínima:</label>
          <input
            type="number"
            step="0.1"
            min="7"
            max="10"
            value={calificacionMinima}
            onChange={(e) => setCalificacionMinima(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            required
          />
        </div>

        <button type="submit" style={{ backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer' }}>
          Crear Evaluación
        </button>
      </form>
    </div>
  );
};