const Inscripcion = require('../models/Inscripcion');

const crearInscripcion = async (req, res) => {
  try {
    const { curso_id } = req.body;
    const usuario_id = req.usuario.id; // Este dato vendrá inyectado del token

    const existe = await Inscripcion.findOne({ where: { curso_id, usuario_id } });
    if (existe) return res.status(400).json({ error: 'Ya estás inscrito' });

    const inscripcion = await Inscripcion.create({ curso_id, usuario_id });
    res.status(201).json({ mensaje: 'Inscrito con éxito', inscripcion });
  } catch (error) {
    res.status(500).json({ error: 'Error al inscribirse' });
  }
};

module.exports = { crearInscripcion };