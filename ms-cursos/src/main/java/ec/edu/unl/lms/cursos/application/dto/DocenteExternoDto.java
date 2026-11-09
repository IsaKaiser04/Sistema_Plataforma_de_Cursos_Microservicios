package ec.edu.unl.lms.cursos.application.dto;

import java.util.UUID;

public record DocenteExternoDto(
        UUID id,
        String nombreCompleto,
        String correo,
        boolean activo
) {}
