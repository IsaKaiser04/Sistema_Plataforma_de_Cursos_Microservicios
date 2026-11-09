package ec.edu.unl.lms.cursos.infrastructure.messaging.event;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Evento emitido por ms-inscripciones cuando un estudiante se inscribe a un curso.
 * Consumido por ms-cursos para actualizar los cupos disponibles de forma asincrona.
 */
public record InscripcionCreadaEvent(
        UUID inscripcionId,
        UUID cursoId,
        UUID estudianteId,
        String estadoInscripcion,
        LocalDateTime fechaInscripcion
) {}
