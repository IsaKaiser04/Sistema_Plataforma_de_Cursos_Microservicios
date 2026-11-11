package com.lms.evaluaciones.infrastructure.messaging;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class EvaluacionConsumer {

    // Escucha la cola configurada para procesar el evento de inscripción de forma asíncrona
    @RabbitListener(queues = RabbitMQConfig.QUEUE_EVALUACIONES)
    public void consumirMensajeInscripcion(String mensajeJson) {
        try {
            System.out.println(" [📥] Evento recibido desde RabbitMQ en ms-evaluaciones:");
            System.out.println("    -> Carga útil (Payload): " + mensajeJson);
            
            // Aquí puedes deserializar el JSON y guardar en la base de datos de evaluaciones 
            // que el estudiante ahora tiene acceso a las pruebas de este curso.
            
        } catch (Exception e) {
            System.err.println(" [❌] Error procesando el mensaje de la cola: " + e.getMessage());
        }
    }
}