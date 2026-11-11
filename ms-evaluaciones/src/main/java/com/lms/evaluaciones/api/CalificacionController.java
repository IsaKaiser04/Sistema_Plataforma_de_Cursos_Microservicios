package com.lms.evaluaciones.api;

import com.lms.evaluaciones.api.dto.CalificacionResponse;
import com.lms.evaluaciones.api.dto.NotaFinalResponse;
import com.lms.evaluaciones.application.EvaluacionService;
import com.lms.evaluaciones.core.Actor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/calificaciones")
public class CalificacionController {
    private final EvaluacionService service;

    public CalificacionController(EvaluacionService service) {
        this.service = service;
    }

    @GetMapping("/estudiante/{estudianteId}")
    public List<CalificacionResponse> porEstudiante(
            @PathVariable UUID estudianteId,
            @RequestParam(required = false) UUID cursoId,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return service.calificacionesEstudiante(estudianteId, cursoId, Actor.fromHeaders(userId, userRole));
    }

    @GetMapping("/curso/{cursoId}/final")
    public List<NotaFinalResponse> notasFinales(
            @PathVariable UUID cursoId,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return service.notasFinales(cursoId, Actor.fromHeaders(userId, userRole));
    }
}
