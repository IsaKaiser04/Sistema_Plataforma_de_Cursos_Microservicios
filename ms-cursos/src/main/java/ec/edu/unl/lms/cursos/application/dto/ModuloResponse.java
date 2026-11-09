package ec.edu.unl.lms.cursos.application.dto;

import java.util.UUID;

public record ModuloResponse(
        UUID id,
        String titulo,
        String descripcion,
        Integer orden,
        Integer duracionMinutos,
        String recursoUrl
) {}
