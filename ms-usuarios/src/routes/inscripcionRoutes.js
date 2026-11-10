const express = require('express');
const router = express.Router();
const { inscribirEstudiante, listarInscritosPorCurso } = require('../controllers/inscripcionController');
const { verificarRol } = require('../middlewares/authMiddleware'); // El archivo que creamos antes

// Solo el estudiante puede inscribirse a un curso
router.post('/', verificarRol(['Estudiante']), inscribirEstudiante);

// Solo el administrador puede ver la lista de estudiantes de un curso
router.get('/curso/:curso_id', verificarRol(['Administrador']), listarInscritosPorCurso);

module.exports = router;