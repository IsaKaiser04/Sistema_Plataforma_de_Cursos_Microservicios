package com.lms.evaluaciones.infrastructure.repositories;

import com.lms.evaluaciones.domain.model.CursoLocal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CursoLocalRepository extends JpaRepository<CursoLocal, UUID> {
}
