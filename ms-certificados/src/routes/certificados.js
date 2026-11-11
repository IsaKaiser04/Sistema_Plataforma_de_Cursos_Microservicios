const { Router } = require("express");
const { pool } = require("../db/pool");
const { esUuid } = require("../lib/validacion");
const { soloDuenio, exigirDuenio } = require("../middleware/duenio");
const { asincrono, datosInvalidos, noEncontrado } = require("../middleware/errores");
const { urlCertificado } = require("../handlers/certificados/notaFinal");
const { generarPdfCertificado } = require("../pdf/certificadoPdf");

const router = Router();

const COLUMNAS = `id, codigo_verificacion, curso_id, estudiante_id, codigo_curso,
                  titulo_curso, nota_final, fecha_emision`;

const aJson = (c) => ({
  id: c.id,
  codigoVerificacion: c.codigo_verificacion,
  estudianteId: c.estudiante_id,
  cursoId: c.curso_id,
  codigoCurso: c.codigo_curso,
  tituloCurso: c.titulo_curso,
  notaFinal: Number(c.nota_final),
  fechaEmision: c.fecha_emision,
  url: urlCertificado(c.codigo_verificacion),
});

// Verificación pública (sin X-User-Id). Va antes de /:id
router.get(
  "/verificar/:codigo",
  asincrono(async (req, res) => {
    const codigo = String(req.params.codigo).trim().toUpperCase();
    if (!/^LMS-[A-Z0-9]+-\d{4,}$/.test(codigo)) {
      throw noEncontrado("No existe un certificado con ese código");
    }
    const r = await pool.query(`SELECT ${COLUMNAS} FROM certificados WHERE codigo_verificacion = $1`, [
      codigo,
    ]);
    if (r.rowCount === 0) throw noEncontrado("No existe un certificado con ese código");
    res.json(aJson(r.rows[0]));
  })
);

router.get(
  "/estudiante/:estudianteId",
  soloDuenio,
  asincrono(async (req, res) => {
    const r = await pool.query(
      `SELECT ${COLUMNAS} FROM certificados WHERE estudiante_id = $1 ORDER BY fecha_emision DESC`,
      [req.params.estudianteId]
    );
    res.json(r.rows.map(aJson));
  })
);

// PDF del certificado, solo para el dueño. ?nombre= lo envía el gateway (desde ms-usuarios)
router.get(
  "/:id/pdf",
  asincrono(async (req, res) => {
    if (!esUuid(req.params.id)) throw datosInvalidos("id no es un UUID válido");
    const r = await pool.query(`SELECT ${COLUMNAS} FROM certificados WHERE id = $1`, [req.params.id]);
    if (r.rowCount === 0) throw noEncontrado("Certificado no encontrado");
    exigirDuenio(req, r.rows[0].estudiante_id);

    const cert = aJson(r.rows[0]);
    const nombre = typeof req.query.nombre === "string" ? req.query.nombre.trim().slice(0, 120) : "";
    const pdf = await generarPdfCertificado(cert, nombre || null);
    res
      .status(200)
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificado-${cert.codigoVerificacion}.pdf"`,
        "Content-Length": pdf.length,
      })
      .send(pdf);
  })
);

router.get(
  "/:id",
  asincrono(async (req, res) => {
    if (!esUuid(req.params.id)) throw datosInvalidos("id no es un UUID válido");
    const r = await pool.query(`SELECT ${COLUMNAS} FROM certificados WHERE id = $1`, [req.params.id]);
    if (r.rowCount === 0) throw noEncontrado("Certificado no encontrado");
    exigirDuenio(req, r.rows[0].estudiante_id);
    res.json(aJson(r.rows[0]));
  })
);

module.exports = router;
