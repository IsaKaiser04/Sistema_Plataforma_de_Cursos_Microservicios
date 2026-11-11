package com.lms.evaluaciones.core.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI evaluacionesOpenApi() {
        return new OpenAPI().info(new Info()
                .title("API de evaluaciones")
                .description("Gestión de evaluaciones, calificaciones y notas finales")
                .version("v1"));
    }
}
