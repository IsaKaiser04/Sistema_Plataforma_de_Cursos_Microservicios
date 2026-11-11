const amqp = require("amqplib");
const { RABBIT_URL, RABBIT_EXCHANGE } = require("../config/env");
const estado = require("../lib/estado");
const { sleep } = require("../lib/util");
const { procesarMensaje, configurarCola, QUEUE } = require("./consumidor");

let reconectando = false;

function programarReconexion() {
  estado.rabbit = false;
  if (reconectando) return;
  reconectando = true;
  console.log("Conexión con RabbitMQ perdida, reconectando...");
  setTimeout(() => {
    reconectando = false;
    conectarRabbit();
  }, 3000);
}

async function conectarRabbit() {
  for (;;) {
    let conn;
    try {
      conn = await amqp.connect(RABBIT_URL);
      const ch = await conn.createChannel();
      await configurarCola(ch, RABBIT_EXCHANGE);

      await ch.prefetch(1);
      await ch.consume(QUEUE, (msg) =>
        procesarMensaje(ch, msg).catch((e) => console.log("Error inesperado:", e))
      );

      // Si se cae la conexión o solo el canal, se vuelve a conectar
      conn.on("error", (e) => console.log("Error en RabbitMQ:", e.message));
      conn.on("close", programarReconexion);
      ch.on("error", (e) => console.log("Error en el canal:", e.message));
      ch.on("close", () => {
        conn.close().catch(() => {});
        programarReconexion();
      });

      estado.rabbit = true;
      console.log(`Escuchando eventos en ${RABBIT_EXCHANGE} -> ${QUEUE}`);
      return;
    } catch (e) {
      if (conn) conn.close().catch(() => {});
      console.log("RabbitMQ no disponible, reintentando en 3 s...", e.message);
      await sleep(3000);
    }
  }
}

module.exports = { conectarRabbit };
