// Utilidades del módulo notificaciones y certificados (María).

export function fechaCorta(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor ?? '';
  return d.toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
}

export function fechaLarga(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor ?? '';
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const TIPOS_NOTIFICACION = {
  INSCRIPCION: { texto: 'Inscripción', icono: '👋' },
  INSCRIPCION_RECHAZADA: { texto: 'Inscripción rechazada', icono: '⛔' },
  CURSO_INICIADO: { texto: 'Curso iniciado', icono: '🚀' },
  CURSO_FINALIZADO: { texto: 'Curso finalizado', icono: '🏁' },
  EVALUACION_NUEVA: { texto: 'Nueva evaluación', icono: '📝' },
  NOTA: { texto: 'Nota', icono: '📊' },
  NOTA_FINAL: { texto: 'Nota final', icono: '📋' },
  CERTIFICADO: { texto: 'Certificado', icono: '🎓' },
};

// El mensaje CERTIFICADO trae ".../certificados/LMS-XXXX-0001": se separa el código
// para mostrar un enlace interno en vez de la URL completa.
const RE_CODIGO = /\s*(?:Verifica tu certificado en\s*)?\S*\/certificados\/(LMS-[A-Z0-9]+-\d+)\S*/i;

export function separarCodigo(mensaje) {
  const m = mensaje.match(RE_CODIGO);
  if (!m) return { texto: mensaje, codigo: null };
  return { texto: mensaje.replace(RE_CODIGO, '').trim(), codigo: m[1].toUpperCase() };
}
