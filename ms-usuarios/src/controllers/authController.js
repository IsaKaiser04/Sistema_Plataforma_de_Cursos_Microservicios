const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

const registrarUsuario = async (req, res) => {
  try {
    const { email, password, rol } = req.body;
    
    // Verificar si el correo ya existe
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Crear el usuario (la contraseña se encripta automáticamente por el hook del modelo)
    const nuevoUsuario = await Usuario.create({ email, password, rol });
    
    res.status(201).json({ 
      mensaje: 'Usuario registrado exitosamente', 
      usuario: { id: nuevoUsuario.id, email: nuevoUsuario.email, rol: nuevoUsuario.rol } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
};

const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar al usuario por su email
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Comparar la contraseña enviada con la encriptada en la base de datos
    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar el token JWT con el ID y el Rol
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET || 'secreto_desarrollo_123',
      { expiresIn: '24h' }
    );

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: { id: usuario.id, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

module.exports = { registrarUsuario, loginUsuario };