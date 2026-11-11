package com.lms.evaluaciones.infrastructure.client;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.UUID;

@Component
public class CursoClient {

    private final RestClient restClient;

    public CursoClient() {
        // Apunta a la URL donde corre el microservicio de tu compañero de Cursos
        this.restClient = RestClient.builder()
                .baseUrl("http://localhost:8081/api/v1/cursos")
                .build();
    }

    public boolean existeCurso(UUID cursoId) {
        try {
            // Hace un GET al microservicio de cursos para verificar si existe
            Object response = restClient.get()
                    .uri("/{id}", cursoId)
                    .retrieve()
                    .toEntity(Object.class);
            return response != null;
        } catch (Exception e) {
            // Si da 404 o falla la conexión, asumimos que el curso no existe o el servicio está apagado
            return false;
        }
    }
}