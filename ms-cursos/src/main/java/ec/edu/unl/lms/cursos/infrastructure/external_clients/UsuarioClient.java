package ec.edu.unl.lms.cursos.infrastructure.external_clients;

import ec.edu.unl.lms.cursos.application.dto.DocenteExternoDto;
import java.util.Optional;
import java.util.UUID;

public interface UsuarioClient {
    boolean validarDocenteActivo(UUID docenteId);
    Optional<DocenteExternoDto> obtenerDocente(UUID docenteId);
}
