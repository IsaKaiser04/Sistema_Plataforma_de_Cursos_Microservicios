package ec.edu.unl.lms.cursos.application.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ModuloRequest(
        @NotBlank(message = "El titulo del modulo es obligatorio")
        String titulo,
        String descripcion,
        @NotNull(message = "El orden del modulo es obligatorio")
        @Min(value = 1, message = "El orden debe ser mayor o igual a 1")
        Integer orden,
        @NotNull(message = "La duracion en minutos es obligatoria")
        @Min(value = 5, message = "La duracion minima de un modulo es 5 minutos")
        Integer duracionMinutos,
        String recursoUrl
) {}
