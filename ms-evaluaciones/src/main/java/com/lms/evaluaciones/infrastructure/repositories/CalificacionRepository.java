package com.lms.evaluaciones.infrastructure.repositories;

import com.lms.evaluaciones.domain.model.Calificacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CalificacionRepository extends JpaRepository<Calificacion, UUID> {
    Optional<Calificacion> findByEvaluacionIdAndEstudianteId(UUID evaluacionId, UUID estudianteId);
    List<Calificacion> findByEvaluacionIdOrderByFechaCalificacionAsc(UUID evaluacionId);
    List<Calificacion> findByEstudianteId(UUID estudianteId);
}
