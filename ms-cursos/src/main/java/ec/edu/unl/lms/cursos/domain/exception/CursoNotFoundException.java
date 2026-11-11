package ec.edu.unl.lms.cursos.domain.exception;

import java.util.UUID;

public class CursoNotFoundException extends RuntimeException {
    public CursoNotFoundException(UUID id) {
        super("No se encontro el curso con ID: " + id);
    }

    public CursoNotFoundException(String codigo) {
        super("No se encontro el curso con codigo: " + codigo);
    }
}
