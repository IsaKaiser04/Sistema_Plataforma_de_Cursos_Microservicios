package com.lms.evaluaciones.application;

import com.lms.evaluaciones.api.dto.EvaluacionRequest;
import com.lms.evaluaciones.core.Actor;
import com.lms.evaluaciones.core.ApiException;
import com.lms.evaluaciones.domain.model.*;
import com.lms.evaluaciones.infrastructure.client.CursoClient;
import com.lms.evaluaciones.infrastructure.messaging.EvaluacionProducer;
import com.lms.evaluaciones.infrastructure.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class EvaluacionServiceTest {
    private EvaluacionRepository evaluaciones;
    private CalificacionRepository calificaciones;
    private EntregaEvaluacionRepository entregas;
    private EstudianteHabilitadoRepository estudiantes;
    private CursoLocalRepository cursos;
    private NotaFinalRepository notasFinales;
    private EventoProcesadoRepository eventos;
    private CursoClient cursoClient;
    private EvaluacionProducer producer;
    private EvaluacionService service;

    @BeforeEach
    void setUp() {
        evaluaciones = mock(EvaluacionRepository.class);
        calificaciones = mock(CalificacionRepository.class);
        entregas = mock(EntregaEvaluacionRepository.class);
        estudiantes = mock(EstudianteHabilitadoRepository.class);
        cursos = mock(CursoLocalRepository.class);
        notasFinales = mock(NotaFinalRepository.class);
        eventos = mock(EventoProcesadoRepository.class);
        cursoClient = mock(CursoClient.class);
        producer = mock(EvaluacionProducer.class);
        service = new EvaluacionService(evaluaciones, calificaciones, entregas, estudiantes, cursos,
                notasFinales, eventos, cursoClient, producer, new BigDecimal("7.0"));
    }

    @Test
    void rechazaUnaSumaDePesosSuperiorACien() {
        UUID cursoId = UUID.randomUUID();
        CursoLocal curso = curso(cursoId);
        Evaluacion existente = evaluacion(UUID.randomUUID(), cursoId, "80");
        when(cursos.findById(cursoId)).thenReturn(Optional.of(curso));
        when(evaluaciones.findByCursoIdOrderByFechaCreacionAsc(cursoId)).thenReturn(List.of(existente));

        assertThatThrownBy(() -> service.crear(request(cursoId, "30"), teacher(curso.getDocenteId())))
                .isInstanceOf(ApiException.class)
                .satisfies(error -> assertThat(((ApiException) error).getCodigo()).isEqualTo("PESO_EXCEDIDO"));

        verify(evaluaciones, never()).save(any());
    }

    @Test
    void noCreaEvaluacionSiElCursoNoExisteEnLaCopiaNiEnCursos() {
        UUID cursoId = UUID.randomUUID();
        when(cursos.findById(cursoId)).thenReturn(Optional.empty());
        when(cursoClient.obtenerCurso(cursoId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.crear(request(cursoId, "30"), teacher(UUID.randomUUID())))
                .isInstanceOf(ApiException.class)
                .satisfies(error -> assertThat(((ApiException) error).getStatus().value()).isEqualTo(404));

        verify(evaluaciones, never()).save(any());
    }

    @Test
    void impideCalificarAUnEstudianteNoHabilitado() {
        UUID cursoId = UUID.randomUUID();
        UUID evaluacionId = UUID.randomUUID();
        UUID estudianteId = UUID.randomUUID();
        CursoLocal curso = curso(cursoId);
        Evaluacion evaluacion = evaluacion(evaluacionId, cursoId, "100");
        evaluacion.setEstado(EstadoEvaluacion.PUBLICADA);
        when(evaluaciones.findById(evaluacionId)).thenReturn(Optional.of(evaluacion));
        when(cursos.findById(cursoId)).thenReturn(Optional.of(curso));
        when(estudiantes.findById(new EstudianteHabilitadoId(cursoId, estudianteId))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.calificar(evaluacionId,
                new com.lms.evaluaciones.api.dto.CalificacionRequest(estudianteId, new BigDecimal("8"), null),
                teacher(curso.getDocenteId())))
                .isInstanceOf(ApiException.class)
                .satisfies(error -> assertThat(((ApiException) error).getCodigo())
                        .isEqualTo("ESTUDIANTE_NO_HABILITADO"));

        verify(calificaciones, never()).save(any());
    }

    @Test
    void estudianteSoloConsultaSuPropiaNotaFinalSiSigueHabilitado() {
        UUID cursoId = UUID.randomUUID();
        UUID estudianteId = UUID.randomUUID();
        NotaFinalId notaId = new NotaFinalId(cursoId, estudianteId);
        NotaFinal nota = new NotaFinal();
        nota.setId(notaId);
        nota.setNotaFinal(new BigDecimal("8.5"));
        nota.setAprobado(true);
        EstudianteHabilitado habilitado = new EstudianteHabilitado();
        habilitado.setId(new EstudianteHabilitadoId(cursoId, estudianteId));
        habilitado.setEstado(EstadoHabilitacion.ACTIVO);
        CursoLocal curso = curso(cursoId);
        curso.setEstado("FINALIZADO");

        when(cursos.findById(cursoId)).thenReturn(Optional.of(curso));
        when(estudiantes.findById(habilitado.getId())).thenReturn(Optional.of(habilitado));
        when(notasFinales.findById(notaId)).thenReturn(Optional.of(nota));

        assertThat(service.notasFinales(cursoId, new Actor(estudianteId, "ESTUDIANTE")))
                .extracting("notaFinal")
                .containsExactly(new BigDecimal("8.5"));
        verify(notasFinales, never()).findByIdCursoIdOrderByNotaFinalDesc(cursoId);
    }

    @Test
    void impideQueEstudianteConsulteNotaFinalAntesDeFinalizarElCurso() {
        UUID cursoId = UUID.randomUUID();
        UUID estudianteId = UUID.randomUUID();
        EstudianteHabilitadoId key = new EstudianteHabilitadoId(cursoId, estudianteId);
        EstudianteHabilitado habilitado = new EstudianteHabilitado();
        habilitado.setId(key);
        habilitado.setEstado(EstadoHabilitacion.ACTIVO);
        when(cursos.findById(cursoId)).thenReturn(Optional.of(curso(cursoId)));
        when(estudiantes.findById(key)).thenReturn(Optional.of(habilitado));

        assertThatThrownBy(() -> service.notasFinales(cursoId, new Actor(estudianteId, "ESTUDIANTE")))
                .isInstanceOf(ApiException.class)
                .satisfies(error -> assertThat(((ApiException) error).getStatus().value()).isEqualTo(403));
        verify(notasFinales, never()).findById(any());
    }

    @Test
    void impideQueEstudianteRetiradoConsulteLaNotaFinal() {
        UUID cursoId = UUID.randomUUID();
        UUID estudianteId = UUID.randomUUID();
        EstudianteHabilitado retirado = new EstudianteHabilitado();
        retirado.setId(new EstudianteHabilitadoId(cursoId, estudianteId));
        retirado.setEstado(EstadoHabilitacion.RETIRADO);
        when(cursos.findById(cursoId)).thenReturn(Optional.of(curso(cursoId)));
        when(estudiantes.findById(retirado.getId())).thenReturn(Optional.of(retirado));

        assertThatThrownBy(() -> service.notasFinales(cursoId, new Actor(estudianteId, "ESTUDIANTE")))
                .isInstanceOf(ApiException.class)
                .satisfies(error -> assertThat(((ApiException) error).getStatus().value()).isEqualTo(403));
        verify(notasFinales, never()).findById(any());
    }

    @Test
    void calculaNotaPonderadaYNoLaRecalculaSiYaExiste() {
        UUID cursoId = UUID.randomUUID();
        UUID estudianteId = UUID.randomUUID();
        CursoLocal curso = curso(cursoId);
        Evaluacion evaluacionConNota = evaluacion(UUID.randomUUID(), cursoId, "60");
        Evaluacion evaluacionSinNota = evaluacion(UUID.randomUUID(), cursoId, "40");
        EstudianteHabilitado estudiante = new EstudianteHabilitado();
        estudiante.setId(new EstudianteHabilitadoId(cursoId, estudianteId));
        estudiante.setEstado(EstadoHabilitacion.ACTIVO);
        Calificacion nota = new Calificacion();
        nota.setNota(new BigDecimal("8.0"));
        NotaFinalId notaId = new NotaFinalId(cursoId, estudianteId);

        when(eventos.existsById(any())).thenReturn(false, false);
        when(cursos.findById(cursoId)).thenReturn(Optional.of(curso));
        when(evaluaciones.findByCursoIdOrderByFechaCreacionAsc(cursoId))
                .thenReturn(List.of(evaluacionConNota, evaluacionSinNota));
        when(estudiantes.findByIdCursoIdAndEstado(cursoId, EstadoHabilitacion.ACTIVO))
                .thenReturn(List.of(estudiante));
        when(calificaciones.findByEvaluacionIdAndEstudianteId(evaluacionConNota.getId(), estudianteId))
                .thenReturn(Optional.of(nota));
        when(calificaciones.findByEvaluacionIdAndEstudianteId(evaluacionSinNota.getId(), estudianteId))
                .thenReturn(Optional.empty());
        when(notasFinales.existsById(notaId)).thenReturn(false, true);

        service.procesarEvento(UUID.randomUUID(), "cursos.evento.estado",
                Map.of("cursoId", cursoId.toString(), "estado", "FINALIZADO"));
        service.procesarEvento(UUID.randomUUID(), "cursos.evento.estado",
                Map.of("cursoId", cursoId.toString(), "estado", "FINALIZADO"));

        org.mockito.ArgumentCaptor<NotaFinal> captor = org.mockito.ArgumentCaptor.forClass(NotaFinal.class);
        verify(notasFinales, times(1)).save(captor.capture());
        assertThat(captor.getValue().getNotaFinal()).isEqualByComparingTo("4.8");
        assertThat(captor.getValue().isAprobado()).isFalse();
        verify(producer, times(1)).publicar(eq("nota.final.calculada"), anyMap());
    }

    private static EvaluacionRequest request(UUID cursoId, String peso) {
        return new EvaluacionRequest(cursoId, "Parcial", "Descripción", TipoEvaluacion.EXAMEN,
                new BigDecimal(peso), null, LocalDateTime.now(), LocalDateTime.now().plusDays(1), null,
                List.of(new com.lms.evaluaciones.api.dto.PreguntaInput("Explique su respuesta", 1)));
    }

    private static Evaluacion evaluacion(UUID id, UUID cursoId, String peso) {
        Evaluacion evaluacion = new Evaluacion();
        evaluacion.setId(id);
        evaluacion.setCursoId(cursoId);
        evaluacion.setTitulo("Prueba");
        evaluacion.setTipo(TipoEvaluacion.EXAMEN);
        evaluacion.setEstado(EstadoEvaluacion.BORRADOR);
        evaluacion.setPeso(new BigDecimal(peso));
        evaluacion.setNotaMaxima(BigDecimal.TEN);
        evaluacion.setFechaCreacion(LocalDateTime.now());
        return evaluacion;
    }

    private static CursoLocal curso(UUID id) {
        CursoLocal curso = new CursoLocal();
        curso.setCursoId(id);
        curso.setDocenteId(UUID.randomUUID());
        curso.setTitulo("Curso");
        curso.setCodigo("LMS-01");
        curso.setEstado("EN_CURSO");
        return curso;
    }

    private static Actor teacher(UUID id) {
        return new Actor(id, "DOCENTE");
    }
}
