package ec.edu.unl.lms.cursos.application.service.impl;

import ec.edu.unl.lms.cursos.application.dto.*;
import ec.edu.unl.lms.cursos.application.service.CursoService;
import ec.edu.unl.lms.cursos.domain.exception.BusinessRuleException;
import ec.edu.unl.lms.cursos.domain.exception.CupoAgotadoException;
import ec.edu.unl.lms.cursos.domain.exception.CursoNotFoundException;
import ec.edu.unl.lms.cursos.domain.model.Curso;
import ec.edu.unl.lms.cursos.domain.model.EstadoCurso;
import ec.edu.unl.lms.cursos.domain.model.Modulo;
import ec.edu.unl.lms.cursos.infrastructure.external_clients.UsuarioClient;
import ec.edu.unl.lms.cursos.infrastructure.messaging.CursoEventPublisher;
import ec.edu.unl.lms.cursos.infrastructure.messaging.event.CursoEventoPayload;
import ec.edu.unl.lms.cursos.infrastructure.repository.CursoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class CursoServiceImpl implements CursoService {

    private static final Logger log = LoggerFactory.getLogger(CursoServiceImpl.class);

    private final CursoRepository cursoRepository;
    private final CursoEventPublisher eventPublisher;
    private final UsuarioClient usuarioClient;

    public CursoServiceImpl(
            CursoRepository cursoRepository,
            CursoEventPublisher eventPublisher,
            UsuarioClient usuarioClient) {
        this.cursoRepository = cursoRepository;
        this.eventPublisher = eventPublisher;
        this.usuarioClient = usuarioClient;
    }

    @Override
    public CursoResponse crearCurso(CursoRequest request) {
        if (cursoRepository.existsByCodigoIgnoreCase(request.codigo())) {
            throw new BusinessRuleException("Ya existe un curso registrado con el codigo: " + request.codigo());
        }

        // Validacion del docente por UUID (Mock en Fase 2 / Cliente HTTP en Fase 4)
        if (!usuarioClient.validarDocenteActivo(request.docenteId())) {
            throw new BusinessRuleException("El docente con UUID " + request.docenteId() + " no existe o no se encuentra activo.");
        }

        Curso curso = new Curso();
        curso.setCodigo(request.codigo().toUpperCase().trim());
        curso.setTitulo(request.titulo().trim());
        curso.setDescripcion(request.descripcion());
        curso.setCategoria(request.categoria().trim());
        curso.setNivel(request.nivel());
        curso.setEstado(EstadoCurso.BORRADOR);
        curso.setDocenteId(request.docenteId());
        curso.setCupoMaximo(request.cupoMaximo());
        curso.setCuposDisponibles(request.cupoMaximo());
        curso.setDuracionHoras(request.duracionHoras());
        curso.setPrecio(request.precio());

        if (request.modulos() != null) {
            for (ModuloRequest modReq : request.modulos()) {
                Modulo modulo = new Modulo();
                modulo.setTitulo(modReq.titulo());
                modulo.setDescripcion(modReq.descripcion());
                modulo.setOrden(modReq.orden());
                modulo.setDuracionMinutos(modReq.duracionMinutos());
                modulo.setRecursoUrl(modReq.recursoUrl());
                curso.agregarModulo(modulo);
            }
        }

        Curso guardado = cursoRepository.save(curso);
        log.info("Curso creado exitosamente con ID={} y codigo={}", guardado.getId(), guardado.getCodigo());

        publicarEventoCurso("CursoCreado", guardado, "cursos.evento.creado");
        return mapToResponse(guardado);
    }

    @Override
    @Transactional(readOnly = true)
    public CursoResponse obtenerPorId(UUID id) {
        Curso curso = cursoRepository.findById(id)
                .orElseThrow(() -> new CursoNotFoundException(id));
        return mapToResponse(curso);
    }

    @Override
    @Transactional(readOnly = true)
    public CursoResponse obtenerPorCodigo(String codigo) {
        Curso curso = cursoRepository.findByCodigoIgnoreCase(codigo)
                .orElseThrow(() -> new CursoNotFoundException(codigo));
        return mapToResponse(curso);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CursoResponse> listarTodos(String categoria, EstadoCurso estado) {
        List<Curso> cursos;
        if (categoria != null && !categoria.isBlank() && estado != null) {
            cursos = cursoRepository.findByCategoriaIgnoreCaseAndEstado(categoria, estado);
        } else if (categoria != null && !categoria.isBlank()) {
            cursos = cursoRepository.findByCategoriaIgnoreCase(categoria);
        } else if (estado != null) {
            cursos = cursoRepository.findByEstado(estado);
        } else {
            cursos = cursoRepository.findAll();
        }
        return cursos.stream().map(this::mapToResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CursoResponse> listarCursosActivosParaCatalogo() {
        return cursoRepository.findByEstadoIn(List.of(EstadoCurso.PUBLICADO, EstadoCurso.EN_CURSO))
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CursoResponse> listarPorDocente(UUID docenteId) {
        return cursoRepository.findByDocenteId(docenteId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public CursoResponse actualizarCurso(UUID id, CursoRequest request) {
        Curso curso = cursoRepository.findById(id)
                .orElseThrow(() -> new CursoNotFoundException(id));

        if (!curso.getCodigo().equalsIgnoreCase(request.codigo())
                && cursoRepository.existsByCodigoIgnoreCase(request.codigo())) {
            throw new BusinessRuleException("El codigo " + request.codigo() + " ya pertenece a otro curso.");
        }

        int inscritosActuales = curso.getCupoMaximo() - curso.getCuposDisponibles();
        if (request.cupoMaximo() < inscritosActuales) {
            throw new BusinessRuleException(
                    "El nuevo cupo maximo (" + request.cupoMaximo() + ") no puede ser menor a los estudiantes ya inscritos (" + inscritosActuales + ").");
        }

        curso.setCodigo(request.codigo().toUpperCase().trim());
        curso.setTitulo(request.titulo().trim());
        curso.setDescripcion(request.descripcion());
        curso.setCategoria(request.categoria().trim());
        curso.setNivel(request.nivel());
        curso.setDocenteId(request.docenteId());
        curso.setCupoMaximo(request.cupoMaximo());
        curso.setCuposDisponibles(request.cupoMaximo() - inscritosActuales);
        curso.setDuracionHoras(request.duracionHoras());
        curso.setPrecio(request.precio());

        Curso actualizado = cursoRepository.save(curso);
        publicarEventoCurso("CursoActualizado", actualizado, "cursos.evento.actualizado");
        return mapToResponse(actualizado);
    }

    @Override
    public CursoResponse cambiarEstado(UUID id, EstadoCurso nuevoEstado) {
        Curso curso = cursoRepository.findById(id)
                .orElseThrow(() -> new CursoNotFoundException(id));

        curso.setEstado(nuevoEstado);
        Curso actualizado = cursoRepository.save(curso);

        String tipoEvento = (nuevoEstado == EstadoCurso.PUBLICADO) ? "CursoPublicado" : "EstadoCursoCambiado";
        publicarEventoCurso(tipoEvento, actualizado, "cursos.evento.estado");
        return mapToResponse(actualizado);
    }

    @Override
    public ModuloResponse agregarModulo(UUID cursoId, ModuloRequest request) {
        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new CursoNotFoundException(cursoId));

        Modulo modulo = new Modulo();
        modulo.setTitulo(request.titulo());
        modulo.setDescripcion(request.descripcion());
        modulo.setOrden(request.orden());
        modulo.setDuracionMinutos(request.duracionMinutos());
        modulo.setRecursoUrl(request.recursoUrl());

        curso.agregarModulo(modulo);
        cursoRepository.save(curso);

        Modulo guardado = curso.getModulos().get(curso.getModulos().size() - 1);
        return new ModuloResponse(
                guardado.getId(),
                guardado.getTitulo(),
                guardado.getDescripcion(),
                guardado.getOrden(),
                guardado.getDuracionMinutos(),
                guardado.getRecursoUrl()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ValidacionCursoResponse validarDisponibilidadCurso(UUID cursoId) {
        return cursoRepository.findById(cursoId)
                .map(c -> new ValidacionCursoResponse(
                        c.getId(),
                        c.getCodigo(),
                        c.getTitulo(),
                        c.getEstado(),
                        true,
                        c.estaActivoParaInscripcion(),
                        c.getCuposDisponibles(),
                        c.getPrecio()
                ))
                .orElse(new ValidacionCursoResponse(
                        cursoId,
                        null,
                        null,
                        null,
                        false,
                        false,
                        0,
                        null
                ));
    }

    @Override
    public void procesarReservaCupoPorInscripcion(UUID cursoId, UUID inscripcionId, UUID estudianteId) {
        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new CursoNotFoundException(cursoId));

        if (!curso.estaActivoParaInscripcion()) {
            throw new CupoAgotadoException(cursoId);
        }

        curso.descontarCupo();
        Curso actualizado = cursoRepository.save(curso);
        log.info("Cupo descontado para curso={} por inscripcion={} (estudiante={}). Cupos restantes={}",
                curso.getCodigo(), inscripcionId, estudianteId, actualizado.getCuposDisponibles());

        publicarEventoCurso("CupoCursoActualizado", actualizado, "cursos.evento.cupo");
    }

    @Override
    public void eliminarCurso(UUID id) {
        Curso curso = cursoRepository.findById(id)
                .orElseThrow(() -> new CursoNotFoundException(id));
        cursoRepository.delete(curso);
        publicarEventoCurso("CursoEliminado", curso, "cursos.evento.eliminado");
    }

    private void publicarEventoCurso(String tipoEvento, Curso curso, String routingKey) {
        CursoEventoPayload payload = new CursoEventoPayload(
                UUID.randomUUID(),
                tipoEvento,
                curso.getId(),
                curso.getCodigo(),
                curso.getTitulo(),
                curso.getDocenteId(),
                curso.getEstado().name(),
                curso.getCuposDisponibles(),
                curso.getPrecio(),
                LocalDateTime.now()
        );
        eventPublisher.publicarEvento(payload, routingKey);
    }

    private CursoResponse mapToResponse(Curso curso) {
        List<ModuloResponse> modulos = curso.getModulos().stream()
                .map(m -> new ModuloResponse(
                        m.getId(),
                        m.getTitulo(),
                        m.getDescripcion(),
                        m.getOrden(),
                        m.getDuracionMinutos(),
                        m.getRecursoUrl()
                ))
                .toList();

        return new CursoResponse(
                curso.getId(),
                curso.getCodigo(),
                curso.getTitulo(),
                curso.getDescripcion(),
                curso.getCategoria(),
                curso.getNivel(),
                curso.getEstado(),
                curso.getDocenteId(),
                curso.getCupoMaximo(),
                curso.getCuposDisponibles(),
                curso.getDuracionHoras(),
                curso.getPrecio(),
                modulos,
                curso.getFechaCreacion(),
                curso.getFechaActualizacion()
        );
    }
}
