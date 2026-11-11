// Variables de entorno del servicio, en un solo lugar
const env = {
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL:
    process.env.DATABASE_URL || "postgresql://admin:password@localhost:5433/notificaciones_db",
  RABBIT_URL: process.env.RABBIT_URL || "amqp://lms:lms123@localhost:5672",
  RABBIT_EXCHANGE: process.env.RABBIT_EXCHANGE || "lms.eventos.exchange",
  FRONTEND_URL: (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, ""),
};

module.exports = env;
