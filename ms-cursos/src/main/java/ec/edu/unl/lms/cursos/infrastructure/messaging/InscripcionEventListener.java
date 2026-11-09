package ec.edu.unl.lms.cursos.infrastructure.messaging;

import ec.edu.unl.lms.cursos.application.service.CursoService;
import ec.edu.unl.lms.cursos.infrastructure.messaging.event.InscripcionCreadaEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class InscripcionEventListener {

    private static final Logger log = LoggerFactory.getLogger(InscripcionEventListener.class);

    private final CursoService cursoService;

    public InscripcionEventListener(CursoService cursoService) {
        this.cursoService = cursoService;
    }

    @RabbitListener(queues = "${lms.messaging.inscripciones-queue}")
    public void recibirEventoInscripcionCreada(InscripcionCreadaEvent evento) {
        log.info("Evento recibido desde RabbitMQ [InscripcionCreada] -> inscripcionId={}, cursoId={}, estudianteId={}",
                evento.inscripcionId(), evento.cursoId(), evento.estudianteId());
        try {
            cursoService.procesarReservaCupoPorInscripcion(
                    evento.cursoId(),
                    evento.inscripcionId(),
                    evento.estudianteId()
            );
        } catch (Exception ex) {
            log.error("Error al procesar reserva de cupo para inscripcionId={}: {}",
                    evento.inscripcionId(), ex.getMessage());
        }
    }
}
