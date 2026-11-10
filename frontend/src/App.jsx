import React, { useState } from 'react';
import { MisEvaluaciones } from './components/MisEvaluaciones';
import { CalificarEvaluacion } from './components/CalificarEvaluacion';
import { CrearEvaluacion } from './components/CrearEvaluacion';

function App() {
  const estudianteIdPrueba = "b1b2b3b4-1111-2222-3333-444455556666";
  const evaluacionIdPrueba = "123e4567-e89b-12d3-a456-426614174000";
  
  // Estado para forzar la actualización de la tabla cuando creas una evaluación
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEvaluacionCreada = () => {
    setRefreshKey(prev => prev + 1); // Incrementa para recargar MisEvaluaciones
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Plataforma LMS - Módulo de Evaluaciones</h1>
      <hr style={{ marginBottom: '20px' }} />

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Columna Izquierda: Crear y Ver Evaluaciones */}
        <div style={{ flex: '1', minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <CrearEvaluacion onEvaluacionCreada={handleEvaluacionCreada} />
          
          {/* Pasamos refreshKey como 'key' para forzar el re-render y consulta al backend */}
          <MisEvaluaciones key={refreshKey} estudianteId={estudianteIdPrueba} />
        </div>

        {/* Columna Derecha: Calificar Evaluación (Docente) */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <CalificarEvaluacion 
            evaluacionId={evaluacionIdPrueba} 
            onCalificacionExitosa={handleEvaluacionCreada} 
          />
        </div>

      </div>
    </div>
  );
}

export default App;