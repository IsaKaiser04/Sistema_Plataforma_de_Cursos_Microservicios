// Funciones de apoyo de la pantalla de evaluaciones.

// Valor por defecto de ms-evaluaciones (LMS_NOTA_MINIMA y CursoLocal.notaMinima).
// Solo se usa para la vista previa antes de guardar; el resultado oficial
// (aprobado y notaMinima) siempre viene del servicio.
export const NOTA_MINIMA_POR_DEFECTO = 7;

export const TIPOS = {
  EXAMEN: 'Examen',
  TAREA: 'Tarea',
  PROYECTO: 'Proyecto',
};

// "2026-11-12T08:00:00" (hora de Ecuador, sin zona) -> Date local del navegador
export function aFecha(texto) {
  if (!texto) return null;
  const d = new Date(texto);
  return Number.isNaN(d.getTime()) ? null : d;
}

// "2026-11-12T08:00:00" -> "12/11/2026 08:00"
export function formatearFecha(texto) {
  if (!texto) return '';
  const [fecha, hora = ''] = String(texto).split('T');
  const [anio, mes, dia] = fecha.split('-');
  return dia ? `${dia}/${mes}/${anio} ${hora.slice(0, 5)}` : texto;
}

export const idCorto = (id) => String(id || '').slice(0, 8);

// Estado que ve el estudiante: pendiente, fuera de plazo, entregada o calificada.
export function estadoParaEstudiante(evaluacion, entrega, calificacion, ahora = new Date()) {
  if (calificacion) return { clave: 'CALIFICADA', texto: 'Calificada', clase: 'insignia-activa' };
  if (entrega) return { clave: 'ENTREGADA', texto: 'Entregada', clase: 'insignia-finalizada' };

  const apertura = aFecha(evaluacion.fechaApertura);
  const cierre = aFecha(evaluacion.fechaCierre);
  if (evaluacion.estado !== 'PUBLICADA' || (cierre && ahora > cierre)) {
    return { clave: 'FUERA_DE_PLAZO', texto: 'Fuera de plazo', detalle: 'El plazo de entrega terminó', clase: 'insignia-rechazada' };
  }
  if (apertura && ahora < apertura) {
    return {
      clave: 'FUERA_DE_PLAZO',
      texto: 'Fuera de plazo',
      detalle: `Se abre el ${formatearFecha(evaluacion.fechaApertura)}`,
      clase: 'insignia-cancelada',
    };
  }
  return { clave: 'PENDIENTE', texto: 'Pendiente', clase: 'insignia-pendiente' };
}

// Valida la nota total del docente (0 a 10, un decimal). Devuelve el mensaje de error o ''.
export function validarNota(texto) {
  if (texto === '' || texto === null || texto === undefined) return 'Escribe la nota.';
  const nota = Number(texto);
  if (Number.isNaN(nota)) return 'La nota debe ser un número.';
  if (nota < 0 || nota > 10) return 'La nota debe estar entre 0 y 10.';
  if (Math.round(nota * 10) / 10 !== nota) return 'Usa como máximo un decimal (por ejemplo 6.9 o 7.0).';
  return '';
}
