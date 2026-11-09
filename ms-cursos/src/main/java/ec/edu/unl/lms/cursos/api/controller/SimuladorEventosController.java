package ec.edu.unl.lms.cursos.api.controller;

import ec.edu.unl.lms.cursos.infrastructure.messaging.event.InscripcionCreadaEvent;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Controlador de apoyo para Fase 2 y Fase 3: permite simular en local un evento InscripcionCreada
 * publicado en RabbitMQ aun cuando ms-inscripciones no este levantado.
 */
@RestController
@RequestMapping("/api/v1/cursos/simulador")
@Tag(name = "Simulador de Eventos (Fase 2/3)", description = "Permite disparar eventos de prueba hacia RabbitMQ para verificar el descuento asincrono de cupos")
public class SimuladorEventosController {

    private final RabbitTemplate rabbitTemplate;

    @Value("${lms.messaging.exchange}")
    private String exchangeName;

    @Value("${lms.messaging.inscripciones-routing-key}")
    private String inscripcionesRoutingKey;

    public SimuladorEventosController(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @PostMapping("/inscripcion-creada/{cursoId}")
    @Operation(summary = "Simular evento InscripcionCreada en RabbitMQ")
    public ResponseEntity<Map<String, Object>> simularInscripcion(@PathVariable UUID cursoId) {
        InscripcionCreadaEvent event = new InscripcionCreadaEvent(
                UUID.randomUUID(),
                cursoId,
                UUID.randomUUID(),
                "APROBADA",
                LocalDateTime.now()
        );
        rabbitTemplate.convertAndSend(exchangeName, inscripcionesRoutingKey, event);
        return ResponseEntity.ok(Map.of(
                "mensaje", "Evento InscripcionCreada enviado a RabbitMQ exitosamente",
                "evento", event
        ));
    }
}
