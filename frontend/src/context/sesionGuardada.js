// La sesión se guarda en localStorage (frontend.md, P2) para no perderla al recargar.
const CLAVE = 'lms.sesion';

// Lee el campo exp del JWT sin validarlo (eso lo hace el gateway).
function tokenExpirado(token) {
  try {
    const parte = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(parte));
    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function leerSesion() {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE));
    if (!sesion || !sesion.token || !sesion.usuario) return null;
    if (tokenExpirado(sesion.token)) {
      localStorage.removeItem(CLAVE);
      return null;
    }
    return sesion;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    // Sin localStorage (modo privado) la sesión dura hasta recargar.
  }
}

export function borrarSesion() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada que borrar
  }
}

export function obtenerToken() {
  const sesion = leerSesion();
  return sesion ? sesion.token : null;
}
