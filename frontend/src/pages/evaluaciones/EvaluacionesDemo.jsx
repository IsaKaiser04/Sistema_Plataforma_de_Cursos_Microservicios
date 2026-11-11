import { useState } from 'react';
import { MisEvaluaciones } from '../../components/MisEvaluaciones';
import { CalificarEvaluacion } from '../../components/CalificarEvaluacion';
import { CrearEvaluacion } from '../../components/CrearEvaluacion';

// Pantallas de evaluaciones que estaban en App.jsx, sin cambios.
// Todavía llaman directo a ms-evaluaciones con axios; Josué las pasa a GraphQL en su T6.
export default function EvaluacionesDemo() {
  const estudianteIdPrueba = 'b1b2b3b4-1111-2222-3333-444455556666';
  const evaluacionIdPrueba = '123e4567-e89b-12d3-a456-426614174000';

  const [refreshKey, setRefreshKey] = useState(0);
  const handleEvaluacionCreada = () => setRefreshKey((prev) => prev + 1);

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Plataforma LMS - Módulo de Evaluaciones</h1>
      <hr style={{ marginBottom: '20px' }} />

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1', minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <CrearEvaluacion onEvaluacionCreada={handleEvaluacionCreada} />
          <MisEvaluaciones key={refreshKey} estudianteId={estudianteIdPrueba} />
        </div>

        <div style={{ flex: '1', minWidth: '300px' }}>
          <CalificarEvaluacion evaluacionId={evaluacionIdPrueba} onCalificacionExitosa={handleEvaluacionCreada} />
        </div>
      </div>
    </div>
  );
}
