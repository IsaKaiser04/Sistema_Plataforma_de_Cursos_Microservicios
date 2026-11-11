package ec.edu.unl.lms.cursos.infrastructure.messaging;

import ec.edu.unl.lms.cursos.application.service.CursoService;
import ec.edu.unl.lms.cursos.infrastructure.messaging.event.InscripcionCreadaEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
public class InscripcionEventListener {

    private static final Logger log = LoggerFactory.getLogger(InscripcionEventListener.class);

    private final CursoService cursoService;

    public InscripcionEventListener(CursoService cursoService) {
        this.cursoService = cursoService;
    }

    @RabbitListener(queues = "${lms.messaging.inscripciones-queue}")
    public void recibirEventoInscripcion(
            InscripcionCreadaEvent evento,
            @Header(name = AmqpHeaders.RECEIVED_ROUTING_KEY, required = false) String routingKey) {
        if (evento == null || evento.inscripcionId() == null || evento.cursoId() == null || evento.estudianteId() == null) {
            throw new AmqpRejectAndDontRequeueException("Evento de inscripcion invalido: faltan campos UUID obligatorios");
        }

        if ("inscripcion.cancelada".equals(routingKey) || "CANCELADA".equalsIgnoreCase(evento.estadoInscripcion())) {
            log.info("Evento recibido [inscripcion.cancelada] -> inscripcionId={}, cursoId={}",
                    evento.inscripcionId(), evento.cursoId());
            cursoService.procesarCancelacionInscripcion(evento.cursoId(), evento.inscripcionId(), evento.estudianteId());
        } else {
            log.info("Evento recibido [inscripcion.creada] -> inscripcionId={}, cursoId={}, estudianteId={}",
                    evento.inscripcionId(), evento.cursoId(), evento.estudianteId());
            cursoService.procesarReservaCupoPorInscripcion(evento.cursoId(), evento.inscripcionId(), evento.estudianteId());
        }
    }
}
