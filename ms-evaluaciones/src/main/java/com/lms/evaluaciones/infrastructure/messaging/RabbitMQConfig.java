package com.lms.evaluaciones.infrastructure.messaging;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "lms.exchange";
    
    // Cola para consumir inscripciones (lo que hicimos antes)
    public static final String QUEUE_EVALUACIONES = "cola.evaluaciones.inscripciones";
    public static final String ROUTING_KEY_INSCRIPCION = "curso.inscrito";

    // NUEVO: Routing key para cuando se aprueba una evaluación
    public static final String ROUTING_KEY_EVALUACION_APROBADA = "evaluacion.aprobada";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public Queue evaluacionesQueue() {
        return new Queue(QUEUE_EVALUACIONES, true);
    }

    @Bean
    public Binding binding(Queue evaluacionesQueue, TopicExchange exchange) {
        return BindingBuilder.bind(evaluacionesQueue).to(exchange).with(ROUTING_KEY_INSCRIPCION);
    }
}