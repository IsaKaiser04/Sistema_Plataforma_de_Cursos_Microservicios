package com.lms.evaluaciones.infrastructure.messaging;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lms.evaluaciones.application.EvaluacionService;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public class EvaluacionConsumer {
    private static final Set<String> ROUTING_KEYS = Set.of(
            "acceso.habilitado",
            "inscripcion.cancelada",
            "cursos.evento.creado",
            "cursos.evento.actualizado",
            "cursos.evento.estado",
            "cursos.evento.cupo",
            "cursos.evento.eliminado"
    );
    private final ObjectMapper objectMapper;
    private final EvaluacionService service;

    public EvaluacionConsumer(ObjectMapper objectMapper, EvaluacionService service) {
        this.objectMapper = objectMapper;
        this.service = service;
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE_EVALUACIONES)
    public void consumir(Message message) {
        String routingKey = message.getMessageProperties().getReceivedRoutingKey();
        if (!ROUTING_KEYS.contains(routingKey)) {
            throw new AmqpRejectAndDontRequeueException("Routing key no soportada: " + routingKey);
        }
        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(message.getBody(), new TypeReference<>() {});
            UUID eventoId = UUID.fromString(requiredString(payload, "eventoId"));
            validarSobre(payload, routingKey);
            validarPayload(routingKey, payload);
            service.procesarEvento(eventoId, routingKey, payload);
        } catch (IOException | IllegalArgumentException exception) {
            throw new AmqpRejectAndDontRequeueException("Payload de evento inválido", exception);
        }
    }

    private void validarSobre(Map<String, Object> payload, String routingKey) {
        String type = requiredString(payload, "tipoEvento");
        String timestamp = requiredString(payload, "fechaEvento");
        try {
            LocalDateTime.parse(timestamp);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("fechaEvento debe ser una fecha ISO 8601 local", exception);
        }
        Set<String> validTypes = switch (routingKey) {
            case "acceso.habilitado" -> Set.of("AccesoHabilitado");
            case "inscripcion.cancelada" -> Set.of("InscripcionCancelada");
            case "cursos.evento.creado" -> Set.of("CursoCreado");
            case "cursos.evento.actualizado" -> Set.of("CursoActualizado");
            case "cursos.evento.estado" -> Set.of("CursoPublicado", "EstadoCursoCambiado");
            case "cursos.evento.cupo" -> Set.of("CupoCursoActualizado");
            case "cursos.evento.eliminado" -> Set.of("CursoEliminado");
            default -> Set.of();
        };
        if (!validTypes.contains(type)) {
            throw new IllegalArgumentException("tipoEvento no coincide con " + routingKey);
        }
    }

    private void validarPayload(String routingKey, Map<String, Object> payload) {
        requiredUuid(payload, "cursoId");
        switch (routingKey) {
            case "acceso.habilitado", "inscripcion.cancelada" -> {
                requiredUuid(payload, "estudianteId");
                requiredUuid(payload, "inscripcionId");
            }
            case "cursos.evento.creado", "cursos.evento.actualizado", "cursos.evento.estado" -> {
                requiredString(payload, "estado");
                requiredUuid(payload, "docenteId");
            }
            case "cursos.evento.cupo", "cursos.evento.eliminado" -> { }
            default -> throw new IllegalArgumentException("Routing key no soportada");
        }
    }

    private UUID requiredUuid(Map<String, Object> payload, String field) {
        return UUID.fromString(requiredString(payload, field));
    }

    private String requiredString(Map<String, Object> payload, String field) {
        Object value = payload.get(field);
        if (value == null || value.toString().isBlank()) {
            throw new IllegalArgumentException("Falta el campo obligatorio " + field);
        }
        return value.toString();
    }
}
