package ec.edu.unl.lms.cursos.domain.model;

public enum EstadoCurso {
    BORRADOR,
    PUBLICADO,
    EN_CURSO,
    FINALIZADO,
    ARCHIVADO;

    public boolean puedeTransicionarA(EstadoCurso destino) {
        if (destino == null || this == destino) {
            return false;
        }
        return switch (this) {
            case BORRADOR -> destino == PUBLICADO;
            case PUBLICADO -> destino == BORRADOR || destino == EN_CURSO;
            case EN_CURSO -> destino == FINALIZADO;
            case FINALIZADO -> destino == ARCHIVADO;
            case ARCHIVADO -> false;
        };
    }
}
