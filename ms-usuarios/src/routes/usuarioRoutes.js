const express = require('express');
const usuarioController = require('../controllers/usuarioController');
const { leerUsuario, permitirRoles } = require('../middlewares/usuarioCabeceras');

const router = express.Router();

// Ruta interna para ms-cursos: no lleva cabeceras X-User-* (integracion.md, sección 4).
// Va antes de leerUsuario para que no le pida cabeceras.
router.get('/docentes/:id', usuarioController.docente);

router.use(leerUsuario);

router.get('/me', usuarioController.me);
router.get('/', permitirRoles(['ADMINISTRADOR']), usuarioController.listar);
router.post('/', permitirRoles(['ADMINISTRADOR']), usuarioController.crear);
router.patch('/:id/estado', permitirRoles(['ADMINISTRADOR']), usuarioController.cambiarEstado);

module.exports = router;
