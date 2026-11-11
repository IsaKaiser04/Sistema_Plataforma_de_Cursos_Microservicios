import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import {
  CONSULTAS_NOTIFICACIONES,
  MARCAR_LEIDA,
  MARCAR_TODAS,
  MIS_NOTIFICACIONES,
} from '../../api/notificaciones';
import { mensajeDeError } from '../../utils/errores';
import { fechaCorta, separarCodigo, TIPOS_NOTIFICACION } from '../../utils/formatoNotificaciones';
import '../../styles/notificaciones.css';

const FILTROS = [
  { valor: null, texto: 'Todas' },
  { valor: 'ENVIADA', texto: 'No leídas' },
  { valor: 'LEIDA', texto: 'Leídas' },
];

export default function MisNotificaciones() {
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState('');
  const { data, loading, error: errorCarga } = useQuery(MIS_NOTIFICACIONES, {
    variables: { estado },
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000,
  });

  const opciones = { refetchQueries: CONSULTAS_NOTIFICACIONES, awaitRefetchQueries: true };
  const [marcarLeida] = useMutation(MARCAR_LEIDA, opciones);
  const [marcarTodas, { loading: marcandoTodas }] = useMutation(MARCAR_TODAS, opciones);

  const lista = data?.misNotificaciones ?? [];
  const hayNoLeidas = lista.some((n) => n.estado === 'ENVIADA');

  async function ejecutar(accion) {
    setError('');
    try {
      await accion();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

  return (
    <section>
      <div className="notif-encabezado">
        <div>
          <h1 className="titulo">Notificaciones</h1>
          <p className="texto-suave">Avisos de tus cursos, evaluaciones y certificados.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="notif-filtros" role="group" aria-label="Filtrar notificaciones">
            {FILTROS.map((f) => (
              <button
                key={f.texto}
                type="button"
                className="notif-filtro"
                aria-pressed={estado === f.valor}
                onClick={() => setEstado(f.valor)}
              >
                {f.texto}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="boton boton-secundario"
            disabled={!hayNoLeidas || marcandoTodas}
            onClick={() => ejecutar(() => marcarTodas())}
          >
            {marcandoTodas ? 'Marcando...' : 'Marcar todas como leídas'}
          </button>
        </div>
      </div>

      {error && <p className="alerta alerta-error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}

      {loading && !data && <p className="texto-suave">Cargando notificaciones...</p>}
      {errorCarga && !data && <p className="alerta alerta-error">{mensajeDeError(errorCarga)}</p>}

      {data && lista.length === 0 && (
        <div className="tarjeta notif-vacio">
          <p className="texto-suave">
            {estado === 'ENVIADA' ? 'No tienes notificaciones sin leer.' : 'Todavía no tienes notificaciones.'}
          </p>
        </div>
      )}

      {lista.length > 0 && (
        <ul className="notif-lista">
          {lista.map((n) => {
            const tipo = TIPOS_NOTIFICACION[n.tipo] ?? { texto: n.tipo, icono: '🔔' };
            const { texto, codigo } = separarCodigo(n.mensaje);
            const noLeida = n.estado === 'ENVIADA';
            return (
              <li key={n.id} className={`notif-item${noLeida ? ' notif-no-leida' : ''}`}>
                <span className="notif-icono" aria-hidden="true">{tipo.icono}</span>
                <div className="notif-cuerpo">
                  <div className="notif-meta">
                    <span className="chip">{tipo.texto}</span>
                    <time dateTime={n.fecha}>{fechaCorta(n.fecha)}</time>
                    {noLeida && <span className="texto-suave">· Sin leer</span>}
                  </div>
                  <p className="notif-mensaje">{texto}</p>
                  {codigo && (
                    <Link to={`/certificados/${codigo}`} style={{ fontSize: '0.9rem' }}>
                      Ver certificado {codigo}
                    </Link>
                  )}
                </div>
                <div className="notif-acciones">
                  {noLeida && (
                    <button
                      type="button"
                      className="boton boton-secundario"
                      onClick={() => ejecutar(() => marcarLeida({ variables: { id: n.id } }))}
                    >
                      Marcar leída
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
