package ec.edu.unl.lms.cursos.infrastructure.messaging.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Contrato JSON sobre AMQP (RabbitMQ) emitido por ms-cursos.
 */
public record CursoEventoPayload(
        UUID eventoId,
        String tipoEvento,
        UUID cursoId,
        String codigoCurso,
        String titulo,
        UUID docenteId,
        String estado,
        Integer cuposDisponibles,
        BigDecimal precio,
        LocalDateTime fechaEvento
) {}
