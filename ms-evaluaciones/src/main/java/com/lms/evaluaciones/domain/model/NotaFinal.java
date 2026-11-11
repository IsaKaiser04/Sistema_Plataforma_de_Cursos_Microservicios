package com.lms.evaluaciones.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "notas_finales")
@Getter
@Setter
@NoArgsConstructor
public class NotaFinal {
    @EmbeddedId
    private NotaFinalId id;

    @Column(name = "nota_final", nullable = false, precision = 4, scale = 2)
    private BigDecimal notaFinal;

    @Column(nullable = false)
    private boolean aprobado;

    @Column(name = "fecha_calculo", nullable = false)
    private LocalDateTime fechaCalculo;
}
