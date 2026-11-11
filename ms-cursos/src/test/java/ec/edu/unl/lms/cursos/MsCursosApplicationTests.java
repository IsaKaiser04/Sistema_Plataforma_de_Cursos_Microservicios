package ec.edu.unl.lms.cursos;

import ec.edu.unl.lms.cursos.application.service.impl.CursoServiceImpl;
import ec.edu.unl.lms.cursos.domain.exception.BusinessRuleException;
import ec.edu.unl.lms.cursos.domain.model.*;
import ec.edu.unl.lms.cursos.infrastructure.external_clients.UsuarioClient;
import ec.edu.unl.lms.cursos.infrastructure.messaging.CursoEventPublisher;
import ec.edu.unl.lms.cursos.infrastructure.messaging.event.AccesoHabilitadoEvent;
import ec.edu.unl.lms.cursos.infrastructure.messaging.event.InscripcionRechazadaEvent;
import ec.edu.unl.lms.cursos.infrastructure.repository.CursoRepository;
import ec.edu.unl.lms.cursos.infrastructure.repository.ReservaCupoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MsCursosApplicationTests {

    @Mock
    private CursoRepository cursoRepository;
    @Mock
    private ReservaCupoRepository reservaCupoRepository;
    @Mock
    private CursoEventPublisher eventPublisher;
    @Mock
    private UsuarioClient usuarioClient;

    private CursoServiceImpl cursoService;

    @BeforeEach
    void setUp() {
        cursoService = new CursoServiceImpl(cursoRepository, reservaCupoRepository, eventPublisher, usuarioClient);
    }

    private Curso crearCursoPrueba(EstadoCurso estado, int cupos) {
        Curso c = new Curso();
        c.setId(UUID.randomUUID());
        c.setCodigo("SD-2026-01");
        c.setTitulo("Sistemas Distribuidos");
        c.setCategoria("Computacion");
        c.setNivel(NivelCurso.AVANZADO);
        c.setEstado(estado);
        c.setDocenteId(UUID.randomUUID());
        c.setCupoMaximo(cupos);
        c.setCuposDisponibles(cupos);
        c.setDuracionHoras(40);
        c.setPrecio(BigDecimal.ZERO);
        return c;
    }

    @Test
    void T5_transicionInvalidaBorradorAFinalizadoLanzaExcepcion409() {
        Curso curso = crearCursoPrueba(EstadoCurso.BORRADOR, 10);
        when(cursoRepository.findById(curso.getId())).thenReturn(Optional.of(curso));

        BusinessRuleException ex = assertThrows(BusinessRuleException.class, () ->
                cursoService.cambiarEstado(curso.getId(), EstadoCurso.FINALIZADO)
        );
        assertEquals("TRANSICION_INVALIDA", ex.getCodigoError());
    }

    @Test
    void T2_cursoConUnCupoHabilitaElPrimeroYRechazaElSegundo() {
        Curso curso = crearCursoPrueba(EstadoCurso.PUBLICADO, 1);
        UUID insc1 = UUID.randomUUID();
        UUID insc2 = UUID.randomUUID();
        UUID est1 = UUID.randomUUID();
        UUID est2 = UUID.randomUUID();

        when(reservaCupoRepository.existsById(insc1)).thenReturn(false);
        when(reservaCupoRepository.existsById(insc2)).thenReturn(false);
        when(cursoRepository.findById(curso.getId())).thenReturn(Optional.of(curso));
        when(cursoRepository.save(any(Curso.class))).thenAnswer(inv -> inv.getArgument(0));

        // 1ra inscripcion -> habilita acceso y deja cuposDisponibles en 0
        cursoService.procesarReservaCupoPorInscripcion(curso.getId(), insc1, est1);
        assertEquals(0, curso.getCuposDisponibles());
        verify(eventPublisher, times(1)).publicarAccesoHabilitado(any(AccesoHabilitadoEvent.class));

        // 2da inscripcion -> cupo agotado -> publica inscripcion.rechazada
        cursoService.procesarReservaCupoPorInscripcion(curso.getId(), insc2, est2);
        ArgumentCaptor<InscripcionRechazadaEvent> captor = ArgumentCaptor.forClass(InscripcionRechazadaEvent.class);
        verify(eventPublisher, times(1)).publicarInscripcionRechazada(captor.capture());
        assertEquals("CUPO_AGOTADO", captor.getValue().motivo());
    }

    @Test
    void T2_idempotenciaReservaNoDescuentaDosVeces() {
        Curso curso = crearCursoPrueba(EstadoCurso.PUBLICADO, 5);
        UUID inscId = UUID.randomUUID();

        when(reservaCupoRepository.existsById(inscId)).thenReturn(true);
        cursoService.procesarReservaCupoPorInscripcion(curso.getId(), inscId, UUID.randomUUID());

        assertEquals(5, curso.getCuposDisponibles());
        verify(cursoRepository, never()).save(any());
    }

    @Test
    void T3_cancelarInscripcionLiberaCupoSoloUnaVez() {
        Curso curso = crearCursoPrueba(EstadoCurso.PUBLICADO, 10);
        curso.setCuposDisponibles(9);
        UUID inscId = UUID.randomUUID();
        ReservaCupo reserva = new ReservaCupo(inscId, curso.getId(), UUID.randomUUID(), EstadoReserva.RESERVADO, LocalDateTime.now());

        when(reservaCupoRepository.findById(inscId)).thenReturn(Optional.of(reserva));
        when(cursoRepository.findById(curso.getId())).thenReturn(Optional.of(curso));
        when(cursoRepository.save(any(Curso.class))).thenAnswer(inv -> inv.getArgument(0));

        // Primera cancelacion -> sube cupo a 10 y pasa a LIBERADO
        cursoService.procesarCancelacionInscripcion(curso.getId(), inscId, reserva.getEstudianteId());
        assertEquals(10, curso.getCuposDisponibles());
        assertEquals(EstadoReserva.LIBERADO, reserva.getEstado());

        // Segunda cancelacion repetida -> no vuelve a subir
        cursoService.procesarCancelacionInscripcion(curso.getId(), inscId, reserva.getEstudianteId());
        assertEquals(10, curso.getCuposDisponibles());
    }
}
