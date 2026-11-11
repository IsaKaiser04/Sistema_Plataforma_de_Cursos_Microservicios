package com.lms.evaluaciones.infrastructure.repositories;

import com.lms.evaluaciones.domain.model.EntregaEvaluacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EntregaEvaluacionRepository extends JpaRepository<EntregaEvaluacion, UUID> {
    Optional<EntregaEvaluacion> findByEvaluacionIdAndEstudianteId(UUID evaluacionId, UUID estudianteId);
    List<EntregaEvaluacion> findByEvaluacionIdOrderByFechaEntregaAsc(UUID evaluacionId);
}
