const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');

const Inscripcion = sequelize.define('Inscripcion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  usuario_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id'
    }
  },
  curso_id: {
    type: DataTypes.UUID,
    allowNull: false, // Este ID provendrá de ms-cursos
  },
  estado: {
    type: DataTypes.ENUM('ACTIVA', 'CANCELADA'),
    defaultValue: 'ACTIVA'
  }
}, {
  tableName: 'inscripciones',
  timestamps: true
});

// Relación: Un Usuario tiene muchas Inscripciones
Usuario.hasMany(Inscripcion, { foreignKey: 'usuario_id', as: 'inscripciones' });
Inscripcion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'estudiante' });

module.exports = Inscripcion;