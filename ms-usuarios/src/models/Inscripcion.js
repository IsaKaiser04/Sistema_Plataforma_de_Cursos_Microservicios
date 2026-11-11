const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const { fechaEcuador } = require('../utils/formato');

const ESTADOS = ['PENDIENTE', 'ACTIVA', 'RECHAZADA', 'CANCELADA', 'FINALIZADA'];

const Inscripcion = sequelize.define('Inscripcion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  usuario_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Usuario, key: 'id' },
  },
  curso_id: {
    type: DataTypes.UUID,
    allowNull: false, // viene de ms-cursos
  },
  estado: {
    type: DataTypes.ENUM(...ESTADOS),
    allowNull: false,
    defaultValue: 'PENDIENTE',
  },
  motivo_rechazo: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  tableName: 'inscripciones',
  timestamps: true,
  indexes: [
    {
      // Un estudiante no puede tener dos inscripciones vigentes en el mismo curso,
      // aunque lleguen dos peticiones al mismo tiempo.
      name: 'inscripciones_vigente_unica',
      unique: true,
      fields: ['usuario_id', 'curso_id'],
      where: { estado: { [Op.in]: ['PENDIENTE', 'ACTIVA'] } },
    },
  ],
});

Usuario.hasMany(Inscripcion, { foreignKey: 'usuario_id', as: 'inscripciones' });
Inscripcion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'estudiante' });

Inscripcion.prototype.aJson = function aJson() {
  return {
    id: this.id,
    cursoId: this.curso_id,
    estudianteId: this.usuario_id,
    estado: this.estado,
    motivoRechazo: this.motivo_rechazo,
    fechaInscripcion: fechaEcuador(this.createdAt),
  };
};

Inscripcion.ESTADOS = ESTADOS;

module.exports = Inscripcion;
