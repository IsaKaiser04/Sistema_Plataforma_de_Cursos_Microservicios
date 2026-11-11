package ec.edu.unl.lms.cursos.infrastructure.messaging;

import ec.edu.unl.lms.cursos.infrastructure.messaging.event.AccesoHabilitadoEvent;
import ec.edu.unl.lms.cursos.infrastructure.messaging.event.CursoEventoPayload;
import ec.edu.unl.lms.cursos.infrastructure.messaging.event.InscripcionRechazadaEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CursoEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(CursoEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    @Value("${lms.messaging.exchange}")
    private String exchangeName;

    public CursoEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publicarEvento(CursoEventoPayload evento, String routingKey) {
        try {
            rabbitTemplate.convertAndSend(exchangeName, routingKey, evento);
            log.info("Evento AMQP publicado -> exchange={}, routingKey={}, tipo={}, cursoId={}",
                    exchangeName, routingKey, evento.tipoEvento(), evento.cursoId());
        } catch (AmqpException ex) {
            log.warn("No se pudo publicar el evento {} en RabbitMQ: {}", evento.tipoEvento(), ex.getMessage());
        }
    }

    public void publicarAccesoHabilitado(AccesoHabilitadoEvent evento) {
        try {
            rabbitTemplate.convertAndSend(exchangeName, "acceso.habilitado", evento);
            log.info("Evento AMQP [acceso.habilitado] publicado -> inscripcionId={}, cursoId={}",
                    evento.inscripcionId(), evento.cursoId());
        } catch (AmqpException ex) {
            log.warn("No se pudo publicar acceso.habilitado en RabbitMQ: {}", ex.getMessage());
        }
    }

    public void publicarInscripcionRechazada(InscripcionRechazadaEvent evento) {
        try {
            rabbitTemplate.convertAndSend(exchangeName, "inscripcion.rechazada", evento);
            log.info("Evento AMQP [inscripcion.rechazada] publicado -> inscripcionId={}, motivo={}",
                    evento.inscripcionId(), evento.motivo());
        } catch (AmqpException ex) {
            log.warn("No se pudo publicar inscripcion.rechazada en RabbitMQ: {}", ex.getMessage());
        }
    }
}
