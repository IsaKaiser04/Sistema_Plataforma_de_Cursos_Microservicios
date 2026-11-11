package com.lms.evaluaciones.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record CalificacionRequest(
        @NotNull UUID estudianteId,
        @NotNull @DecimalMin("0.00") BigDecimal nota,
        @Size(max = 2000) String retroalimentacion
) {
}
