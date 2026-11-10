const express = require("express");
const amqp = require("amqplib");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
const RABBIT_URL = process.env.RABBIT_URL || "amqp://guest:guest@localhost:5672";
const EXCHANGE = process.env.RABBIT_EXCHANGE || "lms.eventos.exchange";
const QUEUE = "lms.notificaciones.queue";
const DLX = "lms.notificaciones.dlx"; // mensajes inválidos terminan aquí
const DLQ = "lms.notificaciones.dlq";

// Eventos que escucha el servicio (contrato acordado con el equipo)
const ROUTING_KEYS = [
  "inscripcion.creada", // ms-inscripciones
  "cursos.evento.#", // ms-cursos (creado, actualizado, estado, cupo, eliminado)
  "evaluacion.calificada", // ms-evaluaciones
  "certificado.emitido", // ms-evaluaciones
];

const ESTADOS_INSCRIPCION_INVALIDOS = ["RECHAZADA", "CANCELADA"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// Sin este listener, una conexión caída del pool tumba el proceso
pool.on("error", (e) => console.log("Error en el pool de PostgreSQL:", e.message));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const estado = { bd: false, rabbit: false };

// Error de datos del mensaje: no tiene sentido reintentarlo
class EventoInvalido extends Error {}

function exigirUuid(valor, campo) {
  if (typeof valor !== "string" || !UUID_RE.test(valor)) {
    throw new EventoInvalido(`Campo '${campo}' ausente o no es UUID`);
  }
  return valor;
}

const uuidOpcional = (v) => (typeof v === "string" && UUID_RE.test(v) ? v : null);

// ---------------------------------------------------------------- Base de datos

async function iniciarBD() {
  for (;;) {
    try {
      await pool.query(`
        DO $$ BEGIN
          -- La v1 usaba estudiante_id INT: se conserva como respaldo
          IF EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'notificaciones'
                       AND column_name = 'estudiante_id'
                       AND data_type = 'integer') THEN
            ALTER TABLE notificaciones RENAME TO notificaciones_v1;
          END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS notificaciones (
          id            SERIAL PRIMARY KEY,
          evento_id     UUID,
          estudiante_id UUID NOT NULL,
          curso_id      UUID,
          tipo          VARCHAR(30) NOT NULL,
          mensaje       TEXT NOT NULL,
          estado        VARCHAR(10) NOT NULL DEFAULT 'ENVIADA',
          fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (evento_id, estudiante_id)
        );
        CREATE INDEX IF NOT EXISTS idx_notif_estudiante
          ON notificaciones (estudiante_id, fecha DESC);

        -- Copia local de inscripciones (se llena con inscripcion.creada)
        CREATE TABLE IF NOT EXISTS inscritos (
          curso_id       UUID NOT NULL,
          estudiante_id  UUID NOT NULL,
          inscripcion_id UUID,
          fecha          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (curso_id, estudiante_id)
        );

        -- Copia local de cursos (se llena con cursos.evento.*), para los textos
        CREATE TABLE IF NOT EXISTS cursos (
          curso_id      UUID PRIMARY KEY,
          codigo        VARCHAR(50),
          titulo        TEXT,
          estado        VARCHAR(20),
          actualizado   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`);
      estado.bd = true;
      console.log("Base de datos lista");
      return;
    } catch (e) {
      console.log("Base de datos no disponible, reintentando...", e.message);
      await sleep(3000);
    }
  }
}

async function nombreCurso(db, cursoId, respaldo) {
  if (cursoId) {
    const r = await db.query("SELECT titulo FROM cursos WHERE curso_id = $1", [cursoId]);
    if (r.rows[0]?.titulo) return r.rows[0].titulo;
  }
  return respaldo || "tu curso";
}

// Devuelve cuántas notificaciones nuevas se insertaron (0 si era un duplicado)
async function notificar(db, { eventoId, estudianteIds, cursoId, tipo, mensaje }) {
  if (estudianteIds.length === 0) return 0;
  const r = await db.query(
    `INSERT INTO notificaciones (evento_id, estudiante_id, curso_id, tipo, mensaje)
     SELECT $1, est, $3, $4, $5 FROM unnest($2::uuid[]) AS est
     ON CONFLICT (evento_id, estudiante_id) DO NOTHING`,
    [eventoId, estudianteIds, cursoId, tipo, mensaje]
  );
  return r.rowCount;
}

// ------------------------------------------------------------------- Manejadores

async function onInscripcionCreada(db, e) {
  const inscripcionId = exigirUuid(e.inscripcionId, "inscripcionId");
  const cursoId = exigirUuid(e.cursoId, "cursoId");
  const estudianteId = exigirUuid(e.estudianteId, "estudianteId");
  if (ESTADOS_INSCRIPCION_INVALIDOS.includes(e.estadoInscripcion)) {
    return "inscripción no válida, ignorada";
  }

  await db.query(
    `INSERT INTO inscritos (curso_id, estudiante_id, inscripcion_id)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [cursoId, estudianteId, inscripcionId]
  );
  const curso = await nombreCurso(db, cursoId);
  const n = await notificar(db, {
    eventoId: inscripcionId, // la inscripción identifica al evento (idempotencia)
    estudianteIds: [estudianteId],
    cursoId,
    tipo: "INSCRIPCION",
    mensaje: `Te inscribiste en el curso "${curso}". ¡Bienvenido!`,
  });
  return `${n} notificación(es)`;
}

const MENSAJES_ESTADO = {
  EN_CURSO: { tipo: "CURSO_INICIADO", texto: (c) => `El curso "${c}" ha comenzado. ¡Éxitos!` },
  FINALIZADO: { tipo: "CURSO_FINALIZADO", texto: (c) => `El curso "${c}" ha finalizado.` },
};

async function onEventoCurso(db, e, routingKey) {
  const cursoId = exigirUuid(e.cursoId, "cursoId");

  if (routingKey === "cursos.evento.eliminado") {
    await db.query("DELETE FROM cursos WHERE curso_id = $1", [cursoId]);
    return "curso eliminado de la caché";
  }

  await db.query(
    `INSERT INTO cursos (curso_id, codigo, titulo, estado) VALUES ($1, $2, $3, $4)
     ON CONFLICT (curso_id) DO UPDATE SET
       codigo = EXCLUDED.codigo, titulo = EXCLUDED.titulo,
       estado = EXCLUDED.estado, actualizado = NOW()`,
    [cursoId, e.codigoCurso ?? null, e.titulo ?? null, e.estado ?? null]
  );

  const plantilla = routingKey === "cursos.evento.estado" && MENSAJES_ESTADO[e.estado];
  if (!plantilla) return "caché de curso actualizada";

  const r = await db.query("SELECT estudiante_id FROM inscritos WHERE curso_id = $1", [cursoId]);
  const n = await notificar(db, {
    eventoId: uuidOpcional(e.eventoId),
    estudianteIds: r.rows.map((x) => x.estudiante_id),
    cursoId,
    tipo: plantilla.tipo,
    mensaje: plantilla.texto(e.titulo || (await nombreCurso(db, cursoId))),
  });
  return `${n} notificación(es) a inscritos`;
}

async function onEvaluacionCalificada(db, e) {
  const estudianteId = exigirUuid(e.estudianteId, "estudianteId");
  const cursoId = uuidOpcional(e.cursoId);
  if (e.nota === undefined || e.nota === null) throw new EventoInvalido("Falta 'nota'");

  const curso = await nombreCurso(db, cursoId, e.tituloCurso);
  const evaluacion = e.tituloEvaluacion ? `"${e.tituloEvaluacion}" ` : "";
  const n = await notificar(db, {
    eventoId: uuidOpcional(e.eventoId),
    estudianteIds: [estudianteId],
    cursoId,
    tipo: "NOTA",
    mensaje: `Tu evaluación ${evaluacion}del curso "${curso}" fue calificada: ${e.nota}`,
  });
  return `${n} notificación(es)`;
}

async function onCertificadoEmitido(db, e) {
  const estudianteId = exigirUuid(e.estudianteId, "estudianteId");
  const cursoId = uuidOpcional(e.cursoId);

  const curso = await nombreCurso(db, cursoId, e.tituloCurso);
  const enlace = e.certificadoUrl ? ` Descárgalo aquí: ${e.certificadoUrl}` : "";
  const n = await notificar(db, {
    eventoId: uuidOpcional(e.eventoId) || uuidOpcional(e.certificadoId),
    estudianteIds: [estudianteId],
    cursoId,
    tipo: "CERTIFICADO",
    mensaje: `¡Felicitaciones! Tu certificado del curso "${curso}" está listo.${enlace}`,
  });
  return `${n} notificación(es)`;
}

function manejadorPara(routingKey) {
  if (routingKey === "inscripcion.creada") return onInscripcionCreada;
  if (routingKey.startsWith("cursos.evento.")) return onEventoCurso;
  if (routingKey === "evaluacion.calificada") return onEvaluacionCalificada;
  if (routingKey === "certificado.emitido") return onCertificadoEmitido;
  return null;
}

// --------------------------------------------------------------------- RabbitMQ

// Errores de PostgreSQL por datos (clase 22) o restricciones (23): no se reintentan
const esErrorDeDatos = (e) => typeof e.code === "string" && /^(22|23)/.test(e.code);

async function procesarMensaje(ch, msg) {
  if (!msg) return; // el broker canceló el consumidor
  const rk = msg.fields.routingKey;
  try {
    const evento = JSON.parse(msg.content.toString());
    if (!evento || typeof evento !== "object" || Array.isArray(evento)) {
      throw new EventoInvalido("El cuerpo no es un objeto JSON");
    }
    const manejador = manejadorPara(rk);
    if (!manejador) {
      ch.ack(msg);
      return;
    }

    const db = await pool.connect();
    let resultado;
    try {
      await db.query("BEGIN");
      resultado = await manejador(db, evento, rk);
      await db.query("COMMIT");
    } catch (e) {
      await db.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      db.release();
    }
    console.log(`[${rk}] ${resultado}`);
    ch.ack(msg);
  } catch (e) {
    if (e instanceof SyntaxError || e instanceof EventoInvalido || esErrorDeDatos(e)) {
      console.log(`[${rk}] Evento inválido, enviado a ${DLQ}: ${e.message}`);
      ch.nack(msg, false, false); // va a la dead-letter queue
    } else {
      console.log(`[${rk}] Error temporal, se reintentará: ${e.message}`);
      await sleep(2000);
      ch.nack(msg, false, true);
    }
  }
}

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

      await ch.assertExchange(EXCHANGE, "topic", { durable: true });
      await ch.assertExchange(DLX, "fanout", { durable: true });
      await ch.assertQueue(DLQ, { durable: true });
      await ch.bindQueue(DLQ, DLX, "");
      await ch.assertQueue(QUEUE, { durable: true, deadLetterExchange: DLX });
      for (const rk of ROUTING_KEYS) await ch.bindQueue(QUEUE, EXCHANGE, rk);

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
      console.log(`Escuchando eventos en ${EXCHANGE} -> ${QUEUE}`);
      return;
    } catch (e) {
      if (conn) conn.close().catch(() => {});
      console.log("RabbitMQ no disponible, reintentando en 3 s...", e.message);
      await sleep(3000);
    }
  }
}

// --------------------------------------------------------------------- API REST

const app = express();

app.get("/health", (_, res) => {
  const ok = estado.bd && estado.rabbit;
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degradado",
    servicio: "ms-notificaciones",
    baseDatos: estado.bd ? "UP" : "DOWN",
    rabbitmq: estado.rabbit ? "UP" : "DOWN",
  });
});

app.get("/notificaciones/:estudianteId", async (req, res) => {
  const { estudianteId } = req.params;
  if (!UUID_RE.test(estudianteId)) {
    return res.status(400).json({ error: "estudianteId debe ser un UUID" });
  }
  const filtroEstado = req.query.estado ? String(req.query.estado).toUpperCase() : null;
  try {
    const r = await pool.query(
      `SELECT id, estudiante_id, curso_id, tipo, mensaje, estado, fecha
       FROM notificaciones
       WHERE estudiante_id = $1 AND ($2::text IS NULL OR estado = $2)
       ORDER BY fecha DESC, id DESC`,
      [estudianteId, filtroEstado]
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "Error consultando notificaciones" });
  }
});

app.patch("/notificaciones/:id/leida", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "id inválido" });
  }
  try {
    const r = await pool.query(
      "UPDATE notificaciones SET estado = 'LEIDA' WHERE id = $1 RETURNING *",
      [id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Notificación no encontrada" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Error actualizando la notificación" });
  }
});

(async () => {
  app.listen(PORT, () => console.log(`ms-notificaciones en puerto ${PORT}`));
  await iniciarBD();
  await conectarRabbit();
})();
