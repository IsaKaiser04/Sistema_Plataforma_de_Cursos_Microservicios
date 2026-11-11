package ec.edu.unl.lms.cursos.application.service;

import ec.edu.unl.lms.cursos.application.dto.*;
import ec.edu.unl.lms.cursos.domain.model.EstadoCurso;

import java.util.List;
import java.util.UUID;

public interface CursoService {
    CursoResponse crearCurso(CursoRequest request);
    CursoResponse obtenerPorId(UUID id);
    CursoResponse obtenerPorCodigo(String codigo);
    List<CursoResponse> listarTodos(String categoria, EstadoCurso estado);
    List<CursoResponse> listarCursosActivosParaCatalogo();
    List<CursoResponse> listarPorDocente(UUID docenteId);
    CursoResponse actualizarCurso(UUID id, CursoRequest request);
    CursoResponse cambiarEstado(UUID id, EstadoCurso nuevoEstado);
    ModuloResponse agregarModulo(UUID cursoId, ModuloRequest request);
    ModuloResponse actualizarModulo(UUID cursoId, UUID moduloId, ModuloRequest request);
    void eliminarModulo(UUID cursoId, UUID moduloId);
    ValidacionCursoResponse validarDisponibilidadCurso(UUID cursoId);
    void procesarReservaCupoPorInscripcion(UUID cursoId, UUID inscripcionId, UUID estudianteId);
    void procesarCancelacionInscripcion(UUID cursoId, UUID inscripcionId, UUID estudianteId);
    void eliminarCurso(UUID id);
}
