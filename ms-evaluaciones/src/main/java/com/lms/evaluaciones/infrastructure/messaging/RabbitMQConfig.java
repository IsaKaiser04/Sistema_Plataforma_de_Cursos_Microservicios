package com.lms.evaluaciones.infrastructure.messaging;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.rabbit.retry.RejectAndDontRequeueRecoverer;
import org.springframework.amqp.rabbit.config.RetryInterceptorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    public static final String EXCHANGE_NAME = "lms.eventos.exchange";
    public static final String DEAD_LETTER_EXCHANGE = "lms.evaluaciones.dlx";
    public static final String QUEUE_EVALUACIONES = "lms.evaluaciones.queue";
    public static final String DEAD_LETTER_QUEUE = "lms.evaluaciones.dlq";

    @Bean
    TopicExchange eventosExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE_NAME).durable(true).build();
    }

    @Bean
    DirectExchange deadLetterExchange() {
        return ExchangeBuilder.directExchange(DEAD_LETTER_EXCHANGE).durable(true).build();
    }

    @Bean
    Queue evaluacionesQueue() {
        return QueueBuilder.durable(QUEUE_EVALUACIONES)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", DEAD_LETTER_QUEUE)
                .build();
    }

    @Bean
    Queue evaluacionesDeadLetterQueue() {
        return QueueBuilder.durable(DEAD_LETTER_QUEUE).build();
    }

    @Bean
    Binding deadLetterBinding(Queue evaluacionesDeadLetterQueue, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(evaluacionesDeadLetterQueue).to(deadLetterExchange).with(DEAD_LETTER_QUEUE);
    }

    @Bean
    Binding accesoHabilitadoBinding(Queue evaluacionesQueue, TopicExchange eventosExchange) {
        return BindingBuilder.bind(evaluacionesQueue).to(eventosExchange).with("acceso.habilitado");
    }

    @Bean
    Binding inscripcionCanceladaBinding(Queue evaluacionesQueue, TopicExchange eventosExchange) {
        return BindingBuilder.bind(evaluacionesQueue).to(eventosExchange).with("inscripcion.cancelada");
    }

    @Bean
    Binding cursosBinding(Queue evaluacionesQueue, TopicExchange eventosExchange) {
        return BindingBuilder.bind(evaluacionesQueue).to(eventosExchange).with("cursos.evento.#");
    }

    @Bean
    Jackson2JsonMessageConverter jacksonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                  Jackson2JsonMessageConverter jacksonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jacksonMessageConverter);
        return template;
    }

    @Bean
    SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory, Jackson2JsonMessageConverter jacksonMessageConverter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jacksonMessageConverter);
        factory.setDefaultRequeueRejected(false);
        factory.setAdviceChain(RetryInterceptorBuilder.stateless()
                .maxAttempts(3)
                .backOffOptions(1000, 2.0, 10000)
                .recoverer(new RejectAndDontRequeueRecoverer())
                .build());
        return factory;
    }
}
