const express = require('express');
const proxy = require('express-http-proxy');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Redirigir peticiones de autenticación y usuarios hacia ms-usuarios
app.use('/api/auth', proxy('http://ms-usuarios:3004', {
  proxyReqPathResolver: (req) => `/api/auth${req.url}`
}));

app.get('/api/health', (req, res) => res.send('API Gateway listo (Solo usuarios)'));

app.listen(PORT, () => {
  console.log(`API Gateway escuchando en el puerto ${PORT}`);
});