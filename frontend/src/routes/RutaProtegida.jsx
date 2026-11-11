import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSesion } from '../context/SesionContext';

// Sin sesión manda al login; con un rol que no está en la lista, a la página 403.
// Uso: <Route element={<RutaProtegida roles={['DOCENTE']} />}> ... </Route>
export default function RutaProtegida({ roles }) {
  const { usuario } = useSesion();
  const location = useLocation();

  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }
  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/403" replace />;
  }
  return <Outlet />;
}
