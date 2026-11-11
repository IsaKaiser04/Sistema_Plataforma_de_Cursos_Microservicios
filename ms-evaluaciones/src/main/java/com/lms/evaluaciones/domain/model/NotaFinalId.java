package com.lms.evaluaciones.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotaFinalId implements Serializable {
    @Column(name = "curso_id")
    private UUID cursoId;

    @Column(name = "estudiante_id")
    private UUID estudianteId;
}
