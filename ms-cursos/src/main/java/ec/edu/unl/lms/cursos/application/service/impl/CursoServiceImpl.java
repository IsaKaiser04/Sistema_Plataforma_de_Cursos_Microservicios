package ec.edu.unl.lms.cursos.application.service.impl;

import ec.edu.unl.lms.cursos.application.dto.*;
import ec.edu.unl.lms.cursos.application.service.CursoService;
import ec.edu.unl.lms.cursos.core.config.UserContext;
import ec.edu.unl.lms.cursos.domain.exception.BusinessRuleException;
import ec.edu.unl.lms.cursos.domain.exception.CursoNotFoundException;
import ec.edu.unl.lms.cursos.domain.exception.ForbiddenAccessException;
import ec.edu.unl.lms.cursos.domain.model.*;
import ec.edu.unl.lms.cursos.infrastructure.external_clients.UsuarioClient;
import ec.edu.unl.lms.cursos.infrastructure.messaging.CursoEventPublisher;
import ec.edu.unl.lms.cursos.infrastructure.messaging.event.AccesoHabilitadoEvent;
import ec.edu.unl.lms.cursos.infrastructure.messaging.event.CursoEventoPayload;
import ec.edu.unl.lms.cursos.infrastructure.messaging.event.InscripcionRechazadaEvent;
import ec.edu.unl.lms.cursos.infrastructure.repository.CursoRepository;
import ec.edu.unl.lms.cursos.infrastructure.repository.ReservaCupoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class CursoServiceImpl implements CursoService {

    private static final Logger log = LoggerFactory.getLogger(CursoServiceImpl.class);

    private final CursoRepository cursoRepository;
    private final ReservaCupoRepository reservaCupoRepository;
    private final CursoEventPublisher eventPublisher;
    private final UsuarioClient usuarioClient;

    public CursoServiceImpl(
            CursoRepository cursoRepository,
            ReservaCupoRepository reservaCupoRepository,
            CursoEventPublisher eventPublisher,
            UsuarioClient usuarioClient) {
        this.cursoRepository = cursoRepository;
        this.reservaCupoRepository = reservaCupoRepository;
        this.eventPublisher = eventPublisher;
        this.usuarioClient = usuarioClient;
    }

    @Override
    public CursoResponse crearCurso(CursoRequest request) {
        verificarPermisoCrear();

        if (cursoRepository.existsByCodigoIgnoreCase(request.codigo())) {
            throw new BusinessRuleException("CODIGO_DUPLICADO", "Ya existe un curso registrado con el codigo: " + request.codigo());
        }

        if (!usuarioClient.validarDocenteActivo(request.docenteId())) {
            throw new BusinessRuleException("DATOS_INVALIDOS", "El docente con UUID " + request.docenteId() + " no existe o no se encuentra activo.");
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
            Set<Integer> ordenes = new HashSet<>();
            for (ModuloRequest modReq : request.modulos()) {
                if (!ordenes.add(modReq.orden())) {
                    throw new BusinessRuleException("DATOS_INVALIDOS", "El orden de modulo " + modReq.orden() + " esta duplicado.");
                }
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
        verificarPermisoDocenteOAdmin(curso);

        if (!curso.getCodigo().equalsIgnoreCase(request.codigo())
                && cursoRepository.existsByCodigoIgnoreCase(request.codigo())) {
            throw new BusinessRuleException("CODIGO_DUPLICADO", "El codigo " + request.codigo() + " ya pertenece a otro curso.");
        }

        int inscritosActuales = curso.getCupoMaximo() - curso.getCuposDisponibles();
        if (request.cupoMaximo() < inscritosActuales) {
            throw new BusinessRuleException(
                    "DATOS_INVALIDOS",
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
        verificarPermisoDocenteOAdmin(curso);

        // T5: Validar transiciones permitidas en el dominio
        curso.transicionarEstado(nuevoEstado);
        Curso actualizado = cursoRepository.save(curso);

        String tipoEvento = (nuevoEstado == EstadoCurso.PUBLICADO) ? "CursoPublicado" : "EstadoCursoCambiado";
        publicarEventoCurso(tipoEvento, actualizado, "cursos.evento.estado");
        return mapToResponse(actualizado);
    }

    @Override
    public ModuloResponse agregarModulo(UUID cursoId, ModuloRequest request) {
        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new CursoNotFoundException(cursoId));
        verificarPermisoDocenteOAdmin(curso);

        boolean ordenRepetido = curso.getModulos().stream()
                .anyMatch(m -> m.getOrden().equals(request.orden()));
        if (ordenRepetido) {
            throw new BusinessRuleException("DATOS_INVALIDOS", "Ya existe un modulo con el orden " + request.orden() + " en este curso.");
        }

        Modulo modulo = new Modulo();
        modulo.setTitulo(request.titulo());
        modulo.setDescripcion(request.descripcion());
        modulo.setOrden(request.orden());
        modulo.setDuracionMinutos(request.duracionMinutos());
        modulo.setRecursoUrl(request.recursoUrl());

        curso.agregarModulo(modulo);
        Curso actualizado = cursoRepository.save(curso);
        publicarEventoCurso("CursoActualizado", actualizado, "cursos.evento.actualizado");

        Modulo guardado = actualizado.getModulos().stream()
                .filter(m -> m.getOrden().equals(request.orden()))
                .findFirst()
                .orElse(modulo);

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
    public ModuloResponse actualizarModulo(UUID cursoId, UUID moduloId, ModuloRequest request) {
        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new CursoNotFoundException(cursoId));
        verificarPermisoDocenteOAdmin(curso);

        Modulo modulo = curso.getModulos().stream()
                .filter(m -> m.getId().equals(moduloId))
                .findFirst()
                .orElseThrow(() -> new CursoNotFoundException("No se encontro el modulo con ID: " + moduloId));

        boolean ordenRepetido = curso.getModulos().stream()
                .anyMatch(m -> !m.getId().equals(moduloId) && m.getOrden().equals(request.orden()));
        if (ordenRepetido) {
            throw new BusinessRuleException("DATOS_INVALIDOS", "Ya existe otro modulo con el orden " + request.orden() + " en este curso.");
        }

        modulo.setTitulo(request.titulo());
        modulo.setDescripcion(request.descripcion());
        modulo.setOrden(request.orden());
        modulo.setDuracionMinutos(request.duracionMinutos());
        modulo.setRecursoUrl(request.recursoUrl());

        Curso actualizado = cursoRepository.save(curso);
        publicarEventoCurso("CursoActualizado", actualizado, "cursos.evento.actualizado");

        return new ModuloResponse(
                modulo.getId(),
                modulo.getTitulo(),
                modulo.getDescripcion(),
                modulo.getOrden(),
                modulo.getDuracionMinutos(),
                modulo.getRecursoUrl()
        );
    }

    @Override
    public void eliminarModulo(UUID cursoId, UUID moduloId) {
        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new CursoNotFoundException(cursoId));
        verificarPermisoDocenteOAdmin(curso);

        boolean eliminado = curso.getModulos().removeIf(m -> m.getId().equals(moduloId));
        if (!eliminado) {
            throw new CursoNotFoundException("No se encontro el modulo con ID: " + moduloId);
        }

        Curso actualizado = cursoRepository.save(curso);
        publicarEventoCurso("CursoActualizado", actualizado, "cursos.evento.actualizado");
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
        // T2: Idempotencia — si ya existe reserva para ese inscripcionId, no hacer nada
        if (reservaCupoRepository.existsById(inscripcionId)) {
            log.info("Reserva de cupo ya procesada previamente para inscripcionId={}, ignorando duplicado.", inscripcionId);
            return;
        }

        Optional<Curso> optCurso = cursoRepository.findById(cursoId);
        if (optCurso.isEmpty()) {
            publicarInscripcionRechazada(inscripcionId, cursoId, estudianteId, "CURSO_NO_EXISTE");
            return;
        }

        Curso curso = optCurso.get();
        if (!curso.aceptaInscripciones()) {
            publicarInscripcionRechazada(inscripcionId, cursoId, estudianteId, "CURSO_NO_DISPONIBLE");
            return;
        }

        if (!curso.tieneCuposDisponibles()) {
            publicarInscripcionRechazada(inscripcionId, cursoId, estudianteId, "CUPO_AGOTADO");
            return;
        }

        curso.descontarCupo();
        Curso actualizado = cursoRepository.save(curso);

        ReservaCupo reserva = new ReservaCupo(
                inscripcionId,
                cursoId,
                estudianteId,
                EstadoReserva.RESERVADO,
                LocalDateTime.now()
        );
        reservaCupoRepository.save(reserva);

        publicarEventoCurso("CupoCursoActualizado", actualizado, "cursos.evento.cupo");

        AccesoHabilitadoEvent accesoEvent = new AccesoHabilitadoEvent(
                UUID.randomUUID(),
                "AccesoHabilitado",
                inscripcionId,
                curso.getId(),
                estudianteId,
                curso.getCodigo(),
                curso.getTitulo(),
                LocalDateTime.now()
        );
        eventPublisher.publicarAccesoHabilitado(accesoEvent);
    }

    @Override
    public void procesarCancelacionInscripcion(UUID cursoId, UUID inscripcionId, UUID estudianteId) {
        // T3: Liberar cupo solo si existe una reserva en estado RESERVADO
        Optional<ReservaCupo> optReserva = reservaCupoRepository.findById(inscripcionId);
        if (optReserva.isEmpty()) {
            log.info("No existe reserva para inscripcionId={}, nada que liberar.", inscripcionId);
            return;
        }

        ReservaCupo reserva = optReserva.get();
        if (reserva.getEstado() != EstadoReserva.RESERVADO) {
            log.info("La reserva para inscripcionId={} ya estaba en estado LIBERADO.", inscripcionId);
            return;
        }

        reserva.setEstado(EstadoReserva.LIBERADO);
        reservaCupoRepository.save(reserva);

        cursoRepository.findById(reserva.getCursoId()).ifPresent(curso -> {
            curso.liberarCupo();
            Curso actualizado = cursoRepository.save(curso);
            publicarEventoCurso("CupoCursoActualizado", actualizado, "cursos.evento.cupo");
        });
    }

    @Override
    public void eliminarCurso(UUID id) {
        verificarPermisoAdmin();

        Curso curso = cursoRepository.findById(id)
                .orElseThrow(() -> new CursoNotFoundException(id));

        // T6: Eliminar solo en estado BORRADOR
        if (curso.getEstado() != EstadoCurso.BORRADOR) {
            throw new BusinessRuleException(
                    "TRANSICION_INVALIDA",
                    "Solo se pueden eliminar cursos en estado BORRADOR. El curso actual esta en " + curso.getEstado() + " y debe archivarse."
            );
        }

        cursoRepository.delete(curso);
        publicarEventoCurso("CursoEliminado", curso, "cursos.evento.eliminado");
    }

    private void verificarPermisoCrear() {
        UserContext ctx = UserContext.get();
        if (ctx != null && ctx.isPresent()) {
            if (!ctx.isAdmin() && !ctx.isDocente()) {
                throw new ForbiddenAccessException("Solo usuarios con rol ADMINISTRADOR o DOCENTE pueden crear cursos.");
            }
        }
    }

    private void verificarPermisoDocenteOAdmin(Curso curso) {
        UserContext ctx = UserContext.get();
        if (ctx != null && ctx.isPresent()) {
            if (ctx.isAdmin()) {
                return;
            }
            if (ctx.isDocente() && ctx.userId() != null && ctx.userId().equals(curso.getDocenteId())) {
                return;
            }
            throw new ForbiddenAccessException("Solo el docente dueño del curso o un ADMINISTRADOR pueden modificar este curso.");
        }
    }

    private void verificarPermisoAdmin() {
        UserContext ctx = UserContext.get();
        if (ctx != null && ctx.isPresent()) {
            if (!ctx.isAdmin()) {
                throw new ForbiddenAccessException("Solo un ADMINISTRADOR puede eliminar cursos.");
            }
        }
    }

    private void publicarInscripcionRechazada(UUID inscripcionId, UUID cursoId, UUID estudianteId, String motivo) {
        InscripcionRechazadaEvent event = new InscripcionRechazadaEvent(
                UUID.randomUUID(),
                "InscripcionRechazada",
                inscripcionId,
                cursoId,
                estudianteId,
                motivo,
                LocalDateTime.now()
        );
        eventPublisher.publicarInscripcionRechazada(event);
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
