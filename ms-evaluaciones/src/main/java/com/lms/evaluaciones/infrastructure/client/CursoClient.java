package com.lms.evaluaciones.infrastructure.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.lms.evaluaciones.core.ApiException;
import com.lms.evaluaciones.domain.model.CursoLocal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.http.client.JdkClientHttpRequestFactory;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@Component
public class CursoClient {
    private final RestClient restClient;

    public CursoClient(RestClient.Builder builder,
                       @Value("${lms.cursos.service-url:http://localhost:8081}") String cursosServiceUrl,
                       @Value("${lms.cursos.timeout:3s}") Duration timeout) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(timeout).build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(timeout);
        this.restClient = builder.baseUrl(cursosServiceUrl).requestFactory(requestFactory).build();
    }

    public Optional<CursoLocal> obtenerCurso(UUID cursoId) {
        try {
            JsonNode data = restClient.get()
                    .uri("/api/v1/cursos/{id}", cursoId)
                    .retrieve()
                    .body(JsonNode.class);
            if (data == null || data.isNull()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "SERVICIO_NO_DISPONIBLE",
                        "El microservicio de Cursos devolvió una respuesta vacía");
            }
            CursoLocal curso = new CursoLocal();
            curso.setCursoId(cursoId);
            curso.setCodigo(text(data, "codigo", "codigoCurso"));
            curso.setTitulo(text(data, "titulo", "nombre"));
            curso.setEstado(text(data, "estado"));
            curso.setDocenteId(uuid(data, "docenteId"));
            return Optional.of(curso);
        } catch (HttpClientErrorException.NotFound exception) {
            return Optional.empty();
        } catch (ResourceAccessException exception) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SERVICIO_NO_DISPONIBLE",
                    "No fue posible conectarse con el microservicio de Cursos");
        } catch (RestClientResponseException exception) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SERVICIO_NO_DISPONIBLE",
                    "El microservicio de Cursos respondió con HTTP " + exception.getStatusCode().value());
        }
    }

    private String text(JsonNode node, String... names) {
        for (String name : names) {
            JsonNode value = node.get(name);
            if (value != null && !value.isNull()) {
                return value.asText();
            }
        }
        return null;
    }

    private UUID uuid(JsonNode node, String name) {
        String value = text(node, name);
        return value == null || value.isBlank() ? null : UUID.fromString(value);
    }
}
