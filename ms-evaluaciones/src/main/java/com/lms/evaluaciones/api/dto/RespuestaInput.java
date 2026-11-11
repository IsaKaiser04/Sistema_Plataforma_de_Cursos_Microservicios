package com.lms.evaluaciones.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record RespuestaInput(
        @NotNull UUID preguntaId,
        @NotBlank @Size(max = 4000) String respuesta
) {
}
