package com.lms.evaluaciones.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "eventos_procesados")
@Getter
@Setter
@NoArgsConstructor
public class EventoProcesado {
    @Id
    @Column(name = "evento_id")
    private UUID eventoId;

    @Column(nullable = false)
    private LocalDateTime fecha;
}
