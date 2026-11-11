package ec.edu.unl.lms.cursos.domain.exception;

public class BusinessRuleException extends RuntimeException {
    private final String codigoError;

    public BusinessRuleException(String message) {
        super(message);
        this.codigoError = "DATOS_INVALIDOS";
    }

    public BusinessRuleException(String codigoError, String message) {
        super(message);
        this.codigoError = codigoError;
    }

    public String getCodigoError() {
        return codigoError;
    }
}
