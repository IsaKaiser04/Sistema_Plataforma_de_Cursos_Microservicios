import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { MIS_INSCRIPCIONES, CANCELAR_INSCRIPCION } from '../../api/usuarios';
import { mensajeDeError } from '../../utils/errores';

// frontend.md, P5: mientras haya una inscripción PENDIENTE se vuelve a consultar cada 3 segundos.
const INTERVALO_MS = 3000;

const ESTADOS = {
  PENDIENTE: { texto: 'Esperando confirmación', clase: 'insignia-pendiente' },
  ACTIVA: { texto: 'Activa', clase: 'insignia-activa' },
  RECHAZADA: { texto: 'Rechazada', clase: 'insignia-rechazada' },
  CANCELADA: { texto: 'Cancelada', clase: 'insignia-cancelada' },
  FINALIZADA: { texto: 'Finalizada', clase: 'insignia-finalizada' },
};

const MOTIVOS = {
  CUPO_AGOTADO: 'El curso ya no tenía cupos disponibles.',
  CURSO_NO_DISPONIBLE: 'El curso no estaba aceptando inscripciones.',
  CURSO_NO_EXISTE: 'El curso ya no existe.',
};

const VIGENTES = ['PENDIENTE', 'ACTIVA'];

// "2026-11-10T10:00:00" -> "10/11/2026 10:00" (las fechas ya vienen en hora de Ecuador)
function formatearFecha(texto) {
  const [fecha, hora = ''] = String(texto).split('T');
  const [anio, mes, dia] = fecha.split('-');
  return dia ? `${dia}/${mes}/${anio} ${hora.slice(0, 5)}` : texto;
}

function TarjetaInscripcion({ inscripcion, alCancelar, cancelando }) {
  const estado = ESTADOS[inscripcion.estado] ?? { texto: inscripcion.estado, clase: '' };
  const sePuedeCancelar = VIGENTES.includes(inscripcion.estado);
  const curso = inscripcion.curso;

  return (
    <article className="tarjeta inscripcion">
      <div className="inscripcion-cabecera">
        <div>
          {curso ? (
            <>
              <p className="inscripcion-curso">{curso.titulo}</p>
              <span className="texto-suave inscripcion-codigo">{curso.codigo}</span>
            </>
          ) : (
            // Sin datos de ms-cursos (caído o curso borrado) se muestra el id.
            <>
              <p className="inscripcion-curso">Curso</p>
              <code className="inscripcion-id">{inscripcion.cursoId}</code>
            </>
          )}
        </div>
        <span className={`insignia ${estado.clase}`}>{estado.texto}</span>
      </div>

      {inscripcion.estado === 'PENDIENTE' && (
        <p className="texto-suave">El servicio de cursos está confirmando tu cupo...</p>
      )}
      {inscripcion.estado === 'RECHAZADA' && (
        <p className="alerta alerta-error">
          {MOTIVOS[inscripcion.motivoRechazo] ?? 'El curso rechazó la inscripción.'}
        </p>
      )}

      <div className="inscripcion-pie">
        <span className="texto-suave">Inscrito el {formatearFecha(inscripcion.fechaInscripcion)}</span>
        <div className="inscripcion-acciones">
          {inscripcion.estado === 'ACTIVA' && (
            <Link to={`/cursos/${inscripcion.cursoId}`} className="boton">
              Ver contenido
            </Link>
          )}
          {inscripcion.estado === 'ACTIVA' && (
            <Link to={`/cursos/${inscripcion.cursoId}/evaluaciones`} className="boton boton-secundario">
              Evaluaciones
            </Link>
          )}
          {sePuedeCancelar && (
            <button
              type="button"
              className="boton boton-secundario"
              disabled={cancelando}
              onClick={() => alCancelar(inscripcion)}
            >
              Cancelar inscripción
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function MisCursos() {
  const [errorAccion, setErrorAccion] = useState('');
  const { data, loading, error, startPolling, stopPolling } = useQuery(MIS_INSCRIPCIONES, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all', // si ms-cursos falla, igual se ven las inscripciones (sin título)
  });
  const [cancelar, { loading: cancelando }] = useMutation(CANCELAR_INSCRIPCION);

  const inscripciones = data?.misInscripciones ?? [];
  const hayPendientes = inscripciones.some((i) => i.estado === 'PENDIENTE');

  useEffect(() => {
    if (!hayPendientes) {
      stopPolling();
      return undefined;
    }
    startPolling(INTERVALO_MS);
    return () => stopPolling();
  }, [hayPendientes, startPolling, stopPolling]);

  async function alCancelar(inscripcion) {
    if (!window.confirm('¿Seguro que quieres cancelar esta inscripción? Liberarás tu cupo.')) return;
    setErrorAccion('');
    try {
      await cancelar({ variables: { id: inscripcion.id } });
    } catch (err) {
      setErrorAccion(mensajeDeError(err));
    }
  }

  const vigentes = inscripciones.filter((i) => VIGENTES.includes(i.estado));
  const historial = inscripciones.filter((i) => !VIGENTES.includes(i.estado));
  // Con errorPolicy 'all' solo es error de verdad si no llegó la lista.
  const errorGrave = error && !data?.misInscripciones;

  return (
    <section className="seccion">
      <div>
        <h1 className="titulo">Mis cursos</h1>
        <p className="texto-suave">Tus inscripciones y su estado. Las que esperan confirmación se actualizan solas.</p>
      </div>

      {errorAccion && <p className="alerta alerta-error" role="alert">{errorAccion}</p>}
      {errorGrave && <p className="alerta alerta-error">{mensajeDeError(error)}</p>}
      {loading && inscripciones.length === 0 && <p className="texto-suave">Cargando tus inscripciones...</p>}

      {!loading && !errorGrave && inscripciones.length === 0 && (
        <div className="tarjeta vacio">
          <h2 className="subtitulo">Todavía no te inscribiste en ningún curso</h2>
          <p className="texto-suave">
            Entra al <Link to="/cursos">catálogo</Link> y pulsa "Inscribirme al Curso".
          </p>
        </div>
      )}

      {vigentes.length > 0 && (
        <div className="lista-inscripciones">
          {vigentes.map((i) => (
            <TarjetaInscripcion key={i.id} inscripcion={i} alCancelar={alCancelar} cancelando={cancelando} />
          ))}
        </div>
      )}

      {historial.length > 0 && (
        <>
          <h2 className="subtitulo">Historial</h2>
          <div className="lista-inscripciones">
            {historial.map((i) => (
              <TarjetaInscripcion key={i.id} inscripcion={i} alCancelar={alCancelar} cancelando={cancelando} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
