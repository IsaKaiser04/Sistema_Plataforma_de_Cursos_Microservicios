const { Router } = require("express");
const { pool } = require("../db/pool");
const { soloDuenio, exigirDuenio } = require("../middleware/duenio");
const { asincrono, datosInvalidos, noEncontrado } = require("../middleware/errores");

const router = Router();
const ESTADOS = ["ENVIADA", "LEIDA"];

const aJson = (n) => ({
  id: n.id,
  estudianteId: n.estudiante_id,
  cursoId: n.curso_id,
  tipo: n.tipo,
  mensaje: n.mensaje,
  estado: n.estado,
  fecha: n.fecha,
});

// Lista del estudiante, la más reciente primero (?estado=ENVIADA|LEIDA)
router.get(
  "/:estudianteId",
  soloDuenio,
  asincrono(async (req, res) => {
    let filtro = null;
    if (req.query.estado !== undefined) {
      filtro = String(req.query.estado).toUpperCase();
      if (!ESTADOS.includes(filtro)) throw datosInvalidos("estado debe ser ENVIADA o LEIDA");
    }
    const r = await pool.query(
      `SELECT id, estudiante_id, curso_id, tipo, mensaje, estado, fecha
       FROM notificaciones
       WHERE estudiante_id = $1 AND ($2::text IS NULL OR estado = $2)
       ORDER BY fecha DESC, id DESC`,
      [req.params.estudianteId, filtro]
    );
    res.json(r.rows.map(aJson));
  })
);

router.get(
  "/:estudianteId/no-leidas/total",
  soloDuenio,
  asincrono(async (req, res) => {
    const r = await pool.query(
      "SELECT count(*)::int AS total FROM notificaciones WHERE estudiante_id = $1 AND estado = 'ENVIADA'",
      [req.params.estudianteId]
    );
    res.json({ total: r.rows[0].total });
  })
);

router.patch(
  "/:estudianteId/leidas",
  soloDuenio,
  asincrono(async (req, res) => {
    const r = await pool.query(
      "UPDATE notificaciones SET estado = 'LEIDA' WHERE estudiante_id = $1 AND estado = 'ENVIADA'",
      [req.params.estudianteId]
    );
    res.json({ actualizadas: r.rowCount });
  })
);

router.patch(
  "/:id/leida",
  asincrono(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw datosInvalidos("id debe ser un entero positivo");

    const actual = await pool.query("SELECT estudiante_id FROM notificaciones WHERE id = $1", [id]);
    if (actual.rowCount === 0) throw noEncontrado("Notificación no encontrada");
    exigirDuenio(req, actual.rows[0].estudiante_id);

    const r = await pool.query(
      "UPDATE notificaciones SET estado = 'LEIDA' WHERE id = $1 RETURNING *",
      [id]
    );
    res.json(aJson(r.rows[0]));
  })
);

module.exports = router;
