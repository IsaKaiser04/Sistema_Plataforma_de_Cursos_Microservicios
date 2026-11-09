package ec.edu.unl.lms.cursos.application.dto;

import ec.edu.unl.lms.cursos.domain.model.NivelCurso;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CursoRequest(
        @NotBlank(message = "El codigo del curso es obligatorio")
        @Size(max = 30, message = "El codigo no puede exceder 30 caracteres")
        String codigo,

        @NotBlank(message = "El titulo del curso es obligatorio")
        @Size(max = 150, message = "El titulo no puede exceder 150 caracteres")
        String titulo,

        @NotBlank(message = "La descripcion del curso es obligatoria")
        String descripcion,

        @NotBlank(message = "La categoria es obligatoria")
        String categoria,

        @NotNull(message = "El nivel del curso es obligatorio (BASICO, INTERMEDIO, AVANZADO)")
        NivelCurso nivel,

        @NotNull(message = "El UUID del docente (docenteId) es obligatorio")
        UUID docenteId,

        @NotNull(message = "El cupo maximo es obligatorio")
        @Min(value = 1, message = "El cupo maximo debe ser al menos 1")
        Integer cupoMaximo,

        @NotNull(message = "La duracion en horas es obligatoria")
        @Min(value = 1, message = "La duracion debe ser de al menos 1 hora")
        Integer duracionHoras,

        @NotNull(message = "El precio es obligatorio")
        @DecimalMin(value = "0.0", inclusive = true, message = "El precio no puede ser negativo")
        BigDecimal precio,

        @Valid
        List<ModuloRequest> modulos
) {}
