require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

// Importar modelos para que Sequelize los reconozca al sincronizar
require('./models/Usuario');
require('./models/Inscripcion');

// Importar rutas
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Registrar rutas
app.use('/api/auth', authRoutes);

// Ruta de estado de salud del microservicio
app.get('/api/health', (req, res) => res.send('Microservicio activo'));

const PORT = process.env.PORT || 3004;

const iniciarServidor = async () => {
  try {
    // Sincroniza la base de datos (alter: true actualiza las tablas sin borrar datos)
    await sequelize.sync({ alter: true });
    console.log('Base de datos sincronizada correctamente.');
    
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
  }
};

iniciarServidor();