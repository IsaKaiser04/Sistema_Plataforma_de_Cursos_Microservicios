package ec.edu.unl.lms.cursos.core.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${lms.messaging.exchange}")
    private String exchangeName;

    @Value("${lms.messaging.cursos-queue}")
    private String cursosQueueName;

    @Value("${lms.messaging.cursos-routing-key}")
    private String cursosRoutingKey;

    @Value("${lms.messaging.inscripciones-queue}")
    private String inscripcionesQueueName;

    @Value("${lms.messaging.inscripciones-routing-key}")
    private String inscripcionesRoutingKey;

    @Bean
    public TopicExchange lmsExchange() {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    public Queue cursosEventosQueue() {
        return QueueBuilder.durable(cursosQueueName).build();
    }

    @Bean
    public Queue inscripcionesCreadasQueue() {
        return QueueBuilder.durable(inscripcionesQueueName).build();
    }

    @Bean
    public Binding cursosBinding(Queue cursosEventosQueue, TopicExchange lmsExchange) {
        return BindingBuilder.bind(cursosEventosQueue).to(lmsExchange).with(cursosRoutingKey);
    }

    @Bean
    public Binding inscripcionesBinding(Queue inscripcionesCreadasQueue, TopicExchange lmsExchange) {
        return BindingBuilder.bind(inscripcionesCreadasQueue).to(lmsExchange).with(inscripcionesRoutingKey);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        return template;
    }
}
