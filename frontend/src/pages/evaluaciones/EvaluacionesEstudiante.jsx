import { useCallback, useEffect, useState } from 'react';
import { evaluacionesApi } from '../../api/evaluaciones';
import { TIPOS, estadoParaEstudiante, formatearFecha } from '../../utils/evaluaciones';

// Evaluaciones publicadas del curso para el estudiante inscrito.
// ms-evaluaciones solo devuelve las publicadas y solo la entrega y las notas propias.
export default function EvaluacionesEstudiante({ curso }) {
  const [items, setItems] = useState([]); // { evaluacion, entrega, calificacion, errorEntrega }
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [noHabilitado, setNoHabilitado] = useState(false);
  const [abiertaId, setAbiertaId] = useState(null);
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    setNoHabilitado(false);
    try {
      const evaluaciones = await evaluacionesApi.listarPorCurso(curso.id);
      const [notas, entregas] = await Promise.all([
        evaluacionesApi.misCalificaciones(curso.id),
        // Si falla la consulta de una entrega no se muestra el formulario, para no arriesgar un envío doble.
        Promise.all(
          evaluaciones.map((ev) =>
            evaluacionesApi.entregas(ev.id).then(
              (lista) => ({ entrega: lista[0] ?? null }),
              (err) => ({ entrega: null, errorEntrega: err.message })
            )
          )
        ),
      ]);
      setItems(
        evaluaciones.map((ev, i) => ({
          evaluacion: ev,
          ...entregas[i],
          calificacion: notas.find((n) => n.evaluacionId === ev.id) ?? null,
        }))
      );
    } catch (err) {
      if (err.codigo === 'PROHIBIDO') setNoHabilitado(true);
      else setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [curso.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando && items.length === 0) return <p className="texto-suave">Cargando evaluaciones...</p>;

  if (noHabilitado) {
    return (
      <div className="tarjeta vacio">
        <h2 className="subtitulo">Todavía no tienes acceso a las evaluaciones de este curso</h2>
        <p className="texto-suave">
          Necesitas una inscripción activa. Si te inscribiste hace poco, espera a que en "Mis cursos" aparezca como
          Activa y vuelve a intentarlo.
        </p>
        <button type="button" className="boton boton-secundario" onClick={cargar}>Volver a intentar</button>
      </div>
    );
  }

  const abierta = items.find((it) => it.evaluacion.id === abiertaId);
  if (abierta) {
    return (
      <DetalleEvaluacion
        item={abierta}
        onVolver={() => setAbiertaId(null)}
        onEntregada={async () => {
          setAbiertaId(null);
          setAviso('Tus respuestas se enviaron. El docente las revisará y pondrá tu nota.');
          await cargar();
        }}
        onRecargar={cargar}
      />
    );
  }

  return (
    <div className="seccion">
      {aviso && <p className="alerta alerta-exito" role="status">{aviso}</p>}
      {error && (
        <p className="alerta alerta-error" role="alert">
          {error}{' '}
          <button type="button" className="boton-enlace" onClick={cargar}>Reintentar</button>
        </p>
      )}

      {!error && items.length === 0 && (
        <div className="tarjeta vacio">
          <h2 className="subtitulo">No hay evaluaciones publicadas</h2>
          <p className="texto-suave">Cuando el docente publique una evaluación aparecerá aquí.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="eval-lista">
          {items.map((it) => {
            const ev = it.evaluacion;
            const estado = estadoParaEstudiante(ev, it.entrega, it.calificacion);
            const puedeResponder = estado.clave === 'PENDIENTE' && !it.errorEntrega;
            return (
              <article key={ev.id} className="tarjeta eval-tarjeta">
                <div className="eval-cabecera">
                  <div>
                    <p className="eval-titulo">{ev.titulo}</p>
                    <span className="texto-suave">
                      {TIPOS[ev.tipo] ?? ev.tipo} · Peso {ev.peso}% · {ev.preguntas.length} pregunta(s)
                    </span>
                  </div>
                  <span className={`insignia ${estado.clase}`}>{estado.texto}</span>
                </div>
                <p className="texto-suave eval-periodo">
                  Disponible del {formatearFecha(ev.fechaApertura)} al {formatearFecha(ev.fechaCierre)}
                  {estado.detalle ? ` · ${estado.detalle}` : ''}
                </p>
                {it.calificacion && (
                  <p className={`alerta ${it.calificacion.aprobado ? 'alerta-exito' : 'alerta-error'}`}>
                    Nota: <b>{it.calificacion.nota} / 10</b> · {it.calificacion.aprobado ? 'Aprobado' : 'Reprobado'}
                  </p>
                )}
                {it.errorEntrega && <p className="alerta alerta-error">No se pudo revisar tu entrega: {it.errorEntrega}</p>}
                <div className="eval-acciones">
                  {puedeResponder && (
                    <button type="button" className="boton" onClick={() => { setAviso(''); setAbiertaId(ev.id); }}>
                      Responder
                    </button>
                  )}
                  {(it.entrega || it.calificacion) && (
                    <button type="button" className="boton boton-secundario" onClick={() => { setAviso(''); setAbiertaId(ev.id); }}>
                      {it.calificacion ? 'Ver nota y respuestas' : 'Ver mi entrega'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetalleEvaluacion({ item, onVolver, onEntregada, onRecargar }) {
  const { evaluacion, entrega, calificacion } = item;
  const estado = estadoParaEstudiante(evaluacion, entrega, calificacion);
  const [respuestas, setRespuestas] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const preguntas = [...evaluacion.preguntas].sort((a, b) => a.orden - b.orden);
  const faltan = preguntas.filter((p) => !(respuestas[p.id] || '').trim()).length;

  async function enviar(e) {
    e.preventDefault();
    if (faltan > 0) {
      setError(`Responde todas las preguntas antes de enviar (faltan ${faltan}).`);
      return;
    }
    const confirmado = window.confirm(
      'Solo puedes enviar esta evaluación una vez. Después no podrás editar tus respuestas. ¿Enviar ahora?'
    );
    if (!confirmado) return;
    setError('');
    setEnviando(true);
    try {
      await evaluacionesApi.entregar(
        evaluacion.id,
        preguntas.map((p) => ({ preguntaId: p.id, respuesta: respuestas[p.id].trim() }))
      );
      await onEntregada();
    } catch (err) {
      setError(err.message);
      // Si ya había una entrega o cerró el plazo, se recarga para mostrar el estado real.
      if (['ENTREGA_YA_REALIZADA', 'FUERA_DE_PLAZO', 'EVALUACION_CERRADA'].includes(err.codigo)) onRecargar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="seccion">
      <div>
        <button type="button" className="boton boton-secundario" onClick={onVolver}>← Volver a evaluaciones</button>
      </div>

      <article className="tarjeta eval-entrega">
        <div className="eval-cabecera">
          <div>
            <h2 className="subtitulo eval-subtitulo">{evaluacion.titulo}</h2>
            <p className="texto-suave">
              Disponible del {formatearFecha(evaluacion.fechaApertura)} al {formatearFecha(evaluacion.fechaCierre)} ·
              Nota sobre 10
            </p>
          </div>
          <span className={`insignia ${estado.clase}`}>{estado.texto}</span>
        </div>
        {evaluacion.descripcion && <p className="eval-descripcion">{evaluacion.descripcion}</p>}

        {calificacion && (
          <div className={`alerta ${calificacion.aprobado ? 'alerta-exito' : 'alerta-error'} eval-nota`}>
            <p>
              Tu nota: <b>{calificacion.nota} / 10</b> · {calificacion.aprobado ? 'Aprobado' : 'Reprobado'} (se aprueba
              con {calificacion.notaMinima} o más)
            </p>
            {calificacion.retroalimentacion && <p>Comentario del docente: {calificacion.retroalimentacion}</p>}
          </div>
        )}

        {entrega ? (
          <>
            <p className="texto-suave">Enviaste tus respuestas el {formatearFecha(entrega.fechaEntrega)}. Ya no se pueden editar.</p>
            {!calificacion && <p className="alerta alerta-info">Tu entrega está esperando la calificación del docente.</p>}
            <ol className="eval-respuestas">
              {entrega.respuestas.map((r) => (
                <li key={r.preguntaId}>
                  <p className="eval-enunciado">{r.enunciado}</p>
                  <p className="eval-respuesta">{r.respuesta}</p>
                </li>
              ))}
            </ol>
          </>
        ) : estado.clave === 'PENDIENTE' ? (
          <form className="formulario" onSubmit={enviar} noValidate>
            <p className="alerta alerta-info">
              Importante: solo puedes enviar esta evaluación una vez y después no podrás modificar tus respuestas.
            </p>
            {preguntas.map((p, i) => (
              <label key={p.id} className="campo">
                {i + 1}. {p.enunciado}
                <textarea rows={4} maxLength={4000} value={respuestas[p.id] || ''}
                  onChange={(e) => setRespuestas({ ...respuestas, [p.id]: e.target.value })} />
              </label>
            ))}
            {error && <p className="alerta alerta-error" role="alert">{error}</p>}
            <div className="eval-acciones">
              <button type="submit" className="boton" disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar respuestas'}
              </button>
            </div>
          </form>
        ) : (
          !calificacion && <p className="alerta alerta-error">{estado.detalle || 'La evaluación no está disponible.'}</p>
        )}
        {error && !(estado.clave === 'PENDIENTE' && !entrega) && <p className="alerta alerta-error" role="alert">{error}</p>}
      </article>
    </div>
  );
}
