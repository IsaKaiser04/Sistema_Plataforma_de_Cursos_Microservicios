import { NavLink, Outlet } from 'react-router-dom';
import { useSesion } from '../context/SesionContext';

const NOMBRE_ROL = {
  ADMINISTRADOR: 'Administrador',
  DOCENTE: 'Docente',
  ESTUDIANTE: 'Estudiante',
};

const TODOS = ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'];

// Menú según el rol. Cada integrante agrega aquí las pantallas de su módulo.
const MENU = [
  { ruta: '/', texto: 'Inicio', roles: TODOS },
  // cursos (Cristian)
  { ruta: '/cursos', texto: 'Catálogo', roles: TODOS },
  { ruta: '/docente/cursos', texto: 'Gestión de cursos', roles: ['DOCENTE', 'ADMINISTRADOR'] },
  { ruta: '/docente/cursos/nuevo', texto: 'Nuevo curso', roles: ['DOCENTE', 'ADMINISTRADOR'] },
  // usuarios (Isauro)
  { ruta: '/mis-cursos', texto: 'Mis cursos', roles: ['ESTUDIANTE'] },
  { ruta: '/admin/usuarios', texto: 'Usuarios', roles: ['ADMINISTRADOR'] },
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
