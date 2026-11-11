package com.lms.evaluaciones.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Check;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "evaluaciones", indexes = @Index(name = "idx_evaluaciones_curso", columnList = "curso_id"))
@Check(name = "ck_evaluaciones_peso", constraints = "peso > 0 AND peso <= 100")
@Getter
@Setter
@NoArgsConstructor
public class Evaluacion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 160)
    private String titulo;

    @Column(length = 2000)
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoEvaluacion tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoEvaluacion estado = EstadoEvaluacion.BORRADOR;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal peso;

    @Column(name = "nota_maxima", nullable = false, precision = 4, scale = 2)
    private BigDecimal notaMaxima = BigDecimal.TEN;

    @Column(name = "curso_id", nullable = false)
    private UUID cursoId;

    @Column(name = "modulo_id")
    private UUID moduloId;

    @Column(name = "fecha_apertura")
    private LocalDateTime fechaApertura;

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    void prePersist() {
        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now();
        }
    }
}
