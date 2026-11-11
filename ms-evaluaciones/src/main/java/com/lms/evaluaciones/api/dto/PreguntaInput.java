package com.lms.evaluaciones.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PreguntaInput(
        @NotBlank @Size(max = 1200) String enunciado,
        @NotNull @Min(1) Integer orden
) {
}
