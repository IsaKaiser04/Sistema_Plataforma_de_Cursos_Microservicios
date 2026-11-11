package ec.edu.unl.lms.cursos.infrastructure.messaging.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record AccesoHabilitadoEvent(
        UUID eventoId,
        String tipoEvento,
        UUID inscripcionId,
        UUID cursoId,
        UUID estudianteId,
        String codigoCurso,
        String tituloCurso,
        LocalDateTime fechaEvento
) {}
