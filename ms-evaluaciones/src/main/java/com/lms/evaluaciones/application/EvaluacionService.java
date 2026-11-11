package com.lms.evaluaciones.application;

import com.lms.evaluaciones.api.dto.*;
import com.lms.evaluaciones.core.Actor;
import com.lms.evaluaciones.core.ApiException;
import com.lms.evaluaciones.domain.model.*;
import com.lms.evaluaciones.infrastructure.client.CursoClient;
import com.lms.evaluaciones.infrastructure.messaging.EvaluacionProducer;
import com.lms.evaluaciones.infrastructure.repositories.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class EvaluacionService {
    private static final BigDecimal CIEN = new BigDecimal("100");

    private final EvaluacionRepository evaluaciones;
    private final CalificacionRepository calificaciones;
    private final EstudianteHabilitadoRepository estudiantes;
    private final CursoLocalRepository cursos;
    private final NotaFinalRepository notasFinales;
    private final EventoProcesadoRepository eventos;
    private final CursoClient cursoClient;
    private final EvaluacionProducer producer;
    private final BigDecimal notaMinima;

    public EvaluacionService(EvaluacionRepository evaluaciones,
                            CalificacionRepository calificaciones,
                            EstudianteHabilitadoRepository estudiantes,
                            CursoLocalRepository cursos,
                            NotaFinalRepository notasFinales,
                            EventoProcesadoRepository eventos,
                            CursoClient cursoClient,
                            EvaluacionProducer producer,
                            @Value("${lms.evaluaciones.nota-minima:7.0}") BigDecimal notaMinima) {
        this.evaluaciones = evaluaciones;
        this.calificaciones = calificaciones;
        this.estudiantes = estudiantes;
        this.cursos = cursos;
        this.notasFinales = notasFinales;
        this.eventos = eventos;
        this.cursoClient = cursoClient;
        this.producer = producer;
        this.notaMinima = notaMinima;
    }

    @Transactional
    public EvaluacionResponse crear(EvaluacionRequest request, Actor actor) {
        CursoLocal curso = obtenerCurso(request.cursoId());
        validarDocenteAdministrador(curso, actor);
        validarFechas(request.fechaApertura(), request.fechaCierre());
        validarPeso(request.cursoId(), request.peso(), null);

        Evaluacion evaluacion = new Evaluacion();
        actualizar(evaluacion, request);
        evaluacion.setEstado(EstadoEvaluacion.BORRADOR);
        return response(evaluaciones.save(evaluacion));
    }

    @Transactional(readOnly = true)
    public List<EvaluacionResponse> listarTodas(Actor actor) {
        exigirAdmin(actor);
        return evaluaciones.findAll().stream().map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public EvaluacionResponse obtener(UUID id, Actor actor) {
        Evaluacion evaluacion = buscarEvaluacion(id);
        validarAccesoCurso(evaluacion.getCursoId(), actor);
        if (actor.isStudent() && evaluacion.getEstado() == EstadoEvaluacion.BORRADOR) {
            throw ApiException.noEncontrado("La evaluación no existe");
        }
        return response(evaluacion);
    }

    @Transactional(readOnly = true)
    public List<EvaluacionResponse> listarPorCurso(UUID cursoId, Actor actor) {
        validarAccesoCurso(cursoId, actor);
        return evaluaciones.findByCursoIdOrderByFechaCreacionAsc(cursoId).stream()
                .filter(evaluacion -> !actor.isStudent() || evaluacion.getEstado() != EstadoEvaluacion.BORRADOR)
                .map(this::response)
                .toList();
    }

    @Transactional
    public EvaluacionResponse actualizar(UUID id, EvaluacionRequest request, Actor actor) {
        Evaluacion evaluacion = buscarEvaluacion(id);
        CursoLocal curso = obtenerCurso(evaluacion.getCursoId());
        validarDocenteAdministrador(curso, actor);
        if (evaluacion.getEstado() != EstadoEvaluacion.BORRADOR) {
            throw ApiException.conflicto("TRANSICION_INVALIDA", "Solo se editan evaluaciones en BORRADOR");
        }
        if (!evaluacion.getCursoId().equals(request.cursoId())) {
            throw ApiException.conflicto("TRANSICION_INVALIDA", "No se puede cambiar el curso de una evaluación");
        }
        validarFechas(request.fechaApertura(), request.fechaCierre());
        validarPeso(request.cursoId(), request.peso(), id);
        actualizar(evaluacion, request);
        return response(evaluaciones.save(evaluacion));
    }

    @Transactional
    public EvaluacionResponse publicar(UUID id, Actor actor) {
        Evaluacion evaluacion = buscarEvaluacion(id);
        validarDocenteAdministrador(obtenerCurso(evaluacion.getCursoId()), actor);
        if (evaluacion.getEstado() != EstadoEvaluacion.BORRADOR) {
            throw ApiException.conflicto("TRANSICION_INVALIDA", "Solo se publica una evaluación en BORRADOR");
        }
        evaluacion.setEstado(EstadoEvaluacion.PUBLICADA);
        evaluacion = evaluaciones.save(evaluacion);
        publicarEventoEvaluacion(evaluacion, "evaluacion.publicada");
        return response(evaluacion);
    }

    @Transactional
    public EvaluacionResponse cerrar(UUID id, Actor actor) {
        Evaluacion evaluacion = buscarEvaluacion(id);
        validarDocenteAdministrador(obtenerCurso(evaluacion.getCursoId()), actor);
        if (evaluacion.getEstado() != EstadoEvaluacion.PUBLICADA) {
            throw ApiException.conflicto("TRANSICION_INVALIDA", "Solo se cierra una evaluación PUBLICADA");
        }
        evaluacion.setEstado(EstadoEvaluacion.CERRADA);
        return response(evaluaciones.save(evaluacion));
    }

    @Transactional
    public CalificacionResponse calificar(UUID evaluacionId, CalificacionRequest request, Actor actor) {
        Evaluacion evaluacion = buscarEvaluacion(evaluacionId);
        validarDocenteAdministrador(obtenerCurso(evaluacion.getCursoId()), actor);
        if (evaluacion.getEstado() != EstadoEvaluacion.PUBLICADA) {
            throw ApiException.conflicto("EVALUACION_CERRADA", "La evaluación no está abierta para calificar");
        }
        EstudianteHabilitadoId studentKey = new EstudianteHabilitadoId(evaluacion.getCursoId(), request.estudianteId());
        EstudianteHabilitado estudiante = estudiantes.findById(studentKey)
                .filter(item -> item.getEstado() == EstadoHabilitacion.ACTIVO)
                .orElseThrow(() -> ApiException.conflicto("ESTUDIANTE_NO_HABILITADO",
                        "El estudiante no está habilitado en este curso"));
        if (request.nota().compareTo(BigDecimal.ZERO) < 0 ||
                request.nota().compareTo(evaluacion.getNotaMaxima()) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DATOS_INVALIDOS",
                    "La nota debe estar entre 0 y " + evaluacion.getNotaMaxima());
        }

        Calificacion calificacion = calificaciones
                .findByEvaluacionIdAndEstudianteId(evaluacionId, request.estudianteId())
                .orElseGet(Calificacion::new);
        calificacion.setEvaluacionId(evaluacionId);
        calificacion.setEstudianteId(request.estudianteId());
        calificacion.setNota(request.nota().setScale(1, RoundingMode.HALF_UP));
        calificacion.setRetroalimentacion(request.retroalimentacion());
        calificacion.setCalificadoPor(actor.id());
        calificacion = calificaciones.save(calificacion);
        publicarEventoCalificacion(evaluacion, calificacion);
        return response(calificacion, evaluacion);
    }

    @Transactional(readOnly = true)
    public List<CalificacionResponse> calificacionesEvaluacion(UUID evaluacionId, Actor actor) {
        Evaluacion evaluacion = buscarEvaluacion(evaluacionId);
        validarDocenteAdministrador(obtenerCurso(evaluacion.getCursoId()), actor);
        return calificaciones.findByEvaluacionIdOrderByFechaCalificacionAsc(evaluacionId).stream()
                .map(calificacion -> response(calificacion, evaluacion)).toList();
    }

    @Transactional(readOnly = true)
    public List<CalificacionResponse> calificacionesEstudiante(UUID estudianteId, UUID cursoId, Actor actor) {
        if (actor.isStudent() && !actor.id().equals(estudianteId)) {
            throw ApiException.prohibido("Un estudiante solo puede consultar sus propias calificaciones");
        }
        if (actor.isTeacher()) {
            if (cursoId == null) {
                throw ApiException.prohibido("El docente debe especificar el curso");
            }
            validarDocenteAdministrador(obtenerCurso(cursoId), actor);
        } else if (!actor.isAdmin() && !actor.isStudent()) {
            throw ApiException.prohibido("El rol no puede consultar calificaciones");
        }

        List<Calificacion> notas = calificaciones.findByEstudianteId(estudianteId);
        if (notas.isEmpty()) {
            return List.of();
        }
        Map<UUID, Evaluacion> byId = evaluaciones.findByIdIn(notas.stream()
                        .map(Calificacion::getEvaluacionId).distinct().toList()).stream()
                .collect(Collectors.toMap(Evaluacion::getId, Function.identity()));
        return notas.stream()
                .filter(nota -> byId.containsKey(nota.getEvaluacionId()))
                .map(nota -> Map.entry(nota, byId.get(nota.getEvaluacionId())))
                .filter(entry -> cursoId == null || cursoId.equals(entry.getValue().getCursoId()))
                .filter(entry -> !actor.isStudent() || entry.getValue().getEstado() != EstadoEvaluacion.BORRADOR)
                .map(entry -> response(entry.getKey(), entry.getValue()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NotaFinalResponse> notasFinales(UUID cursoId, Actor actor) {
        validarDocenteAdministrador(obtenerCurso(cursoId), actor);
        return notasFinales.findByIdCursoIdOrderByNotaFinalDesc(cursoId).stream().map(this::response).toList();
    }

    @Transactional
    public void procesarEvento(UUID eventoId, String routingKey, Map<String, Object> payload) {
        if (eventos.existsById(eventoId)) {
            return;
        }
        switch (routingKey) {
            case "acceso.habilitado" -> habilitar(payload);
            case "inscripcion.cancelada" -> retirar(payload);
            case "cursos.evento.creado", "cursos.evento.actualizado", "cursos.evento.estado" -> actualizarCurso(payload);
            case "cursos.evento.cupo" -> { }
            case "cursos.evento.eliminado" -> eliminarCurso(payload);
            default -> throw new IllegalArgumentException("Routing key no soportada: " + routingKey);
        }
        EventoProcesado procesado = new EventoProcesado();
        procesado.setEventoId(eventoId);
        procesado.setFecha(LocalDateTime.now());
        eventos.save(procesado);
    }

    private void habilitar(Map<String, Object> payload) {
        UUID cursoId = uuid(payload, "cursoId");
        UUID estudianteId = uuid(payload, "estudianteId");
        UUID inscripcionId = uuid(payload, "inscripcionId");
        EstudianteHabilitadoId key = new EstudianteHabilitadoId(cursoId, estudianteId);
        EstudianteHabilitado estudiante = estudiantes.findById(key).orElseGet(EstudianteHabilitado::new);
        estudiante.setId(key);
        estudiante.setInscripcionId(inscripcionId);
        estudiante.setEstado(EstadoHabilitacion.ACTIVO);
        estudiante.setFecha(LocalDateTime.now());
        estudiantes.save(estudiante);
    }

    private void retirar(Map<String, Object> payload) {
        UUID cursoId = uuid(payload, "cursoId");
        UUID estudianteId = uuid(payload, "estudianteId");
        EstudianteHabilitadoId key = new EstudianteHabilitadoId(cursoId, estudianteId);
        estudiantes.findById(key).ifPresent(estudiante -> {
            estudiante.setEstado(EstadoHabilitacion.RETIRADO);
            estudiante.setFecha(LocalDateTime.now());
            estudiantes.save(estudiante);
        });
    }

    private void actualizarCurso(Map<String, Object> payload) {
        UUID cursoId = uuid(payload, "cursoId");
        CursoLocal curso = cursos.findById(cursoId).orElseGet(CursoLocal::new);
        curso.setCursoId(cursoId);
        curso.setCodigo(string(payload, "codigoCurso", "codigo"));
        curso.setTitulo(string(payload, "titulo", "tituloCurso"));
        curso.setEstado(string(payload, "estado"));
        curso.setDocenteId(nullableUuid(payload.get("docenteId")));
        cursos.save(curso);
        if ("FINALIZADO".equals(curso.getEstado())) {
            calcularNotasFinales(curso);
        }
    }

    private void eliminarCurso(Map<String, Object> payload) {
        UUID cursoId = uuid(payload, "cursoId");
        cursos.deleteById(cursoId);
    }

    private void calcularNotasFinales(CursoLocal curso) {
        List<Evaluacion> cursoEvaluaciones = evaluaciones.findByCursoIdOrderByFechaCreacionAsc(curso.getCursoId());
        cursoEvaluaciones.forEach(evaluacion -> evaluacion.setEstado(EstadoEvaluacion.CERRADA));
        evaluaciones.saveAll(cursoEvaluaciones);

        for (EstudianteHabilitado estudiante : estudiantes.findByIdCursoIdAndEstado(
                curso.getCursoId(), EstadoHabilitacion.ACTIVO)) {
            UUID estudianteId = estudiante.getId().getEstudianteId();
            NotaFinalId key = new NotaFinalId(curso.getCursoId(), estudianteId);
            if (notasFinales.existsById(key)) {
                continue;
            }
            BigDecimal weighted = BigDecimal.ZERO;
            for (Evaluacion evaluacion : cursoEvaluaciones) {
                Optional<Calificacion> grade = calificaciones
                        .findByEvaluacionIdAndEstudianteId(evaluacion.getId(), estudianteId);
                if (grade.isPresent()) {
                    weighted = weighted.add(grade.get().getNota().multiply(evaluacion.getPeso())
                            .divide(CIEN, 4, RoundingMode.HALF_UP));
                }
            }
            BigDecimal finalGrade = weighted.setScale(1, RoundingMode.HALF_UP);
            NotaFinal nota = new NotaFinal();
            nota.setId(key);
            nota.setNotaFinal(finalGrade);
            nota.setAprobado(finalGrade.compareTo(notaMinima) >= 0);
            nota.setFechaCalculo(LocalDateTime.now());
            notasFinales.save(nota);
            publicarEventoNotaFinal(curso, estudianteId, nota);
        }
    }

    private CursoLocal obtenerCurso(UUID cursoId) {
        return cursos.findById(cursoId).orElseGet(() -> cursoClient.obtenerCurso(cursoId)
                .map(cursos::save)
                .orElseThrow(() -> ApiException.noEncontrado("El curso indicado no existe")));
    }

    private Evaluacion buscarEvaluacion(UUID id) {
        return evaluaciones.findById(id).orElseThrow(() -> ApiException.noEncontrado("La evaluación no existe"));
    }

    private void validarAccesoCurso(UUID cursoId, Actor actor) {
        if (actor.isAdmin()) {
            return;
        }
        CursoLocal curso = obtenerCurso(cursoId);
        if (actor.isTeacher() && actor.id().equals(curso.getDocenteId())) {
            return;
        }
        if (actor.isStudent() && estudiantes.findById(new EstudianteHabilitadoId(cursoId, actor.id()))
                .filter(item -> item.getEstado() == EstadoHabilitacion.ACTIVO).isPresent()) {
            return;
        }
        throw ApiException.prohibido("El usuario no tiene acceso a este curso");
    }

    private void validarDocenteAdministrador(CursoLocal curso, Actor actor) {
        if (actor.isAdmin() || (actor.isTeacher() && actor.id().equals(curso.getDocenteId()))) {
            return;
        }
        if (actor.isStudent()) {
            throw ApiException.prohibido("La operación requiere ser docente del curso o administrador");
        }
        throw ApiException.prohibido("El docente no es responsable de este curso");
    }

    private void exigirAdmin(Actor actor) {
        if (!actor.isAdmin()) {
            throw ApiException.prohibido("La operación requiere rol ADMINISTRADOR");
        }
    }

    private void validarPeso(UUID cursoId, BigDecimal pesoNuevo, UUID excludingId) {
        BigDecimal assigned = evaluaciones.findByCursoIdOrderByFechaCreacionAsc(cursoId).stream()
                .filter(item -> excludingId == null || !item.getId().equals(excludingId))
                .map(Evaluacion::getPeso)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (assigned.add(pesoNuevo).compareTo(CIEN) > 0) {
            throw ApiException.conflicto("PESO_EXCEDIDO", "La suma de los pesos del curso no puede superar 100");
        }
    }

    private void validarFechas(LocalDateTime apertura, LocalDateTime cierre) {
        if (apertura != null && cierre != null && cierre.isBefore(apertura)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DATOS_INVALIDOS",
                    "La fecha de cierre no puede ser anterior a la fecha de apertura");
        }
    }

    private void actualizar(Evaluacion evaluacion, EvaluacionRequest request) {
        evaluacion.setCursoId(request.cursoId());
        evaluacion.setTitulo(request.titulo().trim());
        evaluacion.setDescripcion(request.descripcion());
        evaluacion.setTipo(request.tipo());
        evaluacion.setPeso(request.peso().setScale(2, RoundingMode.HALF_UP));
        evaluacion.setNotaMaxima(request.notaMaxima() == null
                ? BigDecimal.TEN : request.notaMaxima().setScale(2, RoundingMode.HALF_UP));
        evaluacion.setFechaApertura(request.fechaApertura());
        evaluacion.setFechaCierre(request.fechaCierre());
        evaluacion.setModuloId(request.moduloId());
    }

    private void publicarEventoEvaluacion(Evaluacion evaluacion, String routingKey) {
        CursoLocal curso = obtenerCurso(evaluacion.getCursoId());
        Map<String, Object> event = event("EvaluacionPublicada");
        event.put("evaluacionId", evaluacion.getId());
        event.put("cursoId", evaluacion.getCursoId());
        event.put("tituloEvaluacion", evaluacion.getTitulo());
        event.put("fechaCierre", evaluacion.getFechaCierre());
        event.put("codigoCurso", curso.getCodigo());
        event.put("tituloCurso", curso.getTitulo());
        producer.publicar(routingKey, event);
    }

    private void publicarEventoCalificacion(Evaluacion evaluacion, Calificacion calificacion) {
        CursoLocal curso = obtenerCurso(evaluacion.getCursoId());
        Map<String, Object> event = event("EvaluacionCalificada");
        event.put("evaluacionId", evaluacion.getId());
        event.put("estudianteId", calificacion.getEstudianteId());
        event.put("cursoId", evaluacion.getCursoId());
        event.put("tituloEvaluacion", evaluacion.getTitulo());
        event.put("tituloCurso", curso.getTitulo());
        event.put("nota", calificacion.getNota());
        producer.publicar("evaluacion.calificada", event);
    }

    private void publicarEventoNotaFinal(CursoLocal curso, UUID estudianteId, NotaFinal nota) {
        Map<String, Object> event = event("NotaFinalCalculada");
        event.put("cursoId", curso.getCursoId());
        event.put("codigoCurso", curso.getCodigo());
        event.put("tituloCurso", curso.getTitulo());
        event.put("estudianteId", estudianteId);
        event.put("notaFinal", nota.getNotaFinal());
        event.put("aprobado", nota.isAprobado());
        event.put("notaMinima", notaMinima);
        producer.publicar("nota.final.calculada", event);
    }

    private Map<String, Object> event(String type) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("eventoId", UUID.randomUUID());
        event.put("tipoEvento", type);
        event.put("fechaEvento", LocalDateTime.now());
        return event;
    }

    private UUID uuid(Map<String, Object> payload, String field) {
        Object value = payload.get(field);
        if (value == null) {
            throw new IllegalArgumentException("Falta el campo obligatorio " + field);
        }
        return nullableUuid(value);
    }

    private UUID nullableUuid(Object value) {
        if (value == null) {
            return null;
        }
        return UUID.fromString(value.toString());
    }

    private String string(Map<String, Object> payload, String... fields) {
        for (String field : fields) {
            Object value = payload.get(field);
            if (value != null) {
                return value.toString();
            }
        }
        return null;
    }

    private EvaluacionResponse response(Evaluacion e) {
        return new EvaluacionResponse(e.getId(), e.getCursoId(), e.getTitulo(), e.getDescripcion(), e.getTipo(),
                e.getEstado(), e.getPeso(), e.getNotaMaxima(), e.getFechaApertura(), e.getFechaCierre(),
                e.getModuloId(), e.getFechaCreacion());
    }

    private CalificacionResponse response(Calificacion c, Evaluacion e) {
        return new CalificacionResponse(c.getId(), c.getEvaluacionId(), c.getEstudianteId(), e.getCursoId(),
                e.getTitulo(), c.getNota(), c.getRetroalimentacion(), c.getCalificadoPor(), c.getFechaCalificacion());
    }

    private NotaFinalResponse response(NotaFinal n) {
        return new NotaFinalResponse(n.getId().getCursoId(), n.getId().getEstudianteId(),
                n.getNotaFinal(), n.isAprobado(), n.getFechaCalculo());
    }
}
