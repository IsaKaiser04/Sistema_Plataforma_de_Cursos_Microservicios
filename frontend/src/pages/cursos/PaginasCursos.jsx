import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext';
import { MIS_INSCRIPCIONES } from '../../api/usuarios';
import { cursosApi } from '../../api/cursos';
import CatalogoCursos from './CatalogoCursos';
import DetalleCurso from './DetalleCurso';
import MisCursosDocente from './MisCursosDocente';
import FormularioCurso from './FormularioCurso';
import EvaluacionesCurso from './EvaluacionesCurso';

// Conectan las pantallas de cursos (que reciben callbacks por props) con las rutas
// y con la sesión real. El rol sale del login, ya no de un selector.

const VIGENTES = ['PENDIENTE', 'ACTIVA'];

const irAEvaluaciones = (navigate) => (curso) =>
  navigate(`/cursos/${curso.id}/evaluaciones`, { state: { curso } });

// Devuelve el curso que vino en la navegación o lo pide al gateway.
function useCurso(id) {
  const location = useLocation();
  const enEstado = location.state?.curso;
  const [curso, setCurso] = useState(enEstado?.id === id ? enEstado : null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || curso?.id === id) return;
    cursosApi.obtenerPorId(id).then(setCurso).catch((e) => setError(e.message));
  }, [id, curso?.id]);

  return { curso, error };
}

export function CatalogoPagina() {
  const { usuario } = useSesion();
  const navigate = useNavigate();
  const esEstudiante = usuario.rol === 'ESTUDIANTE';

  // El catálogo marca "Ya inscrito" con las inscripciones reales de ms-usuarios.
  const { data, refetch } = useQuery(MIS_INSCRIPCIONES, {
    skip: !esEstudiante,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const inscritos = (data?.misInscripciones ?? [])
    .filter((i) => VIGENTES.includes(i.estado))
    .map((i) => ({ id: i.cursoId, inscripcionId: i.id }));

  return (
    <CatalogoCursos
      rol={usuario.rol}
      inscritos={inscritos}
      onInscribir={() => refetch()}
      onVerDetalle={(id) => navigate(`/cursos/${id}`)}
      onVerEvaluaciones={irAEvaluaciones(navigate)}
    />
  );
}

export function DetallePagina() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const navigate = useNavigate();
  return (
    <DetalleCurso
      key={id}
      cursoId={id}
      rol={usuario.rol}
      onVolver={() => navigate(-1)}
      onVerEvaluaciones={irAEvaluaciones(navigate)}
    />
  );
}

export function GestionCursosPagina() {
  const navigate = useNavigate();
  return (
    <MisCursosDocente
      onEditar={(curso) => navigate(`/docente/cursos/${curso.id}/editar`, { state: { curso } })}
      onVerDetalle={(id) => navigate(`/cursos/${id}`)}
      onVerEvaluaciones={irAEvaluaciones(navigate)}
    />
  );
}

export function FormularioCursoPagina() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { curso, error } = useCurso(id);

  if (id && error) return <p className="alerta alerta-error">{error}</p>;
  if (id && !curso) return <p className="texto-suave">Cargando curso...</p>;

  return (
    <FormularioCurso
      cursoEditar={id ? curso : null}
      onGuardado={() => navigate('/docente/cursos')}
      onCancelar={() => navigate(-1)}
    />
  );
}

export function EvaluacionesPagina() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const navigate = useNavigate();
  const { curso, error } = useCurso(id);

  if (error) return <p className="alerta alerta-error">{error}</p>;
  if (!curso) return <p className="texto-suave">Cargando curso...</p>;

  return <EvaluacionesCurso curso={curso} rol={usuario.rol} onVolver={() => navigate(-1)} />;
}
