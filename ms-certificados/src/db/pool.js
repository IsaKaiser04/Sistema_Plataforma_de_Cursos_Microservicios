const { Pool } = require("pg");
const { DATABASE_URL } = require("../config/env");

const pool = new Pool({ connectionString: DATABASE_URL });
// Sin este listener, una conexión caída del pool tumba el proceso
pool.on("error", (e) => console.log("Error en el pool de PostgreSQL:", e.message));

// Ejecuta fn(cliente) dentro de BEGIN/COMMIT; ROLLBACK si falla
async function enTransaccion(fn) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const resultado = await fn(db);
    await db.query("COMMIT");
    return resultado;
  } catch (e) {
    await db.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    db.release();
  }
}

module.exports = { pool, enTransaccion };
