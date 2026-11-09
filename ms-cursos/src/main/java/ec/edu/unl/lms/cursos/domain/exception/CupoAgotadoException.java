package ec.edu.unl.lms.cursos.domain.exception;

import java.util.UUID;

public class CupoAgotadoException extends RuntimeException {
    public CupoAgotadoException(UUID cursoId) {
        super("El curso con ID " + cursoId + " no dispone de cupos disponibles.");
    }
}
