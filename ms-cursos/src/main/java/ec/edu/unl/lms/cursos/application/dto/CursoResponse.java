package ec.edu.unl.lms.cursos.application.dto;

import ec.edu.unl.lms.cursos.domain.model.EstadoCurso;
import ec.edu.unl.lms.cursos.domain.model.NivelCurso;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record CursoResponse(
        UUID id,
        String codigo,
        String titulo,
        String descripcion,
        String categoria,
        NivelCurso nivel,
        EstadoCurso estado,
        UUID docenteId,
        Integer cupoMaximo,
        Integer cuposDisponibles,
        Integer duracionHoras,
        BigDecimal precio,
        List<ModuloResponse> modulos,
        LocalDateTime fechaCreacion,
        LocalDateTime fechaActualizacion
) {}
