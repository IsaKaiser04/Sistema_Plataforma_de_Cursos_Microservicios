package com.lms.evaluaciones.infrastructure.repositories;

import com.lms.evaluaciones.domain.model.EventoProcesado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EventoProcesadoRepository extends JpaRepository<EventoProcesado, UUID> {
}
