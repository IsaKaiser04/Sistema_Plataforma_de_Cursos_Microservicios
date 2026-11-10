import React, { useState } from 'react';
import { evaluacionService } from "../services/evaluacionService";

export const CalificarEvaluacion = ({ evaluacionId, onCalificacionExitosa }) => {
  const [nota, setNota] = useState('');
  const [retroalimentacion, setRetroalimentacion] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nota || nota < 0 || nota > 5) {
      alert("Por favor ingresa una nota válida entre 0.0 y 5.0");
      return;
    }

    try {
      setEnviando(true);
      await evaluacionService.calificarEvaluacion(evaluacionId, nota, retroalimentacion);
      alert("Evaluación calificada exitosamente. (Evento publicado a RabbitMQ)");
      setNota('');
      setRetroalimentacion('');
      if (onCalificacionExitosa) onCalificacionExitosa();
    } catch (error) {
      alert("Error al guardar la calificación.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', maxWidth: '400px' }}>
      <h3>Calificar Estudiante</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Calificación (0.0 - 5.0):</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Retroalimentación:</label>
          <textarea
            value={retroalimentacion}
            onChange={(e) => setRetroalimentacion(e.target.value)}
            rows="4"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            placeholder="Escribe comentarios para el estudiante..."
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          style={{
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {enviando ? 'Guardando...' : 'Guardar Calificación'}
        </button>
      </form>
    </div>
  );
};