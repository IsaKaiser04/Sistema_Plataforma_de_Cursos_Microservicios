package com.lms.evaluaciones.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record EntregaRequest(@NotEmpty List<@Valid RespuestaInput> respuestas) {
}
