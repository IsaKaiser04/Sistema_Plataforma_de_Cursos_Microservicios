package com.lms.evaluaciones.api.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record CalificacionResponse(
        UUID id,
        UUID evaluacionId,
        UUID estudianteId,
        UUID cursoId,
        String tituloEvaluacion,
        BigDecimal nota,
        String retroalimentacion,
        UUID calificadoPor,
        LocalDateTime fechaCalificacion
) {
}
