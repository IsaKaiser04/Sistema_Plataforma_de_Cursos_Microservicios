package com.lms.evaluaciones.api;

import com.lms.evaluaciones.core.ApiError;
import com.lms.evaluaciones.core.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiError> handleApiException(ApiException exception, HttpServletRequest request) {
        return response(exception.getStatus(), exception.getCodigo(), exception.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        FieldError fieldError = exception.getBindingResult().getFieldErrors().stream().findFirst().orElse(null);
        String message = fieldError == null ? "Los datos enviados no son válidos"
                : fieldError.getField() + ": " + fieldError.getDefaultMessage();
        return response(HttpStatus.BAD_REQUEST, "DATOS_INVALIDOS", message, request);
    }

    @ExceptionHandler({ConstraintViolationException.class, HttpMessageNotReadableException.class})
    ResponseEntity<ApiError> handleInvalidRequest(Exception exception, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, "DATOS_INVALIDOS", "La solicitud contiene datos inválidos", request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException exception,
                                                HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, "DATOS_INVALIDOS",
                "El parámetro " + exception.getName() + " tiene un formato inválido", request);
    }

    @ExceptionHandler({ResourceAccessException.class})
    ResponseEntity<ApiError> handleConnectionFailure(Exception exception, HttpServletRequest request) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, "SERVICIO_NO_DISPONIBLE",
                "No fue posible conectarse con el microservicio de Cursos", request);
    }

    @ExceptionHandler(RestClientResponseException.class)
    ResponseEntity<ApiError> handleRemoteResponse(RestClientResponseException exception, HttpServletRequest request) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, "SERVICIO_NO_DISPONIBLE",
                "El microservicio de Cursos respondió con HTTP " + exception.getStatusCode().value(), request);
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiError> handleStatus(ResponseStatusException exception, HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        String code = status == HttpStatus.NOT_FOUND ? "NO_ENCONTRADO"
                : status == HttpStatus.SERVICE_UNAVAILABLE ? "SERVICIO_NO_DISPONIBLE" : "DATOS_INVALIDOS";
        return response(status, code, exception.getReason(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> handleIntegrity(DataIntegrityViolationException exception, HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, "TRANSICION_INVALIDA",
                "La operación viola una regla de integridad de los datos", request);
    }

    private ResponseEntity<ApiError> response(HttpStatus status, String code, String message,
                                              HttpServletRequest request) {
        return ResponseEntity.status(status).body(new ApiError(LocalDateTime.now(), status.value(), code,
                message == null ? status.getReasonPhrase() : message, request.getRequestURI()));
    }
}
