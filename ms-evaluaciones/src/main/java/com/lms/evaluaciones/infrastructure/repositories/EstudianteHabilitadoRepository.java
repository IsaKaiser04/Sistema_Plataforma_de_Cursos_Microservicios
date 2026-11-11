package com.lms.evaluaciones.infrastructure.repositories;

import com.lms.evaluaciones.domain.model.EstadoHabilitacion;
import com.lms.evaluaciones.domain.model.EstudianteHabilitado;
import com.lms.evaluaciones.domain.model.EstudianteHabilitadoId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EstudianteHabilitadoRepository extends JpaRepository<EstudianteHabilitado, EstudianteHabilitadoId> {
    List<EstudianteHabilitado> findByIdCursoIdAndEstado(UUID cursoId, EstadoHabilitacion estado);
}
