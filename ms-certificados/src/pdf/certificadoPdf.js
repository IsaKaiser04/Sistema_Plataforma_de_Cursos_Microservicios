const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

const AZUL = "#1f5fbf";
const TEXTO = "#1f2430";
const SUAVE = "#5d6475";

function fechaLarga(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor ?? "");
  return d.toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Guayaquil",
  });
}

// Genera el PDF del certificado (A4 horizontal) y lo devuelve como Buffer.
// c: certificado en formato de la API (codigoVerificacion, tituloCurso, notaFinal, url...)
// nombre: nombre del estudiante (opcional; lo pone el gateway desde ms-usuarios)
async function generarPdfCertificado(c, nombre) {
  const qr = await QRCode.toBuffer(c.url, { margin: 1, width: 240, color: { dark: AZUL } });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
      info: {
        Title: `Certificado ${c.codigoVerificacion}`,
        Author: "Plataforma de Cursos LMS",
        Subject: `Certificado de aprobación: ${c.tituloCurso}`,
      },
    });
    const partes = [];
    doc.on("data", (p) => partes.push(p));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);

    const W = doc.page.width; // 841.89
    const H = doc.page.height; // 595.28
    const ancho = W - 160;
    const centro = (texto, y, opciones = {}) => doc.text(texto, 80, y, { width: ancho, align: "center", ...opciones });

    // Marco doble
    doc.lineWidth(3).strokeColor(AZUL).rect(24, 24, W - 48, H - 48).stroke();
    doc.lineWidth(0.8).rect(34, 34, W - 68, H - 68).stroke();

    // Encabezado
    doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(13);
    centro("PLATAFORMA DE CURSOS LMS", 70, { characterSpacing: 3 });
    doc.fillColor(TEXTO).font("Helvetica-Bold").fontSize(34);
    centro("CERTIFICADO DE APROBACIÓN", 100);
    doc.moveTo(W / 2 - 90, 148).lineTo(W / 2 + 90, 148).lineWidth(1.5).strokeColor(AZUL).stroke();

    // Cuerpo
    doc.fillColor(SUAVE).font("Helvetica").fontSize(14);
    centro("Se certifica que", 172);
    doc.fillColor(TEXTO).font("Helvetica-Bold").fontSize(26);
    centro(nombre ? nombre : "el estudiante titular de este certificado", 196, { height: 40, ellipsis: true });
    doc.fillColor(SUAVE).font("Helvetica").fontSize(14);
    centro("aprobó satisfactoriamente el curso", 240);
    doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(24);
    centro(c.tituloCurso, 264, { height: 60, ellipsis: true });
    doc.fillColor(TEXTO).font("Helvetica").fontSize(14);
    centro(`Código del curso: ${c.codigoCurso}   ·   Nota final: ${Number(c.notaFinal).toFixed(1)} / 10`, 330);

    // Pie: fecha a la izquierda, verificación a la derecha
    const yPie = H - 150;
    doc.fillColor(SUAVE).font("Helvetica").fontSize(11).text("Fecha de emisión", 90, yPie);
    doc.fillColor(TEXTO).font("Helvetica-Bold").fontSize(14).text(fechaLarga(c.fechaEmision), 90, yPie + 16);
    doc.moveTo(90, yPie + 52).lineTo(300, yPie + 52).lineWidth(0.8).strokeColor(SUAVE).stroke();
    doc.fillColor(SUAVE).font("Helvetica").fontSize(10).text("Plataforma de Cursos LMS", 90, yPie + 58);

    const xQr = W - 90 - 96;
    doc.image(qr, xQr, yPie - 6, { width: 96 });
    doc.fillColor(SUAVE).font("Helvetica").fontSize(10);
    doc.text("Código de verificación", xQr - 250, yPie + 6, { width: 236, align: "right" });
    doc.fillColor(TEXTO).font("Courier-Bold").fontSize(15);
    doc.text(c.codigoVerificacion, xQr - 250, yPie + 22, { width: 236, align: "right" });
    doc.fillColor(SUAVE).font("Helvetica").fontSize(9);
    doc.text(`Verifica su validez en: ${c.url}`, xQr - 250, yPie + 46, { width: 236, align: "right", link: c.url });

    doc.end();
  });
}

module.exports = { generarPdfCertificado };
