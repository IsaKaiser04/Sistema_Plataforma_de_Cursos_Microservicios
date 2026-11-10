import React, { useState, useEffect } from 'react';
import { evaluacionService } from '../services/evaluacionService';

export const MisEvaluaciones = ({ cursoId }) => {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarEvaluaciones();
  }, [cursoId]);

  const cargarEvaluaciones = async () => {
    try {
      setCargando(true);
      // Traemos todas las evaluaciones registradas en el sistema
      const data = await evaluacionService.obtenerTodas();
      setEvaluaciones(data);
    } catch (error) {
      console.error("No se pudieron cargar las evaluaciones:", error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return <p>Cargando evaluaciones...</p>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', background: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Lista de Evaluaciones Registradas</h2>
      {evaluaciones.length === 0 ? (
        <p>No hay evaluaciones registradas por el momento.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left' }}>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Título</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Nota Mínima</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>ID de Curso</th>
            </tr>
          </thead>
          <tbody>
            {evaluaciones.map((item) => (
              <tr key={item.id || item.titulo}>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.titulo}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.calificacionMinima}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd', fontSize: '12px', color: '#666' }}>{item.cursoId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};