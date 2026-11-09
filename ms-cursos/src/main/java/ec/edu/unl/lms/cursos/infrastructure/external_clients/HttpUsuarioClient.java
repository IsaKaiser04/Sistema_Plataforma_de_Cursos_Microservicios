package ec.edu.unl.lms.cursos.infrastructure.external_clients;

import ec.edu.unl.lms.cursos.application.dto.DocenteExternoDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Optional;
import java.util.UUID;

/**
 * Fase 4 del Plan de Desarrollo: Sustitucion de Mocks por Cliente HTTP real con Timeout.
 * Se activa cambiando USUARIOS_SERVICE_MOCK=false en las variables de entorno.
 */
@Component
@ConditionalOnProperty(name = "lms.external.usuarios-mock", havingValue = "false")
public class HttpUsuarioClient implements UsuarioClient {

    private static final Logger log = LoggerFactory.getLogger(HttpUsuarioClient.class);
    private final RestClient restClient;

    public HttpUsuarioClient(
            RestClient.Builder builder,
            @Value("${lms.external.usuarios-url}") String usuariosBaseUrl) {
        this.restClient = builder.baseUrl(usuariosBaseUrl).build();
    }

    @Override
    public boolean validarDocenteActivo(UUID docenteId) {
        return obtenerDocente(docenteId)
                .map(DocenteExternoDto::activo)
                .orElse(false);
    }

    @Override
    public Optional<DocenteExternoDto> obtenerDocente(UUID docenteId) {
        try {
            DocenteExternoDto dto = restClient.get()
                    .uri("/api/v1/usuarios/docentes/{id}", docenteId)
                    .retrieve()
                    .body(DocenteExternoDto.class);
            return Optional.ofNullable(dto);
        } catch (Exception ex) {
            log.warn("Fallo al consultar servicio externo de usuarios para docenteId={}: {}", docenteId, ex.getMessage());
            return Optional.empty();
        }
    }
}
