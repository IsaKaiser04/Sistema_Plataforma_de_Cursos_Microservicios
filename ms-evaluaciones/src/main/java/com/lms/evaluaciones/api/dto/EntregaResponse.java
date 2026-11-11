package com.lms.evaluaciones.api.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record EntregaResponse(
        UUID id,
        UUID evaluacionId,
        UUID estudianteId,
        LocalDateTime fechaEntrega,
        List<RespuestaResponse> respuestas
) {
}
