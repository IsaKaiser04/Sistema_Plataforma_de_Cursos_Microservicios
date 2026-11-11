package com.lms.evaluaciones.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lms.evaluaciones.domain.model.EstadoHabilitacion;
import com.lms.evaluaciones.domain.model.EstudianteHabilitadoId;
import com.lms.evaluaciones.infrastructure.messaging.RabbitMQConfig;
import com.lms.evaluaciones.infrastructure.repositories.CursoLocalRepository;
import com.lms.evaluaciones.infrastructure.repositories.EstudianteHabilitadoRepository;
import com.lms.evaluaciones.infrastructure.repositories.NotaFinalRepository;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.time.LocalDateTime;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class EvaluacionesIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("evaluaciones_it")
            .withUsername("test")
            .withPassword("test");

    @Container
    static final RabbitMQContainer RABBIT = new RabbitMQContainer("rabbitmq:3-management-alpine");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.rabbitmq.host", RABBIT::getHost);
        registry.add("spring.rabbitmq.port", RABBIT::getAmqpPort);
        registry.add("spring.rabbitmq.username", RABBIT::getAdminUsername);
        registry.add("spring.rabbitmq.password", RABBIT::getAdminPassword);
        registry.add("lms.cursos.service-url", () -> "http://127.0.0.1:1");
    }

    @Autowired
    private TestRestTemplate http;

    @Autowired
    private RabbitTemplate rabbit;

    @Autowired
    private RabbitAdmin rabbitAdmin;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CursoLocalRepository cursos;

    @Autowired
    private EstudianteHabilitadoRepository estudiantes;

    @Autowired
    private NotaFinalRepository notasFinales;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @LocalServerPort
    private int port;

    @org.junit.jupiter.api.BeforeEach
    void configureHttpClient() {
        http.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory(HttpClient.newHttpClient()));
    }

    @Test
    void inscriptionEventsApiPermissionsAndFinalGradeWorkTogether() {
        UUID cursoId = UUID.randomUUID();
        UUID docenteId = UUID.randomUUID();
        UUID estudianteId = UUID.randomUUID();
        UUID segundoEstudianteId = UUID.randomUUID();
        UUID inscripcionId = UUID.randomUUID();
        String queue = "test.evaluaciones.events." + UUID.randomUUID();
        Queue observedEvents = new Queue(queue, false, false, false);
        TopicExchange exchange = new TopicExchange(RabbitMQConfig.EXCHANGE_NAME, true, false);
        rabbitAdmin.declareQueue(observedEvents);
        rabbitAdmin.declareExchange(exchange);
        rabbitAdmin.declareBinding(BindingBuilder.bind(observedEvents).to(exchange).with("evaluacion.#"));
        rabbitAdmin.declareBinding(BindingBuilder.bind(observedEvents).to(exchange).with("nota.final.calculada"));

        Integer expectedTables = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name IN ('evaluaciones', 'calificaciones', 'estudiantes_habilitados',
                    'cursos_local', 'notas_finales', 'eventos_procesados')
                """, Integer.class);
        assertThat(expectedTables).isEqualTo(6);

        Map<String, Object> courseCreated = courseEvent(cursoId, docenteId, "Curso de integración",
                "CursoCreado", "PUBLICADO");
        send("cursos.evento.creado", courseCreated);
        await().atMost(Duration.ofSeconds(10)).until(() -> cursos.existsById(cursoId));

        Map<String, Object> accessEnabled = baseEvent("AccesoHabilitado");
        accessEnabled.put("cursoId", cursoId.toString());
        accessEnabled.put("estudianteId", estudianteId.toString());
        accessEnabled.put("inscripcionId", inscripcionId.toString());
        accessEnabled.put("codigoCurso", "IT-01");
        accessEnabled.put("tituloCurso", "Curso de integración");
        send("acceso.habilitado", accessEnabled);
        Map<String, Object> secondAccessEnabled = new LinkedHashMap<>(accessEnabled);
        secondAccessEnabled.put("eventoId", UUID.randomUUID().toString());
        secondAccessEnabled.put("estudianteId", segundoEstudianteId.toString());
        secondAccessEnabled.put("inscripcionId", UUID.randomUUID().toString());
        send("acceso.habilitado", secondAccessEnabled);
        await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                assertThat(estudiantes.findById(new EstudianteHabilitadoId(cursoId, estudianteId)))
                        .get().extracting(item -> item.getEstado()).isEqualTo(EstadoHabilitacion.ACTIVO));
        await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                assertThat(estudiantes.findById(new EstudianteHabilitadoId(cursoId, segundoEstudianteId)))
                        .get().extracting(item -> item.getEstado()).isEqualTo(EstadoHabilitacion.ACTIVO));

        Map<String, Object> evaluationRequest = new LinkedHashMap<>();
        evaluationRequest.put("cursoId", cursoId.toString());
        evaluationRequest.put("titulo", "Evaluación de integración");
        evaluationRequest.put("descripcion", "Recorrido de extremo a extremo");
        evaluationRequest.put("tipo", "EXAMEN");
        evaluationRequest.put("peso", 100);
        evaluationRequest.put("fechaApertura", LocalDateTime.now().minusMinutes(1).toString());
        evaluationRequest.put("fechaCierre", LocalDateTime.now().plusDays(1).toString());
        HttpHeaders teacherHeaders = headers(docenteId, "DOCENTE");

        Map<String, Object> invalidEvaluation = new HashMap<>(evaluationRequest);
        invalidEvaluation.put("titulo", "");
        ResponseEntity<JsonNode> invalidResponse = http.exchange(url("/api/v1/evaluaciones"),
                HttpMethod.POST, new HttpEntity<>(invalidEvaluation, teacherHeaders), JsonNode.class);
        assertThat(invalidResponse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(invalidResponse.getBody().get("error").asText()).isEqualTo("DATOS_INVALIDOS");
        assertThat(invalidResponse.getBody().get("ruta").asText()).isEqualTo("/api/v1/evaluaciones");

        ResponseEntity<JsonNode> createdResponse = http.exchange(url("/api/v1/evaluaciones"),
                HttpMethod.POST, new HttpEntity<>(evaluationRequest, teacherHeaders), JsonNode.class);
        assertThat(createdResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID evaluationId = UUID.fromString(createdResponse.getBody().get("id").asText());

        ResponseEntity<JsonNode> getResponse = http.exchange(url("/api/v1/evaluaciones/" + evaluationId),
                HttpMethod.GET, new HttpEntity<>(teacherHeaders), JsonNode.class);
        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        Map<String, Object> updateRequest = new HashMap<>(evaluationRequest);
        updateRequest.put("titulo", "Evaluación integrada");
        ResponseEntity<JsonNode> updateResponse = http.exchange(url("/api/v1/evaluaciones/" + evaluationId),
                HttpMethod.PUT, new HttpEntity<>(updateRequest, teacherHeaders), JsonNode.class);
        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        Map<String, Object> overweight = new HashMap<>(evaluationRequest);
        overweight.put("peso", 1);
        ResponseEntity<JsonNode> overweightResponse = http.exchange(url("/api/v1/evaluaciones"),
                HttpMethod.POST, new HttpEntity<>(overweight, teacherHeaders), JsonNode.class);
        assertThat(overweightResponse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(overweightResponse.getBody().get("error").asText()).isEqualTo("PESO_EXCEDIDO");

        ResponseEntity<JsonNode> published = http.exchange(url("/api/v1/evaluaciones/" + evaluationId + "/publicar"),
                HttpMethod.PATCH, new HttpEntity<>(teacherHeaders), JsonNode.class);
        assertThat(published.getStatusCode()).isEqualTo(HttpStatus.OK);

        Map<String, Object> unenabledGrade = Map.of(
                "estudianteId", UUID.randomUUID().toString(),
                "nota", 8.5
        );
        ResponseEntity<JsonNode> rejectedGrade = http.exchange(
                url("/api/v1/evaluaciones/" + evaluationId + "/calificaciones"),
                HttpMethod.POST, new HttpEntity<>(unenabledGrade, teacherHeaders), JsonNode.class);
        assertThat(rejectedGrade.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(rejectedGrade.getBody().get("error").asText()).isEqualTo("ESTUDIANTE_NO_HABILITADO");

        Map<String, Object> gradeRequest = Map.of(
                "estudianteId", estudianteId.toString(),
                "nota", 8.5,
                "retroalimentacion", "Prueba de integración correcta"
        );
        ResponseEntity<JsonNode> gradeResponse = http.exchange(
                url("/api/v1/evaluaciones/" + evaluationId + "/calificaciones"),
                HttpMethod.POST, new HttpEntity<>(gradeRequest, teacherHeaders), JsonNode.class);
        assertThat(gradeResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> secondGradeRequest = Map.of(
                "estudianteId", segundoEstudianteId.toString(),
                "nota", 5.0,
                "retroalimentacion", "Debe reforzar los contenidos"
        );
        ResponseEntity<JsonNode> secondGradeResponse = http.exchange(
                url("/api/v1/evaluaciones/" + evaluationId + "/calificaciones"),
                HttpMethod.POST, new HttpEntity<>(secondGradeRequest, teacherHeaders), JsonNode.class);
        assertThat(secondGradeResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        HttpHeaders studentHeaders = headers(estudianteId, "ESTUDIANTE");
        ResponseEntity<List<JsonNode>> ownGrades = http.exchange(
                url("/api/v1/calificaciones/estudiante/" + estudianteId + "?cursoId=" + cursoId),
                HttpMethod.GET, new HttpEntity<>(studentHeaders),
                new ParameterizedTypeReference<>() {});
        assertThat(ownGrades.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(ownGrades.getBody()).hasSize(1);

        ResponseEntity<JsonNode> forbiddenGrades = http.exchange(
                url("/api/v1/calificaciones/estudiante/" + UUID.randomUUID()),
                HttpMethod.GET, new HttpEntity<>(studentHeaders), JsonNode.class);
        assertThat(forbiddenGrades.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        Map<String, Object> courseFinished = courseEvent(cursoId, docenteId, "Curso de integración",
                "EstadoCursoCambiado", "FINALIZADO");
        send("cursos.evento.estado", courseFinished);
        await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                assertThat(notasFinales.findAll()).hasSize(2));
        send("cursos.evento.estado", courseFinished);

        ResponseEntity<List<JsonNode>> finalGrades = http.exchange(
                url("/api/v1/calificaciones/curso/" + cursoId + "/final"),
                HttpMethod.GET, new HttpEntity<>(teacherHeaders),
                new ParameterizedTypeReference<>() {});
        assertThat(finalGrades.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(finalGrades.getBody()).hasSize(2);
        assertThat(finalGrades.getBody().get(0).get("notaFinal").decimalValue()).isEqualByComparingTo("8.5");
        assertThat(finalGrades.getBody().get(0).get("aprobado").asBoolean()).isTrue();
        assertThat(finalGrades.getBody().get(1).get("notaFinal").decimalValue()).isEqualByComparingTo("5.0");
        assertThat(finalGrades.getBody().get(1).get("aprobado").asBoolean()).isFalse();

        List<JsonNode> publishedEvents = new ArrayList<>();
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
            while (publishedEvents.size() < 5) {
                JsonNode event = receive(queue);
                if (event != null) {
                    publishedEvents.add(event);
                }
            }
            assertThat(publishedEvents).hasSize(5);
        });
        assertThat(publishedEvents).extracting(event -> event.get("tipoEvento").asText())
                .containsExactlyInAnyOrder("EvaluacionPublicada", "EvaluacionCalificada",
                        "EvaluacionCalificada", "NotaFinalCalculada", "NotaFinalCalculada");
        assertThat(publishedEvents.stream()
                .filter(event -> "NotaFinalCalculada".equals(event.get("tipoEvento").asText()))
                .map(event -> event.get("aprobado").asBoolean()).toList()).containsExactlyInAnyOrder(true, false);
        assertThat(notasFinales.findAll()).hasSize(2);
    }

    @Test
    void malformedEventIsRejectedIntoDeadLetterQueue() {
        Message malformed = MessageBuilder.withBody("not-json".getBytes(StandardCharsets.UTF_8))
                .setContentType("application/json")
                .build();
        rabbit.send(RabbitMQConfig.EXCHANGE_NAME, "cursos.evento.creado", malformed);

        AtomicReference<Message> deadLetter = new AtomicReference<>();
        await().atMost(Duration.ofSeconds(15)).until(() -> {
            Message received = rabbit.receive(RabbitMQConfig.DEAD_LETTER_QUEUE, 250);
            if (received != null) {
                deadLetter.set(received);
            }
            return deadLetter.get() != null;
        });
        assertThat(new String(deadLetter.get().getBody(), StandardCharsets.UTF_8)).isEqualTo("not-json");
        assertThat(deadLetter.get().getMessageProperties().getReceivedRoutingKey())
                .isEqualTo(RabbitMQConfig.DEAD_LETTER_QUEUE);
    }

    private JsonNode receive(String queue) {
        Object event = rabbit.receiveAndConvert(queue, 250);
        return event == null ? null : objectMapper.valueToTree(event);
    }

    private void send(String routingKey, Map<String, Object> payload) {
        rabbit.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, routingKey, payload);
    }

    private Map<String, Object> courseEvent(UUID courseId, UUID teacherId, String title,
                                            String eventType, String status) {
        Map<String, Object> payload = baseEvent(eventType);
        payload.put("cursoId", courseId.toString());
        payload.put("codigoCurso", "IT-01");
        payload.put("titulo", title);
        payload.put("docenteId", teacherId.toString());
        payload.put("estado", status);
        payload.put("cuposDisponibles", 20);
        payload.put("precio", 0);
        return payload;
    }

    private Map<String, Object> baseEvent(String eventType) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventoId", UUID.randomUUID().toString());
        payload.put("tipoEvento", eventType);
        payload.put("fechaEvento", LocalDateTime.now().toString());
        return payload;
    }

    private HttpHeaders headers(UUID userId, String role) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-User-Id", userId.toString());
        headers.set("X-User-Rol", role);
        return headers;
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }
}
