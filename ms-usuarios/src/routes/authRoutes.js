const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario } = require('../controllers/authController');

router.post('/registro', registrarUsuario);
router.post('/login', loginUsuario);

module.exports = router;