import { gql } from '@apollo/client';

// Operaciones del módulo notificaciones y certificados (María) -> ms-certificados.

const CAMPOS_NOTIFICACION = gql`
  fragment CamposNotificacion on Notificacion {
    id
    cursoId
    tipo
    mensaje
    estado
    fecha
  }
`;

const CAMPOS_CERTIFICADO = gql`
  fragment CamposCertificado on Certificado {
    id
    codigoVerificacion
    estudianteId
    cursoId
    codigoCurso
    tituloCurso
    notaFinal
    fechaEmision
    url
  }
`;

export const MIS_NOTIFICACIONES = gql`
  query MisNotificaciones($estado: EstadoNotificacion) {
    misNotificaciones(estado: $estado) {
      ...CamposNotificacion
    }
  }
  ${CAMPOS_NOTIFICACION}
`;

export const TOTAL_NO_LEIDAS = gql`
  query TotalNoLeidas {
    totalNoLeidas
  }
`;

export const MARCAR_LEIDA = gql`
  mutation MarcarNotificacionLeida($id: ID!) {
    marcarNotificacionLeida(id: $id) {
      ...CamposNotificacion
    }
  }
  ${CAMPOS_NOTIFICACION}
`;

export const MARCAR_TODAS = gql`
  mutation MarcarTodasLeidas {
    marcarTodasLeidas
  }
`;

export const MIS_CERTIFICADOS = gql`
  query MisCertificados {
    misCertificados {
      ...CamposCertificado
    }
  }
  ${CAMPOS_CERTIFICADO}
`;

export const VERIFICAR_CERTIFICADO = gql`
  query VerificarCertificado($codigo: String!) {
    verificarCertificado(codigo: $codigo) {
      ...CamposCertificado
    }
  }
  ${CAMPOS_CERTIFICADO}
`;

export const CERTIFICADO_PDF = gql`
  query CertificadoPdf($id: ID!) {
    certificadoPdf(id: $id) {
      nombreArchivo
      contenidoBase64
    }
  }
`;

// Consultas que cambian al marcar notificaciones (para refetchQueries)
export const CONSULTAS_NOTIFICACIONES = ['MisNotificaciones', 'TotalNoLeidas'];
