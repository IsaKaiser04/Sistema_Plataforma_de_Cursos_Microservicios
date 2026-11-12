import { gql } from '@apollo/client';
import { client } from '../apollo';
import { leerSesion } from '../context/sesionGuardada';
import { INSCRIBIRSE, CANCELAR_INSCRIPCION } from './usuarios';
import { mensajeDeError } from '../utils/errores';

// Mismas funciones que usaban las pantallas de cursos, pero ahora todo pasa por el
// api-gateway (GraphQL) con el token de la sesión: el gateway pone X-User-Id y X-User-Rol
// del usuario real, ya no hay ids inventados (frontend.md, regla 1).

const CAMPOS_CURSO = gql`
  fragment CamposCurso on Curso {
    id
    codigo
    titulo
    descripcion
    categoria
    nivel
    estado
    docenteId
    cupoMaximo
    cuposDisponibles
    duracionHoras
    precio
    modulos {
      id
      titulo
      descripcion
      orden
      duracionMinutos
      recursoUrl
    }
  }
`;

const CAMPOS_MODULO = gql`
  fragment CamposModulo on Modulo {
    id
    titulo
    descripcion
    orden
    duracionMinutos
    recursoUrl
  }
`;

export const CATALOGO_CURSOS = gql`
  query CatalogoCursos {
    catalogoCursos {
      ...CamposCurso
    }
  }
  ${CAMPOS_CURSO}
`;

export const CURSOS = gql`
  query Cursos($categoria: String, $estado: EstadoCurso) {
    cursos(categoria: $categoria, estado: $estado) {
      ...CamposCurso
    }
  }
  ${CAMPOS_CURSO}
`;

export const CURSO = gql`
  query Curso($id: ID!) {
    curso(id: $id) {
      ...CamposCurso
      docente {
        id
        nombreCompleto
      }
    }
  }
  ${CAMPOS_CURSO}
`;

const CREAR_CURSO = gql`
  mutation CrearCurso($input: CursoInput!) {
    crearCurso(input: $input) {
      ...CamposCurso
    }
  }
  ${CAMPOS_CURSO}
`;

const ACTUALIZAR_CURSO = gql`
  mutation ActualizarCurso($id: ID!, $input: CursoInput!) {
    actualizarCurso(id: $id, input: $input) {
      ...CamposCurso
    }
  }
  ${CAMPOS_CURSO}
`;

const CAMBIAR_ESTADO_CURSO = gql`
  mutation CambiarEstadoCurso($id: ID!, $estado: EstadoCurso!) {
    cambiarEstadoCurso(id: $id, estado: $estado) {
      ...CamposCurso
    }
  }
  ${CAMPOS_CURSO}
`;

const AGREGAR_MODULO = gql`
  mutation AgregarModulo($cursoId: ID!, $input: ModuloInput!) {
    agregarModulo(cursoId: $cursoId, input: $input) {
      ...CamposModulo
    }
  }
  ${CAMPOS_MODULO}
`;

const ACTUALIZAR_MODULO = gql`
  mutation ActualizarModulo($cursoId: ID!, $moduloId: ID!, $input: ModuloInput!) {
    actualizarModulo(cursoId: $cursoId, moduloId: $moduloId, input: $input) {
      ...CamposModulo
    }
  }
  ${CAMPOS_MODULO}
`;

const ELIMINAR_MODULO = gql`
  mutation EliminarModulo($cursoId: ID!, $moduloId: ID!) {
    eliminarModulo(cursoId: $cursoId, moduloId: $moduloId)
  }
`;

const ELIMINAR_CURSO = gql`
  mutation EliminarCurso($id: ID!) {
    eliminarCurso(id: $id)
  }
`;

// Las pantallas muestran err.message, por eso se convierte el error de Apollo en un Error con texto.
async function consultar(query, variables) {
  try {
    const { data } = await client.query({ query, variables, fetchPolicy: 'network-only' });
    return data;
  } catch (error) {
    throw new Error(mensajeDeError(error));
  }
}

async function mutar(mutation, variables) {
  try {
    const { data } = await client.mutate({ mutation, variables });
    return data;
  } catch (error) {
    throw new Error(mensajeDeError(error));
  }
}

// Solo los campos que acepta CursoInput (las pantallas mandan el objeto del formulario).
function aCursoInput(payload) {
  const input = {
    codigo: payload.codigo,
    titulo: payload.titulo,
    descripcion: payload.descripcion,
    categoria: payload.categoria,
    nivel: payload.nivel,
    docenteId: payload.docenteId,
    cupoMaximo: Number(payload.cupoMaximo),
    duracionHoras: Number(payload.duracionHoras),
    precio: Number(payload.precio),
    modulos: (payload.modulos || []).map(aModuloInput),
  };
  // Un docente siempre crea cursos a su nombre; el administrador elige el docente.
  const usuario = leerSesion()?.usuario;
  if (usuario?.rol === 'DOCENTE') input.docenteId = usuario.id;
  return input;
}

function aModuloInput(modulo) {
  return {
    titulo: modulo.titulo,
    descripcion: modulo.descripcion || null,
    orden: Number(modulo.orden),
    duracionMinutos: Number(modulo.duracionMinutos),
    recursoUrl: modulo.recursoUrl || null,
  };
}

export const cursosApi = {
  listarCatalogoActivo: async () => (await consultar(CATALOGO_CURSOS)).catalogoCursos,
  listarTodos: async () => (await consultar(CURSOS)).cursos,
  obtenerPorId: async (id) => {
    const { curso } = await consultar(CURSO, { id });
    if (!curso) throw new Error('El curso no existe');
    return curso;
  },
  crearCurso: async (payload) => (await mutar(CREAR_CURSO, { input: aCursoInput(payload) })).crearCurso,
  actualizarCurso: async (id, payload) =>
    (await mutar(ACTUALIZAR_CURSO, { id, input: aCursoInput(payload) })).actualizarCurso,
  cambiarEstado: async (id, estado) => (await mutar(CAMBIAR_ESTADO_CURSO, { id, estado })).cambiarEstadoCurso,
  agregarModulo: async (cursoId, modulo) =>
    (await mutar(AGREGAR_MODULO, { cursoId, input: aModuloInput(modulo) })).agregarModulo,
  actualizarModulo: async (cursoId, moduloId, modulo) =>
    (await mutar(ACTUALIZAR_MODULO, { cursoId, moduloId, input: aModuloInput(modulo) })).actualizarModulo,
  eliminarModulo: async (cursoId, moduloId) => (await mutar(ELIMINAR_MODULO, { cursoId, moduloId })).eliminarModulo,
  eliminarCurso: async (id) => (await mutar(ELIMINAR_CURSO, { id })).eliminarCurso,

  // Inscripción real en ms-usuarios: valida el curso con ms-cursos, queda PENDIENTE y
  // pasa a ACTIVA cuando ms-cursos responde por RabbitMQ (ver Mis cursos).
  inscribirEstudiante: async (cursoId) => {
    const { inscribirse } = await mutar(INSCRIBIRSE, { cursoId });
    return { inscripcion: inscribirse, evento: { inscripcionId: inscribirse.id } };
  },
  cancelarInscripcion: async (cursoId, inscripcionId) =>
    (await mutar(CANCELAR_INSCRIPCION, { id: inscripcionId })).cancelarInscripcion,
};
