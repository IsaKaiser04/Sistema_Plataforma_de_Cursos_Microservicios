package com.lms.evaluaciones.infrastructure.repositories;

import com.lms.evaluaciones.domain.model.Evaluacion;
import com.lms.evaluaciones.domain.model.EstadoEvaluacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EvaluacionRepository extends JpaRepository<Evaluacion, UUID> {
    List<Evaluacion> findByCursoIdOrderByFechaCreacionAsc(UUID cursoId);
    List<Evaluacion> findByCursoIdAndEstado(UUID cursoId, EstadoEvaluacion estado);
    List<Evaluacion> findByIdIn(List<UUID> ids);
}
