package com.lms.evaluaciones.infrastructure.repositories;

import com.lms.evaluaciones.core.models.Evaluacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface EvaluacionRepository extends JpaRepository<Evaluacion, UUID> {
    // Método para buscar evaluaciones asociadas a un curso específico mediante su UUID
    List<Evaluacion> findByCursoId(UUID cursoId);
}