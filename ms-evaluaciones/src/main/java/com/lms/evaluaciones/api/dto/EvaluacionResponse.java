package com.lms.evaluaciones.api.dto;

import com.lms.evaluaciones.domain.model.EstadoEvaluacion;
import com.lms.evaluaciones.domain.model.TipoEvaluacion;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record EvaluacionResponse(
        UUID id,
        UUID cursoId,
        String titulo,
        String descripcion,
        TipoEvaluacion tipo,
        EstadoEvaluacion estado,
        BigDecimal peso,
        BigDecimal notaMaxima,
        LocalDateTime fechaApertura,
        LocalDateTime fechaCierre,
        UUID moduloId,
        LocalDateTime fechaCreacion
) {
}
