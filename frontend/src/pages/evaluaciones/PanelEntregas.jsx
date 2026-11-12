import { useCallback, useEffect, useState } from 'react';
import { evaluacionesApi } from '../../api/evaluaciones';
import { NOTA_MINIMA_POR_DEFECTO, formatearFecha, idCorto, validarNota } from '../../utils/evaluaciones';

// Entregas de una evaluación: el docente elige un estudiante, revisa sus respuestas
// y le pone una nota total de 0 a 10 con retroalimentación opcional.
export default function PanelEntregas({ evaluacion, cursoId, rol, onVolver }) {
  const sinPreguntas = (evaluacion.preguntas?.length ?? 0) === 0;
  const [entregas, setEntregas] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [nombres, setNombres] = useState({});
  const [cargando, setCargando] = useState(true);
  // "Sin entregas" solo se muestra cuando la consulta terminó bien.
  const [entregasCargadas, setEntregasCargadas] = useState(false);
  const [error, setError] = useState('');
  const [errorNotas, setErrorNotas] = useState('');
  const [seleccionadoId, setSeleccionadoId] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    setErrorNotas('');
    // Entregas y notas se piden por separado: si fallan las notas, las entregas igual se muestran.
    const [resEntregas, resNotas, resInscritos] = await Promise.allSettled([
      evaluacionesApi.entregas(evaluacion.id),
      evaluacionesApi.calificaciones(evaluacion.id),
      // Las evaluaciones antiguas sin preguntas se califican directo a los inscritos activos.
      sinPreguntas ? evaluacionesApi.inscritosActivos(cursoId) : Promise.resolve([]),
    ]);

    if (resEntregas.status === 'fulfilled') {
      const reales = resEntregas.value ?? [];
      const conEntrega = new Set(reales.map((e) => e.estudianteId));
      const sinEntrega =
        resInscritos.status === 'fulfilled'
          ? resInscritos.value
              .filter((i) => !conEntrega.has(i.estudianteId))
              .map((i) => ({ id: `inscripcion-${i.id}`, estudianteId: i.estudianteId, respuestas: [], fechaEntrega: null }))
          : [];
      const lista = [...reales, ...sinEntrega];
      setEntregas(lista);
      setEntregasCargadas(true);
      // Con una sola entrega se abre directamente
      setSeleccionadoId((actual) => actual ?? (lista.length === 1 ? lista[0].estudianteId : null));
    } else {
      setEntregasCargadas(false);
      setError(resEntregas.reason.message);
    }

    if (resNotas.status === 'fulfilled') setCalificaciones(resNotas.value ?? []);
    else setErrorNotas(resNotas.reason.message);
    setCargando(false);
  }, [cursoId, evaluacion.id, sinPreguntas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Solo el administrador puede listar usuarios; al docente se le muestra el identificador.
  useEffect(() => {
    if (rol !== 'ADMINISTRADOR') return;
    evaluacionesApi.nombresEstudiantes().then(setNombres).catch(() => setNombres({}));
  }, [rol]);

  const nombreDe = (id) => nombres[id] || `Estudiante ${idCorto(id)}`;
  const calificacionDe = (id) => calificaciones.find((c) => c.estudianteId === id);
  const seleccionada = entregas.find((e) => e.estudianteId === seleccionadoId);
  // El mínimo lo define ms-evaluaciones; si ya calificó a alguien, se usa el que devolvió.
  const notaMinimaConocida = calificaciones[0]?.notaMinima;

  return (
    <div className="seccion">
      <div className="eval-cabecera">
        <div>
          <div className="eval-acciones">
            <button type="button" className="boton boton-secundario" onClick={onVolver}>← Volver a evaluaciones</button>
            <button type="button" className="boton boton-secundario" onClick={cargar} disabled={cargando}>
              {cargando ? 'Actualizando...' : 'Actualizar entregas'}
            </button>
          </div>
          <h2 className="subtitulo eval-subtitulo">Entregas de "{evaluacion.titulo}"</h2>
          <p className="texto-suave">
            Del {formatearFecha(evaluacion.fechaApertura)} al {formatearFecha(evaluacion.fechaCierre)} · Nota sobre 10
          </p>
        </div>
      </div>

      {evaluacion.estado !== 'PUBLICADA' && (
        <p className="alerta alerta-info">
          La evaluación está {evaluacion.estado === 'CERRADA' ? 'cerrada' : 'en borrador'}: puedes revisar las
          entregas, pero ms-evaluaciones solo permite calificar mientras está publicada.
        </p>
      )}
      {sinPreguntas && (
        <p className="alerta alerta-info">
          Esta evaluación es antigua y no tiene preguntas: se califica directamente a los estudiantes con inscripción activa.
        </p>
      )}
      {error && (
        <p className="alerta alerta-error" role="alert">
          {error}{' '}
          <button type="button" className="boton-enlace" onClick={cargar}>Reintentar</button>
        </p>
      )}
      {errorNotas && (
        <p className="alerta alerta-error" role="alert">
          No se pudieron cargar las notas ya guardadas: {errorNotas}
        </p>
      )}
      {cargando && entregas.length === 0 && <p className="texto-suave">Cargando entregas...</p>}

      {!cargando && entregasCargadas && entregas.length === 0 && (
        <div className="tarjeta vacio">
          <h3 className="subtitulo">Todavía no hay entregas</h3>
          <p className="texto-suave">
            {sinPreguntas
              ? 'No hay estudiantes con inscripción activa en este curso.'
              : 'Cuando un estudiante envíe sus respuestas aparecerá aquí. No se puede calificar sin una entrega.'}
          </p>
        </div>
      )}

      {entregas.length > 0 && (
        <div className="eval-panel">
          <ul className="eval-estudiantes" aria-label="Estudiantes con entrega">
            {entregas.map((e) => {
              const nota = calificacionDe(e.estudianteId);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className={`eval-estudiante ${seleccionadoId === e.estudianteId ? 'eval-estudiante-activo' : ''}`}
                    onClick={() => setSeleccionadoId(e.estudianteId)}
                  >
                    <span className="eval-estudiante-nombre">{nombreDe(e.estudianteId)}</span>
                    <span className="texto-suave">
                      {e.fechaEntrega ? `Entregó el ${formatearFecha(e.fechaEntrega)}` : 'Sin entrega (evaluación sin preguntas)'}
                    </span>
                    <span className={`insignia ${nota ? (nota.aprobado ? 'insignia-activa' : 'insignia-rechazada') : 'insignia-pendiente'}`}>
                      {nota ? `${nota.nota} / 10` : 'Sin calificar'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="eval-detalle">
            {!seleccionada ? (
              <div className="tarjeta vacio">
                <p className="texto-suave">Elige un estudiante para ver sus respuestas.</p>
              </div>
            ) : (
              <DetalleEntrega
                key={seleccionada.estudianteId}
                evaluacion={evaluacion}
                entrega={seleccionada}
                nombre={nombreDe(seleccionada.estudianteId)}
                calificacion={calificacionDe(seleccionada.estudianteId)}
                notaMinimaConocida={notaMinimaConocida}
                onCalificada={(nueva) =>
                  setCalificaciones((lista) => [...lista.filter((c) => c.estudianteId !== nueva.estudianteId), nueva])
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetalleEntrega({ evaluacion, entrega, nombre, calificacion, notaMinimaConocida, onCalificada }) {
  const [nota, setNota] = useState(calificacion ? String(calificacion.nota) : '');
  const [retro, setRetro] = useState(calificacion?.retroalimentacion || '');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);

  const notaMinima = calificacion?.notaMinima ?? notaMinimaConocida ?? NOTA_MINIMA_POR_DEFECTO;
  const minimoConfirmado = calificacion?.notaMinima != null || notaMinimaConocida != null;
  const errorNota = nota === '' ? '' : validarNota(nota);
  const vistaPrevia = nota !== '' && !errorNota ? Number(nota) >= notaMinima : null;
  const puedeCalificar = evaluacion.estado === 'PUBLICADA';

  async function guardar(e) {
    e.preventDefault();
    const problema = validarNota(nota);
    if (problema) {
      setError(problema);
      return;
    }
    setError('');
    setAviso('');
    setGuardando(true);
    try {
      const guardada = await evaluacionesApi.calificar(evaluacion.id, {
        estudianteId: entrega.estudianteId,
        nota: Number(nota),
        retroalimentacion: retro.trim() || null,
      });
      onCalificada(guardada);
      setAviso(`Nota guardada: ${guardada.nota} / 10 · ${guardada.aprobado ? 'Aprobado' : 'Reprobado'} (mínimo ${guardada.notaMinima}).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="tarjeta eval-entrega">
      <h3 className="subtitulo">{nombre}</h3>

      {entrega.respuestas.length > 0 && (
        <ol className="eval-respuestas">
          {entrega.respuestas.map((r) => (
            <li key={r.preguntaId}>
              <p className="eval-enunciado">{r.enunciado}</p>
              <p className="eval-respuesta">{r.respuesta}</p>
            </li>
          ))}
        </ol>
      )}

      {calificacion && (
        <p className={`alerta ${calificacion.aprobado ? 'alerta-exito' : 'alerta-error'}`}>
          Nota actual: <b>{calificacion.nota} / 10</b> · {calificacion.aprobado ? 'Aprobado' : 'Reprobado'} (mínimo{' '}
          {calificacion.notaMinima})
        </p>
      )}

      <form className="formulario" onSubmit={guardar} noValidate>
        <div className="eval-fila">
          <label className="campo">
            Nota total (0 a 10)
            <input type="number" min="0" max="10" step="0.1" value={nota} disabled={!puedeCalificar}
              onChange={(e) => { setNota(e.target.value); setAviso(''); }} />
            {errorNota && <small className="eval-error-campo">{errorNota}</small>}
          </label>
          <div className="campo">
            Resultado
            <span className={`insignia eval-resultado ${vistaPrevia === null ? '' : vistaPrevia ? 'insignia-activa' : 'insignia-rechazada'}`}>
              {vistaPrevia === null ? '—' : vistaPrevia ? 'Aprobado' : 'Reprobado'}
            </span>
            <small className="texto-suave">
              Se aprueba con {notaMinima} o más{minimoConfirmado ? '' : ' (valor por defecto del servicio)'}.
            </small>
          </div>
        </div>
        <label className="campo">
          Retroalimentación (opcional)
          <textarea value={retro} onChange={(e) => setRetro(e.target.value)} maxLength={2000} rows={3}
            disabled={!puedeCalificar} />
        </label>

        {error && <p className="alerta alerta-error" role="alert">{error}</p>}
        {aviso && <p className="alerta alerta-exito" role="status">{aviso}</p>}

        {puedeCalificar && (
          <div className="eval-acciones">
            <button type="submit" className="boton" disabled={guardando}>
              {guardando ? 'Guardando...' : calificacion ? 'Actualizar nota' : 'Guardar nota'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
