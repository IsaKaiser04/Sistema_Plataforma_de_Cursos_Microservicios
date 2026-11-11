import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { VERIFICAR_CERTIFICADO } from '../../api/notificaciones';
import { mensajeDeError } from '../../utils/errores';
import { fechaLarga } from '../../utils/formatoNotificaciones';
import '../../styles/notificaciones.css';

// Página pública (sin sesión): /verificar y /certificados/:codigo.
// Es el enlace que llega en la notificación CERTIFICADO.
export default function VerificarCertificado() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [texto, setTexto] = useState(codigo ?? '');

  const { data, loading, error } = useQuery(VERIFICAR_CERTIFICADO, {
    variables: { codigo: codigo ?? '' },
    skip: !codigo,
    fetchPolicy: 'network-only',
  });

  function buscar(e) {
    e.preventDefault();
    const limpio = texto.trim().toUpperCase();
    if (limpio) navigate(`/certificados/${encodeURIComponent(limpio)}`);
  }

  const cert = data?.verificarCertificado;

  return (
    <div className="pagina-centro">
      <div className="cert-verificacion">
        <div>
          <h1 className="titulo">Verificar certificado</h1>
          <p className="texto-suave">Plataforma de Cursos · Escribe el código que aparece en el certificado.</p>
        </div>

        <form className="cert-buscador" onSubmit={buscar}>
          <label className="campo">
            <span className="texto-suave" style={{ fontSize: '0.85rem' }}>Código de verificación</span>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="LMS-SD202601-0001"
              autoFocus={!codigo}
            />
          </label>
          <button type="submit" className="boton" style={{ alignSelf: 'flex-end' }}>Verificar</button>
        </form>

        {loading && <p className="texto-suave">Verificando...</p>}
        {error && <p className="alerta alerta-error">{mensajeDeError(error)}</p>}

        {codigo && data && !cert && (
          <p className="alerta alerta-error" role="alert">
            No existe un certificado con el código <b>{codigo}</b>. Revisa que esté bien escrito.
          </p>
        )}

        {cert && (
          <article className="tarjeta cert-diploma">
            <span className="cert-sello">✓ Certificado válido</span>
            <p className="texto-suave" style={{ marginTop: 20 }}>Se certifica que el estudiante aprobó el curso</p>
            <p className="cert-nombre-curso">{cert.tituloCurso}</p>
            <dl className="datos" style={{ maxWidth: 360, margin: '0 auto', textAlign: 'left' }}>
              <dt>Código del curso</dt>
              <dd>{cert.codigoCurso}</dd>
              <dt>Nota final</dt>
              <dd><b>{cert.notaFinal.toFixed(1)}</b> / 10</dd>
              <dt>Emitido el</dt>
              <dd>{fechaLarga(cert.fechaEmision)}</dd>
              <dt>Verificación</dt>
              <dd><code className="cert-codigo">{cert.codigoVerificacion}</code></dd>
            </dl>
          </article>
        )}

        <p className="texto-suave" style={{ textAlign: 'center' }}>
          <Link to="/">Ir a la plataforma</Link>
        </p>
      </div>
    </div>
  );
}
