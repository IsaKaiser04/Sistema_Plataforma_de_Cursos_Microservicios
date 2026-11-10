package com.lms.evaluaciones.application.services;

import com.lms.evaluaciones.core.models.Evaluacion;
import com.lms.evaluaciones.infrastructure.repositories.EvaluacionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class EvaluacionService {

    private final EvaluacionRepository evaluacionRepository;

    public EvaluacionService(EvaluacionRepository evaluacionRepository) {
        this.evaluacionRepository = evaluacionRepository;
    }

    // 1. Método requerido por obtenerEvaluaciones() en el controlador
    public List<Evaluacion> listarTodas() {
        return evaluacionRepository.findAll();
    }

    // 2. Método para guardar/crear con validaciones básicas
    public Evaluacion guardarEvaluacion(Evaluacion evaluacion) {
        if (evaluacion.getCalificacionMinima() == null) {
            evaluacion.setCalificacionMinima(3.0);
        }
        return evaluacionRepository.save(evaluacion);
    }

    // 3. Método requerido por obtenerPorCurso(UUID cursoId) en el controlador
    public List<Evaluacion> listarPorCurso(UUID cursoId) {
        return evaluacionRepository.findByCursoId(cursoId);
    }
}