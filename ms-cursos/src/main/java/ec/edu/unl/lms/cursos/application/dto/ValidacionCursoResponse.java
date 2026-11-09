package ec.edu.unl.lms.cursos.application.dto;

import ec.edu.unl.lms.cursos.domain.model.EstadoCurso;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO ligero para el Patron API Gateway / Cache BFF y validacion desde ms-inscripciones.
 */
public record ValidacionCursoResponse(
        UUID cursoId,
        String codigo,
        String titulo,
        EstadoCurso estado,
        boolean existe,
        boolean inscribible,
        Integer cuposDisponibles,
        BigDecimal precio
) {}
