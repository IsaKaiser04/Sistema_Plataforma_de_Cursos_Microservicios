const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const ROLES = ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'];

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombres: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: '', // los usuarios que ya existían quedan con texto vacío
  },
  apellidos: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: '',
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  rol: {
    type: DataTypes.ENUM(...ROLES),
    allowNull: false,
    defaultValue: 'ESTUDIANTE',
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'usuarios',
  timestamps: true,
  hooks: {
    beforeCreate: async (usuario) => {
      const salt = await bcrypt.genSalt(10);
      usuario.password = await bcrypt.hash(usuario.password, salt);
    },
  },
});

// Lo que se devuelve en las respuestas (nunca la contraseña)
Usuario.prototype.aJson = function aJson() {
  return {
    id: this.id,
    email: this.email,
    nombres: this.nombres,
    apellidos: this.apellidos,
    rol: this.rol,
    activo: this.activo,
  };
};

Usuario.ROLES = ROLES;

module.exports = Usuario;
