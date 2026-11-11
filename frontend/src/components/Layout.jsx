import { NavLink, Outlet } from 'react-router-dom';
import { useSesion } from '../context/SesionContext';
import CampanaNotificaciones from './CampanaNotificaciones';

const NOMBRE_ROL = {
  ADMINISTRADOR: 'Administrador',
  DOCENTE: 'Docente',
  ESTUDIANTE: 'Estudiante',
};

// Menú según el rol. Cada integrante agrega aquí las pantallas de su módulo
// cuando existan (catálogo, mis cursos, evaluaciones, notificaciones...).
const MENU = [
  { ruta: '/', texto: 'Inicio', roles: ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'] },
  // Módulo notificaciones y certificados (María)
  { ruta: '/notificaciones', texto: 'Notificaciones', roles: ['ESTUDIANTE'] },
  { ruta: '/mis-certificados', texto: 'Mis certificados', roles: ['ESTUDIANTE'] },
];

export default function Layout() {
  const { usuario, cerrarSesion } = useSesion();
  const opciones = MENU.filter((o) => o.roles.includes(usuario.rol));

  return (
    <div className="app">
      <header className="barra">
        <span className="marca">Plataforma de Cursos</span>
        <nav className="menu">
          {opciones.map((o) => (
            <NavLink key={o.ruta} to={o.ruta} end className="menu-enlace">
              {o.texto}
            </NavLink>
          ))}
        </nav>
        <div className="barra-usuario">
          {usuario.rol === 'ESTUDIANTE' && <CampanaNotificaciones />}
          <span className="barra-nombre">{usuario.nombres || usuario.email}</span>
          <span className="chip">{NOMBRE_ROL[usuario.rol] || usuario.rol}</span>
          <button type="button" className="boton boton-secundario" onClick={() => cerrarSesion()}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
