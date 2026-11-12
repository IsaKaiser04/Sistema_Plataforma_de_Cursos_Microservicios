import EvaluacionesDocente from '../evaluaciones/EvaluacionesDocente';
import EvaluacionesEstudiante from '../evaluaciones/EvaluacionesEstudiante';
import '../../styles/evaluaciones.css';

// Evaluaciones de un curso. El rol sale de la sesión real (PaginasCursos):
// el docente o administrador crea, publica y califica; el estudiante responde.
export default function EvaluacionesCurso({ curso, rol, onVolver }) {
  return (
    <section className="seccion">
      <div>
        <button type="button" className="boton boton-secundario" onClick={onVolver}>← Volver</button>
        <h1 className="titulo eval-titulo-pagina">Evaluaciones</h1>
        <p className="texto-suave">[{curso.codigo}] {curso.titulo}</p>
      </div>

      {rol === 'ESTUDIANTE' ? <EvaluacionesEstudiante curso={curso} /> : <EvaluacionesDocente curso={curso} rol={rol} />}
    </section>
  );
}
