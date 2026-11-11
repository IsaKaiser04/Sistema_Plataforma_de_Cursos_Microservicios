package com.lms.evaluaciones.api.dto;

import com.lms.evaluaciones.domain.model.TipoEvaluacion;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record EvaluacionRequest(
        @NotNull UUID cursoId,
        @NotBlank @Size(max = 160) String titulo,
        @Size(max = 2000) String descripcion,
        @NotNull TipoEvaluacion tipo,
        @NotNull @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal peso,
        @DecimalMin("0.01") @DecimalMax("10.00") BigDecimal notaMaxima,
        @NotNull LocalDateTime fechaApertura,
        @NotNull LocalDateTime fechaCierre,
        UUID moduloId,
        @NotEmpty List<@Valid PreguntaInput> preguntas
) {
}
