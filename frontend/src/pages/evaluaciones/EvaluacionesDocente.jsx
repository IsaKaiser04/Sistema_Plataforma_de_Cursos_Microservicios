import { useCallback, useEffect, useRef, useState } from 'react';
import { evaluacionesApi } from '../../api/evaluaciones';
import { TIPOS, formatearFecha } from '../../utils/evaluaciones';
import PanelEntregas from './PanelEntregas';

const ESTADOS = {
  BORRADOR: { texto: 'Borrador', clase: 'insignia-cancelada' },
  PUBLICADA: { texto: 'Publicada', clase: 'insignia-activa' },
  CERRADA: { texto: 'Cerrada', clase: 'insignia-finalizada' },
};

const FORM_VACIO = {
  titulo: '',
  descripcion: '',
  tipo: 'EXAMEN',
  peso: '',
  fechaApertura: '',
  fechaCierre: '',
};

// Formulario de una evaluación nueva con preguntas abiertas.
function FormularioEvaluacion({ cursoId, onCreada, onCancelar }) {
  const siguienteClave = useRef(1);
  const nuevaPregunta = () => ({ clave: siguienteClave.current++, enunciado: '' });

  const [form, setForm] = useState(FORM_VACIO);
  const [preguntas, setPreguntas] = useState([{ clave: 0, enunciado: '' }]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const cambiarPregunta = (clave, enunciado) =>
    setPreguntas(preguntas.map((p) => (p.clave === clave ? { ...p, enunciado } : p)));

  const quitarPregunta = (clave) => setPreguntas(preguntas.filter((p) => p.clave !== clave));

  function validar() {
    if (!form.titulo.trim()) return 'Escribe el título de la evaluación.';
    const peso = Number(form.peso);
    if (!form.peso || Number.isNaN(peso) || peso < 0.01 || peso > 100) return 'El peso debe estar entre 0.01 y 100.';
    if (!form.fechaApertura || !form.fechaCierre) return 'Indica la fecha de apertura y la de cierre.';
    if (form.fechaCierre <= form.fechaApertura) return 'La fecha de cierre debe ser posterior a la de apertura.';
    if (preguntas.length === 0) return 'Agrega al menos una pregunta.';
    if (preguntas.some((p) => !p.enunciado.trim())) return 'Ninguna pregunta puede quedar vacía.';
    return '';
  }

  async function guardar(e) {
    e.preventDefault();
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    setError('');
    setGuardando(true);
    try {
      const creada = await evaluacionesApi.crear({
        cursoId,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        tipo: form.tipo,
        peso: Number(form.peso),
        fechaApertura: form.fechaApertura,
        fechaCierre: form.fechaCierre,
        preguntas: preguntas.map((p, i) => ({ enunciado: p.enunciado.trim(), orden: i + 1 })),
      });
      onCreada(creada);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="tarjeta formulario eval-formulario" onSubmit={guardar} noValidate>
      <h2 className="subtitulo">Nueva evaluación</h2>

      <label className="campo">
        Título
        <input value={form.titulo} onChange={cambiar('titulo')} maxLength={160} placeholder="Ej. Examen parcial 1" />
      </label>

      <label className="campo">
        Descripción (opcional)
        <textarea value={form.descripcion} onChange={cambiar('descripcion')} maxLength={2000} rows={3}
          placeholder="Instrucciones para el estudiante" />
      </label>

      <div className="eval-fila">
        <label className="campo">
          Tipo
          <select value={form.tipo} onChange={cambiar('tipo')}>
            {Object.entries(TIPOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          Peso en la nota final (%)
          <input type="number" min="0.01" max="100" step="0.01" value={form.peso} onChange={cambiar('peso')} />
        </label>
        <label className="campo">
          Nota máxima
          <input value="10" disabled readOnly />
        </label>
      </div>

      <div className="eval-fila">
        <label className="campo">
          Apertura
          <input type="datetime-local" value={form.fechaApertura} onChange={cambiar('fechaApertura')} />
        </label>
        <label className="campo">
          Cierre
          <input type="datetime-local" value={form.fechaCierre} onChange={cambiar('fechaCierre')} />
        </label>
      </div>

      <fieldset className="eval-preguntas">
        <legend>Preguntas abiertas</legend>
        {preguntas.length === 0 && <p className="texto-suave">No hay preguntas. Agrega al menos una.</p>}
        {preguntas.map((p, i) => (
          <div key={p.clave} className="eval-pregunta-editable">
            <label className="campo">
              Pregunta {i + 1}
              <textarea value={p.enunciado} onChange={(e) => cambiarPregunta(p.clave, e.target.value)}
                maxLength={1200} rows={2} />
            </label>
            <button type="button" className="boton boton-secundario" onClick={() => quitarPregunta(p.clave)}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className="boton boton-secundario"
          onClick={() => setPreguntas([...preguntas, nuevaPregunta()])}>
          + Agregar pregunta
        </button>
      </fieldset>

      {error && <p className="alerta alerta-error" role="alert">{error}</p>}

      <div className="eval-acciones">
        <button type="submit" className="boton" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar como borrador'}
        </button>
        <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function EvaluacionesDocente({ curso, rol }) {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [creando, setCreando] = useState(false);
  const [publicandoId, setPublicandoId] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setEvaluaciones(await evaluacionesApi.listarPorCurso(curso.id));
    } catch (err) {
      setError(err.codigo === 'PROHIBIDO' ? 'No eres el docente responsable de este curso.' : err.message);
    } finally {
      setCargando(false);
    }
  }, [curso.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function publicar(evaluacion) {
    if (!window.confirm(`¿Publicar "${evaluacion.titulo}"? Los estudiantes la verán y ya no podrás editarla.`)) return;
    setPublicandoId(evaluacion.id);
    setError('');
    setAviso('');
    try {
      const publicada = await evaluacionesApi.publicar(evaluacion.id);
      setEvaluaciones((lista) => lista.map((e) => (e.id === publicada.id ? publicada : e)));
      setAviso(`"${publicada.titulo}" está publicada.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setPublicandoId(null);
    }
  }

  if (seleccionada) {
    return (
      <PanelEntregas
        evaluacion={seleccionada}
        cursoId={curso.id}
        rol={rol}
        onVolver={() => setSeleccionada(null)}
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

      {creando ? (
        <FormularioEvaluacion
          cursoId={curso.id}
          onCancelar={() => setCreando(false)}
          onCreada={(nueva) => {
            setEvaluaciones((lista) => [...lista, nueva]);
            setCreando(false);
            setAviso(`"${nueva.titulo}" se guardó como borrador. Publícala para que los estudiantes la vean.`);
          }}
        />
      ) : (
        <div className="eval-acciones">
          <button type="button" className="boton" onClick={() => { setAviso(''); setCreando(true); }}>
            + Nueva evaluación
          </button>
          <button type="button" className="boton boton-secundario" onClick={cargar} disabled={cargando}>
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      )}

      {cargando && <p className="texto-suave">Cargando evaluaciones...</p>}

      {!cargando && !error && evaluaciones.length === 0 && (
        <div className="tarjeta vacio">
          <h2 className="subtitulo">Este curso todavía no tiene evaluaciones</h2>
          <p className="texto-suave">Crea una con el botón "Nueva evaluación".</p>
        </div>
      )}

      {evaluaciones.length > 0 && (
        <div className="eval-lista">
          {evaluaciones.map((ev) => {
            const estado = ESTADOS[ev.estado] ?? { texto: ev.estado, clase: '' };
            return (
              <article key={ev.id} className="tarjeta eval-tarjeta">
                <div className="eval-cabecera">
                  <div>
                    <p className="eval-titulo">{ev.titulo}</p>
                    <span className="texto-suave">
                      {TIPOS[ev.tipo] ?? ev.tipo} · Peso {ev.peso}% · Nota máx. {ev.notaMaxima}
                    </span>
                  </div>
                  <span className={`insignia ${estado.clase}`}>{estado.texto}</span>
                </div>
                {ev.descripcion && <p className="eval-descripcion">{ev.descripcion}</p>}
                <p className="texto-suave eval-periodo">
                  Del {formatearFecha(ev.fechaApertura)} al {formatearFecha(ev.fechaCierre)} ·{' '}
                  {ev.preguntas.length} pregunta(s)
                </p>
                <div className="eval-acciones">
                  {ev.estado === 'BORRADOR' && (
                    <button type="button" className="boton" disabled={publicandoId === ev.id} onClick={() => publicar(ev)}>
                      {publicandoId === ev.id ? 'Publicando...' : 'Publicar'}
                    </button>
                  )}
                  {ev.estado !== 'BORRADOR' && (
                    <button type="button" className="boton" onClick={() => setSeleccionada(ev)}>
                      Ver entregas y calificar
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
