package com.lms.evaluaciones.core;

import java.util.UUID;

public record Actor(UUID id, String rol) {
    public static Actor fromHeaders(String userId, String userRole) {
        if (userId == null || userRole == null || userId.isBlank() || userRole.isBlank()) {
            throw ApiException.noAutenticado();
        }
        try {
            return new Actor(UUID.fromString(userId), userRole.toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw ApiException.noAutenticado();
        }
    }

    public boolean isAdmin() {
        return "ADMINISTRADOR".equals(rol);
    }

    public boolean isTeacher() {
        return "DOCENTE".equals(rol);
    }

    public boolean isStudent() {
        return "ESTUDIANTE".equals(rol);
    }
}
