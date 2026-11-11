package ec.edu.unl.lms.cursos.core.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;

@Component
public class UserContextInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String userIdHeader = request.getHeader("X-User-Id");
        String rolHeader = request.getHeader("X-User-Rol");

        UUID userId = null;
        if (userIdHeader != null && !userIdHeader.isBlank()) {
            try {
                userId = UUID.fromString(userIdHeader.trim());
            } catch (IllegalArgumentException ignored) {
            }
        }
        String rol = (rolHeader != null && !rolHeader.isBlank()) ? rolHeader.trim().toUpperCase() : null;
        UserContext.set(new UserContext(userId, rol));
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }
}
