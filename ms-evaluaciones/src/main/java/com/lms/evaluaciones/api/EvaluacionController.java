package com.lms.evaluaciones.api;

import com.lms.evaluaciones.api.dto.CalificacionRequest;
import com.lms.evaluaciones.api.dto.CalificacionResponse;
import com.lms.evaluaciones.api.dto.EvaluacionRequest;
import com.lms.evaluaciones.api.dto.EvaluacionResponse;
import com.lms.evaluaciones.api.dto.EntregaRequest;
import com.lms.evaluaciones.api.dto.EntregaResponse;
import com.lms.evaluaciones.application.EvaluacionService;
import com.lms.evaluaciones.core.Actor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/evaluaciones")
public class EvaluacionController {
    private final EvaluacionService service;

    public EvaluacionController(EvaluacionService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<EvaluacionResponse> crear(@Valid @RequestBody EvaluacionRequest request,
                                                    @RequestHeader(value = "X-User-Id", required = false) String userId,
                                                    @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(request, Actor.fromHeaders(userId, userRole)));
    }

    @GetMapping
    public List<EvaluacionResponse> listar(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return service.listarTodas(Actor.fromHeaders(userId, userRole));
    }

    @GetMapping("/{id}")
    public EvaluacionResponse obtener(@PathVariable UUID id,
                                      @RequestHeader(value = "X-User-Id", required = false) String userId,
                                      @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return service.obtener(id, Actor.fromHeaders(userId, userRole));
    }

    @GetMapping("/curso/{cursoId}")
    public List<EvaluacionResponse> listarPorCurso(@PathVariable UUID cursoId,
                                                   @RequestHeader(value = "X-User-Id", required = false) String userId,
                                                   @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return service.listarPorCurso(cursoId, Actor.fromHeaders(userId, userRole));
    }

    @PutMapping("/{id}")
    public EvaluacionResponse actualizar(@PathVariable UUID id, @Valid @RequestBody EvaluacionRequest request,
                                         @RequestHeader(value = "X-User-Id", required = false) String userId,
                                         @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return service.actualizar(id, request, Actor.fromHeaders(userId, userRole));
    }

    @PatchMapping("/{id}/publicar")
    public EvaluacionResponse publicar(@PathVariable UUID id,
                                       @RequestHeader(value = "X-User-Id", required = false) String userId,
                                       @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return service.publicar(id, Actor.fromHeaders(userId, userRole));
    }

    @PatchMapping("/{id}/cerrar")
    public EvaluacionResponse cerrar(@PathVariable UUID id,
                                     @RequestHeader(value = "X-User-Id", required = false) String userId,
                                     @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return service.cerrar(id, Actor.fromHeaders(userId, userRole));
    }

    @PostMapping("/{id}/calificaciones")
    public CalificacionResponse calificar(@PathVariable UUID id, @Valid @RequestBody CalificacionRequest request,
                                          @RequestHeader(value = "X-User-Id", required = false) String userId,
                                          @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return service.calificar(id, request, Actor.fromHeaders(userId, userRole));
    }

    @GetMapping("/{id}/calificaciones")
    public List<CalificacionResponse> calificaciones(@PathVariable UUID id,
                                                     @RequestHeader(value = "X-User-Id", required = false) String userId,
                                                     @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return service.calificacionesEvaluacion(id, Actor.fromHeaders(userId, userRole));
    }

    @PostMapping("/{id}/entregas")
    public EntregaResponse entregar(@PathVariable UUID id, @Valid @RequestBody EntregaRequest request,
                                    @RequestHeader(value = "X-User-Id", required = false) String userId,
                                    @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return service.entregar(id, request, Actor.fromHeaders(userId, userRole));
    }

    @GetMapping("/{id}/entregas")
    public List<EntregaResponse> entregas(@PathVariable UUID id,
                                          @RequestHeader(value = "X-User-Id", required = false) String userId,
                                          @RequestHeader(value = "X-User-Rol", required = false) String userRole) {
        return service.entregas(id, Actor.fromHeaders(userId, userRole));
    }

}
