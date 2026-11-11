package ec.edu.unl.lms.cursos.domain.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "reservas_cupo")
public class ReservaCupo {

    @Id
    @Column(name = "inscripcion_id", nullable = false, updatable = false)
    private UUID inscripcionId;

    @Column(name = "curso_id", nullable = false)
    private UUID cursoId;

    @Column(name = "estudiante_id", nullable = false)
    private UUID estudianteId;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoReserva estado;

    @Column(name = "fecha", nullable = false)
    private LocalDateTime fecha;

    public ReservaCupo() {}

    public ReservaCupo(UUID inscripcionId, UUID cursoId, UUID estudianteId, EstadoReserva estado, LocalDateTime fecha) {
        this.inscripcionId = inscripcionId;
        this.cursoId = cursoId;
        this.estudianteId = estudianteId;
        this.estado = estado;
        this.fecha = fecha;
    }

    public UUID getInscripcionId() { return inscripcionId; }
    public void setInscripcionId(UUID inscripcionId) { this.inscripcionId = inscripcionId; }

    public UUID getCursoId() { return cursoId; }
    public void setCursoId(UUID cursoId) { this.cursoId = cursoId; }

    public UUID getEstudianteId() { return estudianteId; }
    public void setEstudianteId(UUID estudianteId) { this.estudianteId = estudianteId; }

    public EstadoReserva getEstado() { return estado; }
    public void setEstado(EstadoReserva estado) { this.estado = estado; }

    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}
