package com.lms.evaluaciones.api.dto;

import java.util.UUID;

public record PreguntaResponse(UUID id, String enunciado, Integer orden) {
}
