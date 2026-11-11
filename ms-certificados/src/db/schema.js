const { pool } = require("./pool");
const estado = require("../lib/estado");
const { sleep } = require("../lib/util");

const SQL = `
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

  -- Quién está inscrito en cada curso (inscripcion.creada / acceso.habilitado)
  CREATE TABLE IF NOT EXISTS inscritos (
    curso_id       UUID NOT NULL,
    estudiante_id  UUID NOT NULL,
    inscripcion_id UUID,
    fecha          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (curso_id, estudiante_id)
  );

  -- Copia local de cursos (cursos.evento.*), para armar los textos
  CREATE TABLE IF NOT EXISTS cursos (
    curso_id      UUID PRIMARY KEY,
    codigo        VARCHAR(50),
    titulo        TEXT,
    estado        VARCHAR(20),
    actualizado   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Certificados emitidos (nota.final.calculada con aprobado = true)
  CREATE TABLE IF NOT EXISTS certificados (
    id                  UUID PRIMARY KEY,
    codigo_verificacion VARCHAR(40) NOT NULL UNIQUE,
    curso_id            UUID NOT NULL,
    estudiante_id       UUID NOT NULL,
    codigo_curso        VARCHAR(30) NOT NULL,
    titulo_curso        VARCHAR(200) NOT NULL,
    nota_final          NUMERIC(3,1) NOT NULL CHECK (nota_final BETWEEN 0 AND 10),
    fecha_emision       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (curso_id, estudiante_id)
  );
  CREATE INDEX IF NOT EXISTS idx_cert_estudiante
    ON certificados (estudiante_id, fecha_emision DESC);
`;

async function iniciarBD() {
  for (;;) {
    try {
      await pool.query(SQL);
      estado.bd = true;
      console.log("Base de datos lista");
      return;
    } catch (e) {
      console.log("Base de datos no disponible, reintentando...", e.message);
      await sleep(3000);
    }
  }
}

module.exports = { iniciarBD };
