// BD simulada: responde según el inicio del SQL y guarda cada consulta
function fakeDb(respuestas = {}) {
  const consultas = [];
  const db = {
    consultas,
    async query(sql, params = []) {
      const texto = sql.replace(/\s+/g, " ").trim();
      consultas.push({ sql: texto, params });
      for (const [clave, fn] of Object.entries(respuestas)) {
        if (texto.includes(clave)) {
          const r = typeof fn === "function" ? fn(params) : fn;
          return { rows: r.rows || [], rowCount: r.rowCount ?? (r.rows || []).length };
        }
      }
      return { rows: [], rowCount: 1 };
    },
    // Consultas cuyo SQL contiene el texto dado
    con(texto) {
      return consultas.filter((c) => c.sql.includes(texto));
    },
  };
  return db;
}

module.exports = { fakeDb };
