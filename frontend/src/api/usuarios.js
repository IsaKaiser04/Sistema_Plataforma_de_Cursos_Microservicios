import { gql } from '@apollo/client';

// Operaciones del módulo usuarios (contratos/graphql/schema.graphql).

const CAMPOS_USUARIO = gql`
  fragment CamposUsuario on Usuario {
    id
    email
    nombres
    apellidos
    rol
    activo
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      usuario {
        ...CamposUsuario
      }
    }
  }
  ${CAMPOS_USUARIO}
`;

export const REGISTRO = gql`
  mutation Registro($input: RegistroInput!) {
    registro(input: $input) {
      ...CamposUsuario
    }
  }
  ${CAMPOS_USUARIO}
`;

export const ME = gql`
  query Me {
    me {
      ...CamposUsuario
    }
  }
  ${CAMPOS_USUARIO}
`;

// ---------- Inscripciones ----------

const CAMPOS_INSCRIPCION = gql`
  fragment CamposInscripcion on Inscripcion {
    id
    cursoId
    estudianteId
    estado
    motivoRechazo
    fechaInscripcion
  }
`;

// Trae también el curso (lo resuelve el módulo cursos). Si ms-cursos no responde,
// curso llega en null y las inscripciones igual se muestran (usar errorPolicy: 'all').
export const MIS_INSCRIPCIONES = gql`
  query MisInscripciones {
    misInscripciones {
      ...CamposInscripcion
      curso {
        id
        codigo
        titulo
      }
    }
  }
  ${CAMPOS_INSCRIPCION}
`;

export const INSCRIBIRSE = gql`
  mutation Inscribirse($cursoId: ID!) {
    inscribirse(cursoId: $cursoId) {
      ...CamposInscripcion
    }
  }
  ${CAMPOS_INSCRIPCION}
`;

export const CANCELAR_INSCRIPCION = gql`
  mutation CancelarInscripcion($id: ID!) {
    cancelarInscripcion(id: $id) {
      ...CamposInscripcion
    }
  }
  ${CAMPOS_INSCRIPCION}
`;

// ---------- Administración (solo ADMINISTRADOR) ----------

export const USUARIOS = gql`
  query Usuarios($rol: Rol) {
    usuarios(rol: $rol) {
      ...CamposUsuario
    }
  }
  ${CAMPOS_USUARIO}
`;

export const CREAR_USUARIO = gql`
  mutation CrearUsuario($input: CrearUsuarioInput!) {
    crearUsuario(input: $input) {
      ...CamposUsuario
    }
  }
  ${CAMPOS_USUARIO}
`;

// Devuelve el usuario con su id, así Apollo actualiza la fila de la tabla solo.
export const CAMBIAR_ESTADO_USUARIO = gql`
  mutation CambiarEstadoUsuario($id: ID!, $activo: Boolean!) {
    cambiarEstadoUsuario(id: $id, activo: $activo) {
      ...CamposUsuario
    }
  }
  ${CAMPOS_USUARIO}
`;
