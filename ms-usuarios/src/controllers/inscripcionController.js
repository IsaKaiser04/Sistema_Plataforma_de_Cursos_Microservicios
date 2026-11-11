const inscripcionService = require('../services/inscripcionService');

async function crear(req, res, next) {
  try {
    const { cursoId } = req.body || {};
    const inscripcion = await inscripcionService.crear(req.usuario.id, cursoId);
    res.status(201).json(inscripcion);
  } catch (error) {
    next(error);
  }
}

async function mias(req, res, next) {
  try {
    res.json(await inscripcionService.misInscripciones(req.usuario.id));
  } catch (error) {
    next(error);
  }
}

async function porCurso(req, res, next) {
  try {
    res.json(await inscripcionService.inscritosDeCurso(req.params.cursoId));
  } catch (error) {
    next(error);
  }
}

async function obtener(req, res, next) {
  try {
    res.json(await inscripcionService.obtener(req.params.id, req.usuario));
  } catch (error) {
    next(error);
  }
}

async function cancelar(req, res, next) {
  try {
    res.json(await inscripcionService.cancelar(req.params.id, req.usuario));
  } catch (error) {
    next(error);
  }
}

module.exports = { crear, mias, porCurso, obtener, cancelar };
