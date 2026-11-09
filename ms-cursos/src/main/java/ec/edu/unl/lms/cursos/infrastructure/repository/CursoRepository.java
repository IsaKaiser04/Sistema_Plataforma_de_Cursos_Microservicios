package ec.edu.unl.lms.cursos.infrastructure.repository;

import ec.edu.unl.lms.cursos.domain.model.Curso;
import ec.edu.unl.lms.cursos.domain.model.EstadoCurso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CursoRepository extends JpaRepository<Curso, UUID> {
    Optional<Curso> findByCodigoIgnoreCase(String codigo);
    boolean existsByCodigoIgnoreCase(String codigo);
    List<Curso> findByEstado(EstadoCurso estado);
    List<Curso> findByEstadoIn(Collection<EstadoCurso> estados);
    List<Curso> findByCategoriaIgnoreCase(String categoria);
    List<Curso> findByCategoriaIgnoreCaseAndEstado(String categoria, EstadoCurso estado);
    List<Curso> findByDocenteId(UUID docenteId);
}
