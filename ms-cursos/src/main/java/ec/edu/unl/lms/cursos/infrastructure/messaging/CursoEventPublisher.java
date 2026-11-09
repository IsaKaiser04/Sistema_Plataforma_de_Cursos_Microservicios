package ec.edu.unl.lms.cursos.infrastructure.messaging;

import ec.edu.unl.lms.cursos.infrastructure.messaging.event.CursoEventoPayload;
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
            log.info("Evento AMQP publicado en RabbitMQ -> exchange={}, routingKey={}, tipo={}, cursoId={}",
                    exchangeName, routingKey, evento.tipoEvento(), evento.cursoId());
        } catch (AmqpException ex) {
            // Resiliencia: si el broker RabbitMQ no esta disponible temporalmente, se registra sin abortar la transaccion local
            log.warn("No se pudo publicar el evento {} en RabbitMQ (modo resiliente): {}",
                    evento.tipoEvento(), ex.getMessage());
        }
    }
}
