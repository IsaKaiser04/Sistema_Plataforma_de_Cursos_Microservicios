package com.lms.evaluaciones.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "respuestas_entrega",
        uniqueConstraints = @UniqueConstraint(name = "uk_respuesta_entrega_pregunta",
                columnNames = {"entrega_id", "pregunta_id"}))
@Getter
@Setter
@NoArgsConstructor
public class RespuestaEntrega {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entrega_id", nullable = false)
    private EntregaEvaluacion entrega;

    @Column(name = "pregunta_id", nullable = false)
    private UUID preguntaId;

    @Column(nullable = false, length = 4000)
    private String respuesta;

    @Column(nullable = false)
    private Integer orden;
}
