package com.lms.evaluaciones.infrastructure.repositories;

import com.lms.evaluaciones.domain.model.NotaFinal;
import com.lms.evaluaciones.domain.model.NotaFinalId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotaFinalRepository extends JpaRepository<NotaFinal, NotaFinalId> {
    List<NotaFinal> findByIdCursoIdOrderByNotaFinalDesc(UUID cursoId);
}
