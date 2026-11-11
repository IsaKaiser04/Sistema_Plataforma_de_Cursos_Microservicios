const express = require('express');
const inscripcionController = require('../controllers/inscripcionController');
const { leerUsuario, permitirRoles } = require('../middlewares/usuarioCabeceras');

const router = express.Router();

router.use(leerUsuario);

router.post('/', permitirRoles(['ESTUDIANTE']), inscripcionController.crear);
router.get('/mias', permitirRoles(['ESTUDIANTE']), inscripcionController.mias);
router.get('/curso/:cursoId', permitirRoles(['DOCENTE', 'ADMINISTRADOR']), inscripcionController.porCurso);
// Dueño o administrador: se revisa en el servicio
router.get('/:id', inscripcionController.obtener);
router.patch('/:id/cancelar', inscripcionController.cancelar);

module.exports = router;
