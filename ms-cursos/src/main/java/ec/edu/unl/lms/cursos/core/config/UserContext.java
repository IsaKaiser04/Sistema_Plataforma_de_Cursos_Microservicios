package ec.edu.unl.lms.cursos.core.config;

import java.util.UUID;

public record UserContext(UUID userId, String rol) {
    private static final ThreadLocal<UserContext> HOLDER = new ThreadLocal<>();

    public static void set(UserContext ctx) {
        HOLDER.set(ctx);
    }

    public static UserContext get() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }

    public boolean isPresent() {
        return rol != null && !rol.isBlank();
    }

    public boolean isAdmin() {
        return "ADMINISTRADOR".equalsIgnoreCase(rol);
    }

    public boolean isDocente() {
        return "DOCENTE".equalsIgnoreCase(rol);
    }
}
