const express = require("express");
const estado = require("./lib/estado");
const notificaciones = require("./routes/notificaciones");
const certificados = require("./routes/certificados");
const { rutaNoEncontrada, manejarErrores } = require("./middleware/errores");

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  const ok = estado.bd && estado.rabbit;
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degradado",
    servicio: "ms-certificados",
    baseDatos: estado.bd ? "UP" : "DOWN",
    rabbitmq: estado.rabbit ? "UP" : "DOWN",
  });
});

app.use("/api/v1/notificaciones", notificaciones);
app.use("/api/v1/certificados", certificados);

app.use(rutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;
