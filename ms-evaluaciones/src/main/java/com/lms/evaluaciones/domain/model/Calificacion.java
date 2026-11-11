package com.lms.evaluaciones.domain.model;

import jakarta.persistence.*;
import jakarta.persistence.ForeignKey;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "calificaciones",
        uniqueConstraints = @UniqueConstraint(name = "uk_calificacion_evaluacion_estudiante",
                columnNames = {"evaluacion_id", "estudiante_id"}),
        indexes = @Index(name = "idx_calificaciones_estudiante", columnList = "estudiante_id"))
@Getter
@Setter
@NoArgsConstructor
public class Calificacion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "evaluacion_id", nullable = false)
    private UUID evaluacionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluacion_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_calificaciones_evaluacion"))
    private Evaluacion evaluacion;

    @Column(name = "estudiante_id", nullable = false)
    private UUID estudianteId;

    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal nota;

    @Column(length = 2000)
    private String retroalimentacion;

    @Column(name = "calificado_por", nullable = false)
    private UUID calificadoPor;

    @Column(name = "fecha_calificacion", nullable = false)
    private LocalDateTime fechaCalificacion;

    @PrePersist
    @PreUpdate
    void actualizarFecha() {
        fechaCalificacion = LocalDateTime.now();
    }
}
