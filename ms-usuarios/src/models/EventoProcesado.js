const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Guarda los eventoId ya procesados para no aplicar dos veces el mismo evento (P7).
const EventoProcesado = sequelize.define('EventoProcesado', {
  evento_id: {
    type: DataTypes.UUID,
    primaryKey: true,
  },
  tipo_evento: {
    type: DataTypes.STRING(60),
    allowNull: false,
  },
}, {
  tableName: 'eventos_procesados',
  timestamps: true,
  createdAt: 'fecha_procesado',
  updatedAt: false,
});

module.exports = EventoProcesado;
