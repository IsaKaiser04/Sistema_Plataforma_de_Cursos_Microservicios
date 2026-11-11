package com.lms.evaluaciones.infrastructure.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class EvaluacionProducer {
    private static final Logger log = LoggerFactory.getLogger(EvaluacionProducer.class);
    private final RabbitTemplate rabbitTemplate;

    public EvaluacionProducer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publicar(String routingKey, Map<String, Object> evento) {
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, routingKey, evento, message -> {
                message.getMessageProperties().setContentType("application/json");
                message.getMessageProperties().setDeliveryMode(org.springframework.amqp.core.MessageDeliveryMode.PERSISTENT);
                return message;
            });
        } catch (AmqpException exception) {
            log.error("No se pudo publicar el evento {} en RabbitMQ", routingKey, exception);
        }
    }
}
