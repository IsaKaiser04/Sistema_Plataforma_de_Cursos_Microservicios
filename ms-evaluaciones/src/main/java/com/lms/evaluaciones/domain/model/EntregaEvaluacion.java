package com.lms.evaluaciones.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "entregas_evaluacion",
        uniqueConstraints = @UniqueConstraint(name = "uk_entrega_evaluacion_estudiante",
                columnNames = {"evaluacion_id", "estudiante_id"}),
        indexes = @Index(name = "idx_entregas_evaluacion", columnList = "evaluacion_id"))
@Getter
@Setter
@NoArgsConstructor
public class EntregaEvaluacion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "evaluacion_id", nullable = false)
    private UUID evaluacionId;

    @Column(name = "estudiante_id", nullable = false)
    private UUID estudianteId;

    @Column(name = "fecha_entrega", nullable = false)
    private LocalDateTime fechaEntrega;

    @OneToMany(mappedBy = "entrega", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden ASC")
    private List<RespuestaEntrega> respuestas = new ArrayList<>();

    @PrePersist
    void prePersist() {
        if (fechaEntrega == null) fechaEntrega = LocalDateTime.now();
    }

    public void agregarRespuesta(RespuestaEntrega respuesta) {
        respuesta.setEntrega(this);
        respuestas.add(respuesta);
    }
}
