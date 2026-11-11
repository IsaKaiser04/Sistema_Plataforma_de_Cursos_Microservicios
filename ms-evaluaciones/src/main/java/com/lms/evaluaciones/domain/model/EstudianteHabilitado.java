package com.lms.evaluaciones.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "estudiantes_habilitados")
@Getter
@Setter
@NoArgsConstructor
public class EstudianteHabilitado {
    @EmbeddedId
    private EstudianteHabilitadoId id;

    @Column(name = "inscripcion_id", nullable = false)
    private UUID inscripcionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoHabilitacion estado;

    @Column(nullable = false)
    private LocalDateTime fecha;
}
