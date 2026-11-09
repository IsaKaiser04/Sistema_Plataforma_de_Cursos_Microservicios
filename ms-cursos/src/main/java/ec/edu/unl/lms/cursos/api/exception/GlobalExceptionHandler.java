package ec.edu.unl.lms.cursos.api.exception;

import ec.edu.unl.lms.cursos.domain.exception.BusinessRuleException;
import ec.edu.unl.lms.cursos.domain.exception.CupoAgotadoException;
import ec.edu.unl.lms.cursos.domain.exception.CursoNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CursoNotFoundException.class)
    public ProblemDetail handleCursoNotFound(CursoNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Curso no encontrado");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    @ExceptionHandler({BusinessRuleException.class, CupoAgotadoException.class})
    public ProblemDetail handleBusinessRule(RuntimeException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Violacion de regla de negocio");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> errores = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errores.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Error de validacion en los campos enviados");
        problem.setTitle("Datos de entrada invalidos");
        problem.setProperty("errores", errores);
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }
}
