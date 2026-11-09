package ec.edu.unl.lms.cursos.infrastructure.external_clients;

import ec.edu.unl.lms.cursos.application.dto.DocenteExternoDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Fase 2 del Plan de Desarrollo: Mocking de Servicios Externos.
 * Simula la validacion de docentes en el microservicio de Usuarios sin bloquear el desarrollo paralelo.
 */
@Component
@ConditionalOnProperty(name = "lms.external.usuarios-mock", havingValue = "true", matchIfMissing = true)
public class MockUsuarioClient implements UsuarioClient {

    private static final Logger log = LoggerFactory.getLogger(MockUsuarioClient.class);

    @Override
    public boolean validarDocenteActivo(UUID docenteId) {
        log.info("[MOCK Usuarios] Validando existencia de docenteId={}", docenteId);
        return docenteId != null;
    }

    @Override
    public Optional<DocenteExternoDto> obtenerDocente(UUID docenteId) {
        return Optional.of(new DocenteExternoDto(
                docenteId,
                "Docente UNL Simulado",
                "docente.lms@unl.edu.ec",
                true
        ));
    }
}
