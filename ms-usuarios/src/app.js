const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const inscripcionRoutes = require('./routes/inscripcionRoutes');
const { health } = require('./controllers/healthController');
const { manejoErrores, rutaNoEncontrada } = require('./middlewares/manejoErrores');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/usuarios', usuarioRoutes);
app.use('/api/v1/inscripciones', inscripcionRoutes);
app.get('/api/v1/health', health);

app.use(rutaNoEncontrada);
app.use(manejoErrores);

module.exports = app;
