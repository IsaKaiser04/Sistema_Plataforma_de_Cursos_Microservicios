// Inserta una notificación por estudiante. Devuelve cuántas se crearon
// (0 si el evento ya se había procesado: UNIQUE (evento_id, estudiante_id)).
async function notificar(db, { eventoId, estudianteIds, cursoId, tipo, mensaje }) {
  if (!estudianteIds || estudianteIds.length === 0) return 0;
  const r = await db.query(
    `INSERT INTO notificaciones (evento_id, estudiante_id, curso_id, tipo, mensaje)
     SELECT $1, est, $3, $4, $5 FROM unnest($2::uuid[]) AS est
     ON CONFLICT (evento_id, estudiante_id) DO NOTHING`,
    [eventoId, estudianteIds, cursoId, tipo, mensaje]
  );
  return r.rowCount;
}

// Título del curso desde la copia local; si no hay, usa el respaldo
async function nombreCurso(db, cursoId, respaldo) {
  if (respaldo) return respaldo;
  if (cursoId) {
    const r = await db.query("SELECT titulo FROM cursos WHERE curso_id = $1", [cursoId]);
    if (r.rows[0]?.titulo) return r.rows[0].titulo;
  }
  return "tu curso";
}

async function inscritosDe(db, cursoId) {
  const r = await db.query("SELECT estudiante_id FROM inscritos WHERE curso_id = $1", [cursoId]);
  return r.rows.map((x) => x.estudiante_id);
}

// Guarda en la copia local los datos de curso que traiga un evento, sin pisar con nulos
async function recordarCurso(db, cursoId, { codigo = null, titulo = null } = {}) {
  if (!codigo && !titulo) return;
  await db.query(
    `INSERT INTO cursos (curso_id, codigo, titulo) VALUES ($1, $2, $3)
     ON CONFLICT (curso_id) DO UPDATE SET
       codigo = COALESCE(EXCLUDED.codigo, cursos.codigo),
       titulo = COALESCE(EXCLUDED.titulo, cursos.titulo),
       actualizado = NOW()`,
    [cursoId, codigo, titulo]
  );
}

module.exports = { notificar, nombreCurso, inscritosDe, recordarCurso };
