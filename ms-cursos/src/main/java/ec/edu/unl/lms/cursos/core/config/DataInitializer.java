package ec.edu.unl.lms.cursos.core.config;

import ec.edu.unl.lms.cursos.domain.model.Curso;
import ec.edu.unl.lms.cursos.domain.model.EstadoCurso;
import ec.edu.unl.lms.cursos.domain.model.Modulo;
import ec.edu.unl.lms.cursos.domain.model.NivelCurso;
import ec.edu.unl.lms.cursos.infrastructure.repository.CursoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.util.UUID;

@Configuration
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Bean
    public CommandLineRunner initDatabase(CursoRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                UUID docenteDemoId = UUID.fromString("11111111-2222-3333-4444-555555555555");

                Curso c1 = new Curso();
                c1.setCodigo("SD-2026-01");
                c1.setTitulo("Arquitectura de Microservicios con Spring Boot y RabbitMQ");
                c1.setDescripcion("Curso practico de Sistemas Distribuidos: DDD, Database-per-Service, API Gateway con GraphQL y mensajeria AMQP.");
                c1.setCategoria("Sistemas Distribuidos");
                c1.setNivel(NivelCurso.AVANZADO);
                c1.setEstado(EstadoCurso.PUBLICADO);
                c1.setDocenteId(docenteDemoId);
                c1.setCupoMaximo(40);
                c1.setCuposDisponibles(40);
                c1.setDuracionHoras(64);
                c1.setPrecio(new BigDecimal("0.00"));

                Modulo m1 = new Modulo();
                m1.setOrden(1);
                m1.setTitulo("Fundamentos de DDD y Bounded Contexts");
                m1.setDescripcion("Descomposicion del dominio monolitico LMS en microservicios autonomos.");
                m1.setDuracionMinutos(120);
                m1.setRecursoUrl("https://unl.edu.ec/lms/recursos/ddd-intro.pdf");
                c1.agregarModulo(m1);

                Modulo m2 = new Modulo();
                m2.setOrden(2);
                m2.setTitulo("Mensajeria Asincrona con RabbitMQ");
                m2.setDescripcion("Exchanges, colas durables, bindings y patrones Event-Driven.");
                m2.setDuracionMinutos(180);
                m2.setRecursoUrl("https://unl.edu.ec/lms/recursos/rabbitmq-amqp.pdf");
                c1.agregarModulo(m2);

                repository.save(c1);
                log.info("Curso semilla cargado: {} (ID={})", c1.getCodigo(), c1.getId());
            }
        };
    }
}
