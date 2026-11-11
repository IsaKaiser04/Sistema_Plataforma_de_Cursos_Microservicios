package com.lms.evaluaciones.infrastructure.messaging;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
public class EvaluacionProducer {

    private final RabbitTemplate rabbitTemplate;

    public EvaluacionProducer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    // Método para publicar el evento de que una evaluación fue aprobada
    public void enviarEvaluacionAprobada(String mensajeJson) {
        try {
            rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME, 
                RabbitMQConfig.ROUTING_KEY_EVALUACION_APROBADA, 
                mensajeJson
            );
            System.out.println(" [📤] Evento publicado exitosamente a RabbitMQ: " + mensajeJson);
        } catch (Exception e) {
            System.err.println(" [❌] Error al publicar el evento en RabbitMQ: " + e.getMessage());
        }
    }
}