package ec.edu.unl.lms.cursos.domain.model;

import ec.edu.unl.lms.cursos.domain.exception.BusinessRuleException;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "cursos")
public class Curso {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "codigo", nullable = false, unique = true, length = 30)
    private String codigo;

    @Column(name = "titulo", nullable = false, length = 150)
    private String titulo;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "categoria", nullable = false, length = 80)
    private String categoria;

    @Enumerated(EnumType.STRING)
    @Column(name = "nivel", nullable = false, length = 20)
    private NivelCurso nivel;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoCurso estado;

    @Column(name = "docente_id", nullable = false)
    private UUID docenteId;

    @Column(name = "cupo_maximo", nullable = false)
    private Integer cupoMaximo;

    @Column(name = "cupos_disponibles", nullable = false)
    private Integer cuposDisponibles;

    @Column(name = "duracion_horas", nullable = false)
    private Integer duracionHoras;

    @Column(name = "precio", nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    @OneToMany(mappedBy = "curso", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("orden ASC")
    private List<Modulo> modulos = new ArrayList<>();

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.fechaCreacion = now;
        this.fechaActualizacion = now;
        if (this.estado == null) {
            this.estado = EstadoCurso.BORRADOR;
        }
        if (this.cuposDisponibles == null && this.cupoMaximo != null) {
            this.cuposDisponibles = this.cupoMaximo;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.fechaActualizacion = LocalDateTime.now();
    }

    public void agregarModulo(Modulo modulo) {
        modulos.add(modulo);
        modulo.setCurso(this);
    }

    public void transicionarEstado(EstadoCurso nuevoEstado) {
        if (this.estado == null || !this.estado.puedeTransicionarA(nuevoEstado)) {
            throw new BusinessRuleException(
                    "TRANSICION_INVALIDA",
                    "No se permite cambiar el estado de " + this.estado + " a " + nuevoEstado
            );
        }
        this.estado = nuevoEstado;
    }

    public boolean aceptaInscripciones() {
        return this.estado == EstadoCurso.PUBLICADO || this.estado == EstadoCurso.EN_CURSO;
    }

    public boolean tieneCuposDisponibles() {
        return this.cuposDisponibles != null && this.cuposDisponibles > 0;
    }

    public boolean estaActivoParaInscripcion() {
        return aceptaInscripciones() && tieneCuposDisponibles();
    }

    public void descontarCupo() {
        if (!tieneCuposDisponibles()) {
            throw new BusinessRuleException("CUPO_AGOTADO", "No quedan cupos disponibles para el curso " + this.codigo);
        }
        this.cuposDisponibles = this.cuposDisponibles - 1;
    }

    public void liberarCupo() {
        if (this.cuposDisponibles < this.cupoMaximo) {
            this.cuposDisponibles = this.cuposDisponibles + 1;
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public NivelCurso getNivel() { return nivel; }
    public void setNivel(NivelCurso nivel) { this.nivel = nivel; }
    public EstadoCurso getEstado() { return estado; }
    public void setEstado(EstadoCurso estado) { this.estado = estado; }
    public UUID getDocenteId() { return docenteId; }
    public void setDocenteId(UUID docenteId) { this.docenteId = docenteId; }
    public Integer getCupoMaximo() { return cupoMaximo; }
    public void setCupoMaximo(Integer cupoMaximo) { this.cupoMaximo = cupoMaximo; }
    public Integer getCuposDisponibles() { return cuposDisponibles; }
    public void setCuposDisponibles(Integer cuposDisponibles) { this.cuposDisponibles = cuposDisponibles; }
    public Integer getDuracionHoras() { return duracionHoras; }
    public void setDuracionHoras(Integer duracionHoras) { this.duracionHoras = duracionHoras; }
    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }
    public List<Modulo> getModulos() { return modulos; }
    public void setModulos(List<Modulo> modulos) { this.modulos = modulos; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
}
