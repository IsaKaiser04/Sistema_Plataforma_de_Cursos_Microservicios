const { PORT } = require("./config/env");
const app = require("./app");
const { iniciarBD } = require("./db/schema");
const { conectarRabbit } = require("./messaging/conexion");

(async () => {
  app.listen(PORT, () => console.log(`ms-certificados en puerto ${PORT}`));
  await iniciarBD();
  await conectarRabbit(); // se consume solo cuando la BD ya está lista
})();
