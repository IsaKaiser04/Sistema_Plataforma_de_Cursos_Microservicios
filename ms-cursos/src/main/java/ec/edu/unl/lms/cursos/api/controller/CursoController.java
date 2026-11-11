package ec.edu.unl.lms.cursos.api.controller;

import ec.edu.unl.lms.cursos.application.dto.*;
import ec.edu.unl.lms.cursos.application.service.CursoService;
import ec.edu.unl.lms.cursos.domain.model.EstadoCurso;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cursos")
@Tag(name = "Cursos", description = "Endpoints REST para gestion de cursos, modulos y validacion de catalogo")
public class CursoController {

    private final CursoService cursoService;

    public CursoController(CursoService cursoService) {
        this.cursoService = cursoService;
    }

    @PostMapping
    @Operation(summary = "Crear un nuevo curso")
    public ResponseEntity<CursoResponse> crearCurso(@Valid @RequestBody CursoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cursoService.crearCurso(request));
    }

    @GetMapping
    @Operation(summary = "Listar cursos")
    public ResponseEntity<List<CursoResponse>> listarCursos(
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) EstadoCurso estado) {
        return ResponseEntity.ok(cursoService.listarTodos(categoria, estado));
    }

    @GetMapping("/activos")
    @Operation(summary = "Catalogo de cursos activos")
    public ResponseEntity<List<CursoResponse>> listarCursosActivos() {
        return ResponseEntity.ok(cursoService.listarCursosActivosParaCatalogo());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener curso por UUID")
    public ResponseEntity<CursoResponse> obtenerPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(cursoService.obtenerPorId(id));
    }

    @GetMapping("/codigo/{codigo}")
    @Operation(summary = "Obtener curso por codigo unico")
    public ResponseEntity<CursoResponse> obtenerPorCodigo(@PathVariable String codigo) {
        return ResponseEntity.ok(cursoService.obtenerPorCodigo(codigo));
    }

    @GetMapping("/docente/{docenteId}")
    @Operation(summary = "Listar cursos asignados a un docente (por UUID)")
    public ResponseEntity<List<CursoResponse>> listarPorDocente(@PathVariable UUID docenteId) {
        return ResponseEntity.ok(cursoService.listarPorDocente(docenteId));
    }

    @GetMapping("/{id}/validar")
    @Operation(summary = "Validar existencia y cupos de un curso")
    public ResponseEntity<ValidacionCursoResponse> validarCurso(@PathVariable UUID id) {
        return ResponseEntity.ok(cursoService.validarDisponibilidadCurso(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar datos de un curso")
    public ResponseEntity<CursoResponse> actualizarCurso(
            @PathVariable UUID id,
            @Valid @RequestBody CursoRequest request) {
        return ResponseEntity.ok(cursoService.actualizarCurso(id, request));
    }

    @PatchMapping("/{id}/estado")
    @Operation(summary = "Cambiar el estado de un curso segun las transiciones permitidas")
    public ResponseEntity<CursoResponse> cambiarEstado(
            @PathVariable UUID id,
            @RequestParam EstadoCurso estado) {
        return ResponseEntity.ok(cursoService.cambiarEstado(id, estado));
    }

    @PostMapping("/{id}/modulos")
    @Operation(summary = "Agregar un modulo tematico a un curso")
    public ResponseEntity<ModuloResponse> agregarModulo(
            @PathVariable UUID id,
            @Valid @RequestBody ModuloRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cursoService.agregarModulo(id, request));
    }

    @PutMapping("/{id}/modulos/{moduloId}")
    @Operation(summary = "Editar un modulo existente de un curso")
    public ResponseEntity<ModuloResponse> actualizarModulo(
            @PathVariable UUID id,
            @PathVariable UUID moduloId,
            @Valid @RequestBody ModuloRequest request) {
        return ResponseEntity.ok(cursoService.actualizarModulo(id, moduloId, request));
    }

    @DeleteMapping("/{id}/modulos/{moduloId}")
    @Operation(summary = "Eliminar un modulo de un curso")
    public ResponseEntity<Void> eliminarModulo(
            @PathVariable UUID id,
            @PathVariable UUID moduloId) {
        cursoService.eliminarModulo(id, moduloId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar un curso (solo en estado BORRADOR)")
    public ResponseEntity<Void> eliminarCurso(@PathVariable UUID id) {
        cursoService.eliminarCurso(id);
        return ResponseEntity.noContent().build();
    }
}
