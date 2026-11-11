package ec.edu.unl.lms.cursos.api.exception;

import ec.edu.unl.lms.cursos.domain.exception.BusinessRuleException;
import ec.edu.unl.lms.cursos.domain.exception.CupoAgotadoException;
import ec.edu.unl.lms.cursos.domain.exception.CursoNotFoundException;
import ec.edu.unl.lms.cursos.domain.exception.ForbiddenAccessException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Formato comun de error definido en integracion.md seccion 5:
 * { "timestamp", "status", "error", "mensaje", "ruta" }
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CursoNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(CursoNotFoundException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.NOT_FOUND, "NO_ENCONTRADO", ex.getMessage(), req.getRequestURI());
    }

    @ExceptionHandler(ForbiddenAccessException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(ForbiddenAccessException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.FORBIDDEN, "PROHIBIDO", ex.getMessage(), req.getRequestURI());
    }

    @ExceptionHandler(CupoAgotadoException.class)
    public ResponseEntity<Map<String, Object>> handleCupoAgotado(CupoAgotadoException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.CONFLICT, "CUPO_AGOTADO", ex.getMessage(), req.getRequestURI());
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<Map<String, Object>> handleBusinessRule(BusinessRuleException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.CONFLICT, ex.getCodigoError(), ex.getMessage(), req.getRequestURI());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<Map<String, Object>> handleValidationErrors(Exception ex, HttpServletRequest req) {
        String detalle = "Datos de entrada invalidos";
        if (ex instanceof MethodArgumentNotValidException manv) {
            detalle = manv.getBindingResult().getFieldErrors().stream()
                    .map(FieldError::getDefaultMessage)
                    .collect(Collectors.joining("; "));
        }
        return buildResponse(HttpStatus.BAD_REQUEST, "DATOS_INVALIDOS", detalle, req.getRequestURI());
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String error, String mensaje, String ruta) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS).toString());
        body.put("status", status.value());
        body.put("error", error);
        body.put("mensaje", mensaje);
        body.put("ruta", ruta);
        return ResponseEntity.status(status).body(body);
    }
}
