// Ecuador continental está en UTC-5 todo el año (no hay horario de verano).
const DESFASE_ECUADOR_MS = 5 * 60 * 60 * 1000;

// Fecha ISO 8601 sin zona, en hora de Ecuador: "2026-11-10T10:00:00"
function fechaEcuador(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return new Date(d.getTime() - DESFASE_ECUADOR_MS).toISOString().slice(0, 19);
}

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esUuid = (valor) => typeof valor === 'string' && REGEX_UUID.test(valor);

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esEmail = (valor) => typeof valor === 'string' && REGEX_EMAIL.test(valor);

module.exports = { fechaEcuador, esUuid, esEmail };
