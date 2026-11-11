package ec.edu.unl.lms.cursos.core.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
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

    @Value("${lms.messaging.inscripciones-queue}")
    private String inscripcionesQueueName;

    @Value("${lms.messaging.inscripciones-creada-key}")
    private String inscripcionCreadaKey;

    @Value("${lms.messaging.inscripciones-cancelada-key}")
    private String inscripcionCanceladaKey;

    @Value("${lms.messaging.dlx}")
    private String dlxName;

    @Value("${lms.messaging.dlq}")
    private String dlqName;

    @Bean
    public TopicExchange lmsExchange() {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    public FanoutExchange deadLetterExchange() {
        return new FanoutExchange(dlxName, true, false);
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(dlqName).build();
    }

    @Bean
    public Binding dlqBinding(Queue deadLetterQueue, FanoutExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue).to(deadLetterExchange);
    }

    @Bean
    public Queue inscripcionesQueue() {
        return QueueBuilder.durable(inscripcionesQueueName)
                .withArgument("x-dead-letter-exchange", dlxName)
                .build();
    }

    @Bean
    public Binding inscripcionCreadaBinding(Queue inscripcionesQueue, TopicExchange lmsExchange) {
        return BindingBuilder.bind(inscripcionesQueue).to(lmsExchange).with(inscripcionCreadaKey);
    }

    @Bean
    public Binding inscripcionCanceladaBinding(Queue inscripcionesQueue, TopicExchange lmsExchange) {
        return BindingBuilder.bind(inscripcionesQueue).to(lmsExchange).with(inscripcionCanceladaKey);
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
