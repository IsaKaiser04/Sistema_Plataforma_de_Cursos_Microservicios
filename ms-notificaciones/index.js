const express = require("express");
const amqp = require("amqplib");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
const RABBIT_URL = process.env.RABBIT_URL || "amqp://lms:lms123@localhost:5672";
const EXCHANGE = "lms.events";
const QUEUE = "notificaciones.q";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Contrato de eventos: routing key -> tipo y texto del mensaje
const PLANTILLAS = {
  "inscripcion.creada": {
    tipo: "BIENVENIDA",
    texto: (e) => `¡Bienvenido al curso ${e.curso_id}!`,
  },
  "evaluacion.calificada": {
    tipo: "NOTA",
    texto: (e) => `Tu evaluación fue calificada: ${e.nota}`,
  },
  "curso.publicado": {
    tipo: "CURSO_NUEVO",
    texto: (e) => `Nuevo curso disponible: ${e.titulo}`,
  },
};

async function iniciarBD() {
  for (;;) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notificaciones (
          id SERIAL PRIMARY KEY,
          estudiante_id INT,
          tipo VARCHAR(30),
          mensaje TEXT,
          estado VARCHAR(10) DEFAULT 'ENVIADA',
          fecha TIMESTAMP DEFAULT NOW()
        )`);
      console.log("Base de datos lista");
      return;
    } catch (e) {
      console.log("Base de datos no disponible, reintentando...");
      await sleep(3000);
    }
  }
}

async function procesarMensaje(ch, msg) {
  if (!msg) return;
  let evento;
  try {
    evento = JSON.parse(msg.content.toString());
  } catch {
    console.log("Mensaje con JSON inválido, descartado");
    return ch.nack(msg, false, false);
  }

  const plantilla = PLANTILLAS[msg.fields.routingKey];
  const tipo = plantilla ? plantilla.tipo : "GENERAL";
  const mensaje = plantilla ? plantilla.texto(evento) : "Tienes una novedad";

  try {
    await pool.query(
      "INSERT INTO notificaciones (estudiante_id, tipo, mensaje) VALUES ($1,$2,$3)",
      [evento.estudiante_id, tipo, mensaje]
    );
    console.log(`[${msg.fields.routingKey}] ${mensaje}`);
    ch.ack(msg);
  } catch (e) {
    console.log("Error guardando, se reintentará:", e.message);
    await sleep(2000);
    ch.nack(msg, false, true);
  }
}

async function conectarRabbit() {
  for (;;) {
    try {
      const conn = await amqp.connect(RABBIT_URL);
      const ch = await conn.createChannel();
      await ch.assertExchange(EXCHANGE, "topic", { durable: true });
      await ch.assertQueue(QUEUE, { durable: true });
      for (const rk of Object.keys(PLANTILLAS)) {
        await ch.bindQueue(QUEUE, EXCHANGE, rk);
      }
      ch.prefetch(1);
      await ch.consume(QUEUE, (msg) => procesarMensaje(ch, msg));

      conn.on("close", () => {
        console.log("Conexión con RabbitMQ perdida, reconectando...");
        setTimeout(conectarRabbit, 3000);
      });
      conn.on("error", () => {});
      console.log("Escuchando eventos en RabbitMQ");
      return;
    } catch (e) {
      console.log("RabbitMQ no disponible, reintentando en 3 s...");
      await sleep(3000);
    }
  }
}

const app = express();

app.get("/health", (_, res) =>
  res.json({ status: "ok", servicio: "ms-notificaciones" })
);

app.get("/notificaciones/:estudianteId", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM notificaciones WHERE estudiante_id=$1 ORDER BY fecha DESC",
      [req.params.estudianteId]
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "Error consultando notificaciones" });
  }
});

(async () => {
  app.listen(PORT, () => console.log(`ms-notificaciones en puerto ${PORT}`));
  await iniciarBD();
  await conectarRabbit();
})();
