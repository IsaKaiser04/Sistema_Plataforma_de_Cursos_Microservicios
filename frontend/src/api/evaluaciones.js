import { gql } from '@apollo/client';
import { client } from '../apollo';
import { USUARIOS } from './usuarios';
import { mensajeDeError, codigoDeError } from '../utils/errores';

// Operaciones del módulo evaluaciones (contratos/graphql/schema.graphql).
// Todo pasa por el api-gateway con el token de la sesión: el gateway pone
// X-User-Id y X-User-Rol, el navegador nunca llama directo a ms-evaluaciones.

const CAMPOS_EVALUACION = gql`
  fragment CamposEvaluacion on Evaluacion {
    id
    cursoId
    titulo
    descripcion
    tipo
    estado
    peso
    notaMaxima
    fechaApertura
    fechaCierre
    fechaCreacion
    preguntas {
      id
      enunciado
      orden
    }
  }
`;

const CAMPOS_ENTREGA = gql`
  fragment CamposEntrega on Entrega {
    id
    evaluacionId
    estudianteId
    fechaEntrega
    respuestas {
      preguntaId
      enunciado
      respuesta
    }
  }
`;

const CAMPOS_CALIFICACION = gql`
  fragment CamposCalificacion on Calificacion {
    id
    evaluacionId
    estudianteId
    cursoId
    tituloEvaluacion
    nota
    notaMinima
    aprobado
    retroalimentacion
    fechaCalificacion
  }
`;

const EVALUACIONES_CURSO = gql`
  query EvaluacionesCurso($cursoId: ID!) {
    evaluacionesCurso(cursoId: $cursoId) {
      ...CamposEvaluacion
    }
  }
  ${CAMPOS_EVALUACION}
`;

const ENTREGAS_EVALUACION = gql`
  query EntregasEvaluacion($evaluacionId: ID!) {
    entregasEvaluacion(evaluacionId: $evaluacionId) {
      ...CamposEntrega
    }
  }
  ${CAMPOS_ENTREGA}
`;

const CALIFICACIONES_EVALUACION = gql`
  query CalificacionesEvaluacion($evaluacionId: ID!) {
    calificacionesEvaluacion(evaluacionId: $evaluacionId) {
      ...CamposCalificacion
    }
  }
  ${CAMPOS_CALIFICACION}
`;

const MIS_CALIFICACIONES = gql`
  query MisCalificaciones($cursoId: ID) {
    misCalificaciones(cursoId: $cursoId) {
      ...CamposCalificacion
    }
  }
  ${CAMPOS_CALIFICACION}
`;

const INSCRITOS_CURSO = gql`
  query InscritosCursoEvaluaciones($cursoId: ID!) {
    inscritosCurso(cursoId: $cursoId) {
      id
      estudianteId
      estado
    }
  }
`;

const CREAR_EVALUACION = gql`
  mutation CrearEvaluacion($input: EvaluacionInput!) {
    crearEvaluacion(input: $input) {
      ...CamposEvaluacion
    }
  }
  ${CAMPOS_EVALUACION}
`;

const PUBLICAR_EVALUACION = gql`
  mutation PublicarEvaluacion($id: ID!) {
    publicarEvaluacion(id: $id) {
      ...CamposEvaluacion
    }
  }
  ${CAMPOS_EVALUACION}
`;

const ENTREGAR_EVALUACION = gql`
  mutation EntregarEvaluacion($evaluacionId: ID!, $respuestas: [RespuestaInput!]!) {
    entregarEvaluacion(evaluacionId: $evaluacionId, respuestas: $respuestas) {
      ...CamposEntrega
    }
  }
  ${CAMPOS_ENTREGA}
`;

const CALIFICAR_ENTREGA = gql`
  mutation CalificarEntrega($evaluacionId: ID!, $input: CalificacionInput!) {
    calificarEntrega(evaluacionId: $evaluacionId, input: $input) {
      ...CamposCalificacion
    }
  }
  ${CAMPOS_CALIFICACION}
`;

// Textos más claros para los códigos que manda ms-evaluaciones (a través del gateway).
const MENSAJES = {
  ENTREGA_YA_REALIZADA: 'Ya enviaste esta evaluación. Solo se permite una entrega y no se puede editar.',
  FUERA_DE_PLAZO: 'La evaluación está fuera de su periodo de entrega.',
  EVALUACION_CERRADA: 'La evaluación ya no está abierta.',
  RESPUESTAS_PENDIENTES: 'El estudiante todavía no ha enviado sus respuestas, así que no se puede calificar.',
  ESTUDIANTE_NO_HABILITADO: 'El estudiante no está habilitado en este curso.',
  PESO_EXCEDIDO: 'La suma de los pesos de las evaluaciones del curso no puede pasar de 100%.',
  SERVICIO_NO_DISPONIBLE: 'El servicio de evaluaciones no responde. Intenta de nuevo en unos segundos.',
};

// Error con el código del gateway, para que las pantallas decidan qué mostrar.
export class ErrorEvaluacion extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.codigo = codigo;
  }
}

// Apollo 3 trata un 400 del gateway como error de red, pero el cuerpo trae el error real
// (por ejemplo, "Cannot query field" cuando el gateway corre con un esquema viejo).
function errorDelServidor(error) {
  const resultado = error?.networkError?.result;
  const primero = resultado && typeof resultado === 'object' ? resultado.errors?.[0] : null;
  if (!primero) return null;
  const codigo = primero.extensions?.code ?? null;
  if (/Cannot query field|Unknown type|Unknown argument/.test(primero.message)) {
    return new ErrorEvaluacion(
      `El api-gateway no tiene cargado el módulo de evaluaciones (${primero.message}). Reinícialo con npm start.`,
      codigo || 'ESQUEMA_DESACTUALIZADO'
    );
  }
  return new ErrorEvaluacion(MENSAJES[codigo] || primero.message, codigo);
}

function envolver(error) {
  const delServidor = errorDelServidor(error);
  if (delServidor) return delServidor;
  const codigo = codigoDeError(error);
  return new ErrorEvaluacion(MENSAJES[codigo] || mensajeDeError(error), codigo);
}

async function consultar(query, variables) {
  try {
    const { data } = await client.query({ query, variables, fetchPolicy: 'network-only' });
    return data;
  } catch (error) {
    throw envolver(error);
  }
}

async function mutar(mutation, variables) {
  try {
    const { data } = await client.mutate({ mutation, variables });
    return data;
  } catch (error) {
    throw envolver(error);
  }
}

export const evaluacionesApi = {
  listarPorCurso: async (cursoId) => (await consultar(EVALUACIONES_CURSO, { cursoId })).evaluacionesCurso,
  entregas: async (evaluacionId) => (await consultar(ENTREGAS_EVALUACION, { evaluacionId })).entregasEvaluacion,
  calificaciones: async (evaluacionId) =>
    (await consultar(CALIFICACIONES_EVALUACION, { evaluacionId })).calificacionesEvaluacion,
  misCalificaciones: async (cursoId) => (await consultar(MIS_CALIFICACIONES, { cursoId })).misCalificaciones,

  crear: async (input) => (await mutar(CREAR_EVALUACION, { input })).crearEvaluacion,
  publicar: async (id) => (await mutar(PUBLICAR_EVALUACION, { id })).publicarEvaluacion,
  entregar: async (evaluacionId, respuestas) =>
    (await mutar(ENTREGAR_EVALUACION, { evaluacionId, respuestas })).entregarEvaluacion,
  calificar: async (evaluacionId, input) => (await mutar(CALIFICAR_ENTREGA, { evaluacionId, input })).calificarEntrega,

  // Estudiantes con inscripción ACTIVA (para las evaluaciones antiguas sin preguntas).
  inscritosActivos: async (cursoId) =>
    (await consultar(INSCRITOS_CURSO, { cursoId })).inscritosCurso.filter((i) => i.estado === 'ACTIVA'),

  // Nombres de los estudiantes. Solo el ADMINISTRADOR puede listar usuarios en ms-usuarios;
  // para el docente se devuelve un mapa vacío y la pantalla muestra el identificador.
  nombresEstudiantes: async () => {
    const { usuarios } = await consultar(USUARIOS, { rol: 'ESTUDIANTE' });
    return Object.fromEntries(usuarios.map((u) => [u.id, `${u.nombres} ${u.apellidos}`.trim()]));
  },
};
