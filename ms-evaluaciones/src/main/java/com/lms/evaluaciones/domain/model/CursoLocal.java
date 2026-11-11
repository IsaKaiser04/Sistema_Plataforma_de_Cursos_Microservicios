package com.lms.evaluaciones.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "cursos_local")
@Getter
@Setter
@NoArgsConstructor
public class CursoLocal {
    @Id
    @Column(name = "curso_id")
    private UUID cursoId;

    @Column(length = 40)
    private String codigo;

    @Column(length = 200)
    private String titulo;

    @Column(length = 30)
    private String estado;

    @Column(name = "docente_id")
    private UUID docenteId;

    @Column(name = "nota_minima", nullable = false, precision = 4, scale = 2,
            columnDefinition = "numeric(4,2) default 7.00")
    private BigDecimal notaMinima = new BigDecimal("7.00");
}
