package com.lms.evaluaciones.core;

import java.time.LocalDateTime;

public record ApiError(LocalDateTime timestamp, int status, String error, String mensaje, String ruta) {
}
