package ec.edu.unl.lms.cursos.api.controller;

import ec.edu.unl.lms.cursos.infrastructure.messaging.event.InscripcionCreadaEvent;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@Profile("dev")
@RequestMapping("/api/v1/cursos/simulador")
@Tag(name = "Simulador de Eventos (Solo perfil dev)", description = "Permite disparar eventos de prueba hacia RabbitMQ")
public class SimuladorEventosController {

    private final RabbitTemplate rabbitTemplate;

    @Value("${lms.messaging.exchange}")
    private String exchangeName;

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
                "PENDIENTE",
                LocalDateTime.now()
        );
        rabbitTemplate.convertAndSend(exchangeName, "inscripcion.creada", event);
        return ResponseEntity.ok(Map.of(
                "mensaje", "Evento inscripcion.creada enviado a RabbitMQ exitosamente",
                "evento", event
        ));
    }

    @PostMapping("/inscripcion-cancelada/{cursoId}/{inscripcionId}")
    @Operation(summary = "Simular evento InscripcionCancelada en RabbitMQ")
    public ResponseEntity<Map<String, Object>> simularCancelacion(
            @PathVariable UUID cursoId,
            @PathVariable UUID inscripcionId) {
        InscripcionCreadaEvent event = new InscripcionCreadaEvent(
                inscripcionId,
                cursoId,
                UUID.randomUUID(),
                "CANCELADA",
                LocalDateTime.now()
        );
        rabbitTemplate.convertAndSend(exchangeName, "inscripcion.cancelada", event);
        return ResponseEntity.ok(Map.of(
                "mensaje", "Evento inscripcion.cancelada enviado a RabbitMQ exitosamente",
                "evento", event
        ));
    }
}
