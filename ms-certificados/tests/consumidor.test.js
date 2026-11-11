jest.mock("../src/db/pool", () => ({ enTransaccion: jest.fn(), pool: {} }));
jest.mock("../src/lib/util", () => ({ sleep: () => Promise.resolve() }));

const { enTransaccion } = require("../src/db/pool");
const { procesarMensaje } = require("../src/messaging/consumidor");

const canal = () => ({ ack: jest.fn(), nack: jest.fn() });
const mensaje = (rk, cuerpo) => ({
  fields: { routingKey: rk },
  content: Buffer.from(typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo)),
});

beforeEach(() => enTransaccion.mockReset());

test("JSON roto va a la DLQ sin reintentar", async () => {
  const ch = canal();
  await procesarMensaje(ch, mensaje("nota.final.calculada", "{roto"));
  expect(ch.nack).toHaveBeenCalledWith(expect.anything(), false, false);
});

test("campo obligatorio faltante va a la DLQ", async () => {
  enTransaccion.mockImplementation((fn) => fn({ query: jest.fn() }));
  const ch = canal();
  await procesarMensaje(ch, mensaje("nota.final.calculada", { cursoId: "x" }));
  expect(ch.nack).toHaveBeenCalledWith(expect.anything(), false, false);
});

test("routing key sin manejador se confirma", async () => {
  const ch = canal();
  await procesarMensaje(ch, mensaje("otro.evento", {}));
  expect(ch.ack).toHaveBeenCalled();
  expect(enTransaccion).not.toHaveBeenCalled();
});

test("error temporal (BD caída) se devuelve a la cola", async () => {
  enTransaccion.mockRejectedValue(Object.assign(new Error("ECONNREFUSED"), { code: "ECONNREFUSED" }));
  const ch = canal();
  await procesarMensaje(
    ch,
    mensaje("inscripcion.cancelada", {
      cursoId: "11111111-1111-4111-8111-111111111111",
      estudianteId: "22222222-2222-4222-8222-222222222222",
    })
  );
  expect(ch.nack).toHaveBeenCalledWith(expect.anything(), false, true);
});

test("evento válido se procesa y confirma", async () => {
  enTransaccion.mockResolvedValue("ok");
  const ch = canal();
  await procesarMensaje(ch, mensaje("inscripcion.cancelada", {}));
  expect(ch.ack).toHaveBeenCalled();
});
