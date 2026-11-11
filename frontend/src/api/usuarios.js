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
