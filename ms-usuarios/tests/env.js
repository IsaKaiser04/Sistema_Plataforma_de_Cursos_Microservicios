// Variables para las pruebas. Usan una base aparte (usuarios_test) para no tocar tus datos.
// Se pueden cambiar con TEST_DB_HOST, TEST_DB_PORT, etc.
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT || '5434';
process.env.POSTGRES_DB = process.env.TEST_DB_NAME || 'usuarios_test';
process.env.POSTGRES_USER = process.env.TEST_DB_USER || 'admin';
process.env.POSTGRES_PASSWORD = process.env.TEST_DB_PASSWORD || 'password';
process.env.JWT_SECRET = 'secreto_de_pruebas';
// RabbitMQ no se usa en las pruebas: el publicador queda desconectado a propósito
process.env.RABBIT_URL = 'amqp://lms:lms123@localhost:5999';
process.env.CURSOS_URL = 'http://127.0.0.1:18081'; // ms-cursos simulado en tests/cursosSimulado.js
process.env.CURSOS_TIMEOUT_MS = '1000';
process.env.ADMIN_EMAIL = '';
process.env.ADMIN_PASSWORD = '';
