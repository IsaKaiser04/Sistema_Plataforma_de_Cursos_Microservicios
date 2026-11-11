import { useQuery } from '@apollo/client';
import { ME } from '../api/usuarios';
import { mensajeDeError } from '../utils/errores';

const BIENVENIDA = {
  ESTUDIANTE: 'Aquí vas a ver el catálogo de cursos, tus inscripciones y tus notas.',
  DOCENTE: 'Aquí vas a ver tus cursos, sus inscritos y las evaluaciones.',
  ADMINISTRADOR: 'Aquí vas a administrar los usuarios y los cursos de la plataforma.',
};

// Pide "me" al gateway: si se ve el perfil, el token viaja bien hasta ms-usuarios.
export default function Inicio() {
  const { data, loading, error } = useQuery(ME, { fetchPolicy: 'network-only' });

  if (loading) return <p className="texto-suave">Cargando tu perfil...</p>;
  if (error) return <p className="alerta alerta-error">{mensajeDeError(error)}</p>;

  const yo = data.me;

  return (
    <section className="inicio">
      <h1 className="titulo">Hola, {yo.nombres || yo.email}</h1>
      <p className="texto-suave">{BIENVENIDA[yo.rol]}</p>

      <div className="tarjeta perfil">
        <h2 className="subtitulo">Mi perfil</h2>
        <dl className="datos">
          <dt>Nombres</dt>
          <dd>{yo.nombres || '—'}</dd>
          <dt>Apellidos</dt>
          <dd>{yo.apellidos || '—'}</dd>
          <dt>Correo</dt>
          <dd>{yo.email}</dd>
          <dt>Rol</dt>
          <dd>{yo.rol}</dd>
          <dt>Estado</dt>
          <dd>{yo.activo ? 'Activo' : 'Desactivado'}</dd>
        </dl>
      </div>
    </section>
  );
}
