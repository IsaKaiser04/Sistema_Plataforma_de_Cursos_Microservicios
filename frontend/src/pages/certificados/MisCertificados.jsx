import { useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { CERTIFICADO_PDF, MIS_CERTIFICADOS } from '../../api/notificaciones';
import { mensajeDeError } from '../../utils/errores';
import { fechaLarga } from '../../utils/formatoNotificaciones';
import '../../styles/notificaciones.css';

// Convierte el base64 que manda el gateway en un archivo y lo descarga
function descargarBase64(base64, nombreArchivo) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function MisCertificados() {
  const client = useApolloClient();
  const { data, loading, error } = useQuery(MIS_CERTIFICADOS, { fetchPolicy: 'cache-and-network' });
  const [descargando, setDescargando] = useState(null);
  const [errorPdf, setErrorPdf] = useState('');
  const lista = data?.misCertificados ?? [];

  async function descargarPdf(cert) {
    setErrorPdf('');
    setDescargando(cert.id);
    try {
      const { data: r } = await client.query({
        query: CERTIFICADO_PDF,
        variables: { id: cert.id },
        fetchPolicy: 'no-cache',
      });
      descargarBase64(r.certificadoPdf.contenidoBase64, r.certificadoPdf.nombreArchivo);
    } catch (err) {
      setErrorPdf(mensajeDeError(err));
    } finally {
      setDescargando(null);
    }
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible en la tarjeta.
    }
  }

  return (
    <section>
      <div className="notif-encabezado">
        <div>
          <h1 className="titulo">Mis certificados</h1>
          <p className="texto-suave">Se emiten cuando apruebas un curso. Cualquiera puede verificarlos con su código.</p>
        </div>
        <Link to="/verificar" className="boton boton-secundario">Verificar un código</Link>
      </div>

      {errorPdf && <p className="alerta alerta-error" role="alert" style={{ marginBottom: 12 }}>{errorPdf}</p>}
      {loading && !data && <p className="texto-suave">Cargando certificados...</p>}
      {error && !data && <p className="alerta alerta-error">{mensajeDeError(error)}</p>}

      {data && lista.length === 0 && (
        <div className="tarjeta notif-vacio">
          <p className="texto-suave">Aún no tienes certificados. Aparecerán aquí cuando apruebes un curso.</p>
        </div>
      )}

      {lista.length > 0 && (
        <div className="cert-grilla">
          {lista.map((c) => (
            <article key={c.id} className="tarjeta cert-tarjeta">
              <div>
                <span className="chip">{c.codigoCurso}</span>
                <h2 className="cert-curso" style={{ marginTop: 8 }}>{c.tituloCurso}</h2>
              </div>
              <div>
                <div className="cert-nota">{c.notaFinal.toFixed(1)}</div>
                <small className="texto-suave">Nota final · {fechaLarga(c.fechaEmision)}</small>
              </div>
              <code className="cert-codigo">{c.codigoVerificacion}</code>
              <div className="cert-acciones">
                <button
                  type="button"
                  className="boton"
                  disabled={descargando === c.id}
                  onClick={() => descargarPdf(c)}
                >
                  {descargando === c.id ? 'Generando PDF...' : 'Descargar PDF'}
                </button>
                <Link to={`/certificados/${c.codigoVerificacion}`} className="boton boton-secundario">
                  Ver en línea
                </Link>
                <button type="button" className="boton boton-secundario" onClick={() => copiar(c.url)}>
                  Copiar enlace
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
