package com.lms.evaluaciones.api.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record NotaFinalResponse(
        UUID cursoId,
        UUID estudianteId,
        BigDecimal notaFinal,
        boolean aprobado,
        LocalDateTime fechaCalculo
) {
}
