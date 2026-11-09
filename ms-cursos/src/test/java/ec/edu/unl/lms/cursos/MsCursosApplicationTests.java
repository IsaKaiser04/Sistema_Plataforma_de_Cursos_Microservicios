package ec.edu.unl.lms.cursos;

import ec.edu.unl.lms.cursos.domain.model.Curso;
import ec.edu.unl.lms.cursos.domain.model.EstadoCurso;
import ec.edu.unl.lms.cursos.domain.model.NivelCurso;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class MsCursosApplicationTests {

    @Test
    void descontarCupoActualizaDisponibilidadCorrectamente() {
        Curso curso = new Curso();
        curso.setCodigo("TEST-101");
        curso.setTitulo("Curso de Prueba");
        curso.setCategoria("Computacion");
        curso.setNivel(NivelCurso.BASICO);
        curso.setEstado(EstadoCurso.PUBLICADO);
        curso.setDocenteId(UUID.randomUUID());
        curso.setCupoMaximo(2);
        curso.setCuposDisponibles(2);
        curso.setDuracionHoras(20);
        curso.setPrecio(BigDecimal.ZERO);

        assertTrue(curso.estaActivoParaInscripcion());
        curso.descontarCupo();
        assertEquals(1, curso.getCuposDisponibles());
        curso.descontarCupo();
        assertEquals(0, curso.getCuposDisponibles());
        assertFalse(curso.estaActivoParaInscripcion());
    }
}
