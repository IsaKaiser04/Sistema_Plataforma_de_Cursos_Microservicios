package com.lms.evaluaciones.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Permitir que credenciales y cookies viajen si es necesario
        config.setAllowCredentials(true);
        
        // Permitir el origen exacto de tu frontend React (Vite)
        config.setAllowedOrigins(Arrays.asList("http://localhost:5173"));
        
        // Permitir todos los encabezados HTTP comunes
        config.setAllowedHeaders(Arrays.asList("*"));
        
        // Permitir todos los métodos HTTP (GET, POST, PUT, DELETE, OPTIONS, etc.)
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}