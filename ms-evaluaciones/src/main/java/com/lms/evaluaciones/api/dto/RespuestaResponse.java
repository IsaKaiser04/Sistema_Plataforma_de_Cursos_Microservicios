package com.lms.evaluaciones.api.dto;

import java.util.UUID;

public record RespuestaResponse(UUID preguntaId, String enunciado, String respuesta) {
}
