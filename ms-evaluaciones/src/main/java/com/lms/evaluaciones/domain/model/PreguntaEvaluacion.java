package com.lms.evaluaciones.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "preguntas_evaluacion",
        uniqueConstraints = @UniqueConstraint(name = "uk_preguntas_evaluacion_orden",
                columnNames = {"evaluacion_id", "orden"}))
@Getter
@Setter
@NoArgsConstructor
public class PreguntaEvaluacion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluacion_id", nullable = false)
    private Evaluacion evaluacion;

    @Column(nullable = false, length = 1200)
    private String enunciado;

    @Column(nullable = false)
    private Integer orden;
}
