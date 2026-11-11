package ec.edu.unl.lms.cursos.infrastructure.repository;

import ec.edu.unl.lms.cursos.domain.model.ReservaCupo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ReservaCupoRepository extends JpaRepository<ReservaCupo, UUID> {
}
