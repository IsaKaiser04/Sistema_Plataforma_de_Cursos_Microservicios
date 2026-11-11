// ms-cursos simulado: responde GET /api/v1/cursos/{id}/validar como el servicio real.
const http = require('http');

const CURSO_CON_CUPO = '11111111-1111-4111-8111-111111111111';
const CURSO_SIN_CUPO = '22222222-2222-4222-8222-222222222222';
const CURSO_BORRADOR = '33333333-3333-4333-8333-333333333333';

const cursos = {
  [CURSO_CON_CUPO]: { codigo: 'SD-2026-01', estado: 'PUBLICADO', cupos: 40 },
  [CURSO_SIN_CUPO]: { codigo: 'SD-2026-02', estado: 'PUBLICADO', cupos: 0 },
  [CURSO_BORRADOR]: { codigo: 'SD-2026-03', estado: 'BORRADOR', cupos: 10 },
};

function iniciarCursosSimulado(puerto = 18081) {
  const servidor = http.createServer((req, res) => {
    const coincide = req.url.match(/^\/api\/v1\/cursos\/([^/]+)\/validar$/);
    if (!coincide) {
      res.writeHead(404);
      res.end();
      return;
    }
    const id = coincide[1];
    const curso = cursos[id];
    const cuerpo = curso
      ? {
        cursoId: id,
        codigo: curso.codigo,
        titulo: 'Sistemas Distribuidos',
        estado: curso.estado,
        existe: true,
        inscribible: curso.estado === 'PUBLICADO' && curso.cupos > 0,
        cuposDisponibles: curso.cupos,
        precio: 0,
      }
      : { cursoId: id, existe: false, inscribible: false };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cuerpo));
  });
  return new Promise((resolve) => {
    servidor.listen(puerto, '127.0.0.1', () => resolve(servidor));
  });
}

module.exports = { iniciarCursosSimulado, CURSO_CON_CUPO, CURSO_SIN_CUPO, CURSO_BORRADOR };
