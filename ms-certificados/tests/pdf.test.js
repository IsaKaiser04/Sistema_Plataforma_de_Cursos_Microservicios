const { generarPdfCertificado } = require("../src/pdf/certificadoPdf");

const cert = {
  codigoVerificacion: "LMS-SD202601-0001",
  codigoCurso: "SD-2026-01",
  tituloCurso: "Sistemas Distribuidos",
  notaFinal: 8.7,
  fechaEmision: "2026-12-20T15:00:00.000Z",
  url: "http://localhost:5173/certificados/LMS-SD202601-0001",
};

test("genera un PDF válido con nombre", async () => {
  const pdf = await generarPdfCertificado(cert, "Ana Pérez");
  expect(Buffer.isBuffer(pdf)).toBe(true);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(2000);
});

test("genera el PDF aunque no haya nombre", async () => {
  const pdf = await generarPdfCertificado(cert, null);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
});
