const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Error de datos del mensaje: no tiene sentido reintentarlo (va a la DLQ)
class EventoInvalido extends Error {}

const esUuid = (v) => typeof v === "string" && UUID_RE.test(v);

function exigirUuid(valor, campo) {
  if (!esUuid(valor)) throw new EventoInvalido(`Campo '${campo}' ausente o no es UUID`);
  return valor;
}

const uuidOpcional = (v) => (esUuid(v) ? v : null);

function exigirNota(valor, campo) {
  const n = typeof valor === "string" && valor.trim() !== "" ? Number(valor) : valor;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 10) {
    throw new EventoInvalido(`Campo '${campo}' ausente o fuera de 0 a 10`);
  }
  return n;
}

function exigirBooleano(valor, campo) {
  if (typeof valor !== "boolean") throw new EventoInvalido(`Campo '${campo}' ausente o no es booleano`);
  return valor;
}

const textoOpcional = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

module.exports = {
  UUID_RE,
  EventoInvalido,
  esUuid,
  exigirUuid,
  uuidOpcional,
  exigirNota,
  exigirBooleano,
  textoOpcional,
};
