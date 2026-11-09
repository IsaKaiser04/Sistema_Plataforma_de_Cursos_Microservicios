package ec.edu.unl.lms.cursos.core.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("API Microservicio de Cursos (ms-cursos) - LMS UNL")
                        .version("1.0.0")
                        .description("Especificacion API-First para la gestion de cursos, modulos, validacion de catalogo y sincronizacion por eventos con RabbitMQ.")
                        .contact(new Contact()
                                .name("Grupo 1 - Sistemas Distribuidos UNL")
                                .email("cristian.tomala@unl.edu.ec")));
    }
}
