const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Inscripcion = require('./Inscripcion');
const EventoProcesado = require('./EventoProcesado');

// Antes de sync: pasa los valores viejos de los ENUM a los nuevos sin borrar filas.
// Antes los roles eran 'Administrador' y 'Estudiante' y la inscripción solo tenía
// 'ACTIVA' y 'CANCELADA'. RENAME VALUE cambia también las filas que ya existen.
async function actualizarEnumsAntiguos() {
  const valoresDe = async (tipo) => {
    const [filas] = await sequelize.query(
      `SELECT e.enumlabel AS valor FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = :tipo`,
      { replacements: { tipo } }
    );
    return filas.map((f) => f.valor);
  };

  const roles = await valoresDe('enum_usuarios_rol');
  if (roles.length > 0) {
    if (roles.includes('Administrador')) {
      await sequelize.query(`ALTER TYPE "enum_usuarios_rol" RENAME VALUE 'Administrador' TO 'ADMINISTRADOR'`);
    }
    if (roles.includes('Estudiante')) {
      await sequelize.query(`ALTER TYPE "enum_usuarios_rol" RENAME VALUE 'Estudiante' TO 'ESTUDIANTE'`);
    }
    await sequelize.query(`ALTER TYPE "enum_usuarios_rol" ADD VALUE IF NOT EXISTS 'DOCENTE'`);
  }

  const estados = await valoresDe('enum_inscripciones_estado');
  if (estados.length > 0) {
    for (const estado of Inscripcion.ESTADOS) {
      await sequelize.query(`ALTER TYPE "enum_inscripciones_estado" ADD VALUE IF NOT EXISTS '${estado}'`);
    }
  }
}

async function sincronizarBaseDatos() {
  await sequelize.authenticate();
  await actualizarEnumsAntiguos();
  await sequelize.sync({ alter: true });
}

module.exports = { sequelize, Usuario, Inscripcion, EventoProcesado, sincronizarBaseDatos };
