package com.lms.evaluaciones.api.controllers;

import com.lms.evaluaciones.application.services.EvaluacionService;
import com.lms.evaluaciones.core.models.Evaluacion;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/evaluaciones")
@CrossOrigin(origins = "http://localhost:5173") // <-- ¡Agregado aquí para evitar el bloqueo CORS!
public class EvaluacionController {

    private final EvaluacionService evaluacionService;

    public EvaluacionController(EvaluacionService evaluacionService) {
        this.evaluacionService = evaluacionService;
    }

    @GetMapping
    public ResponseEntity<List<Evaluacion>> obtenerEvaluaciones() {
        List<Evaluacion> evaluaciones = evaluacionService.listarTodas();
        return ResponseEntity.ok(evaluaciones);
    }

    @PostMapping
    public ResponseEntity<?> crearEvaluacion(@Valid @RequestBody Evaluacion evaluacion) {
        try {
            Evaluacion nuevaEvaluacion = evaluacionService.guardarEvaluacion(evaluacion);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevaEvaluacion);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("No se pudo crear la evaluación: " + e.getMessage());
        }
    }

    @GetMapping("/curso/{cursoId}")
    public ResponseEntity<List<Evaluacion>> obtenerPorCurso(@PathVariable UUID cursoId) {
        List<Evaluacion> evaluaciones = evaluacionService.listarPorCurso(cursoId);
        return ResponseEntity.ok(evaluaciones);
    }
}