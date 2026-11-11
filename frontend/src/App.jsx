import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import RutaProtegida from './routes/RutaProtegida';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Registro from './pages/auth/Registro';
import Inicio from './pages/Inicio';
import Prohibido from './pages/Prohibido';
import NoEncontrada from './pages/NoEncontrada';
import Usuarios from './pages/admin/Usuarios';
import MisCursos from './pages/inscripciones/MisCursos';
import {
  CatalogoPagina,
  DetallePagina,
  GestionCursosPagina,
  FormularioCursoPagina,
  EvaluacionesPagina,
} from './pages/cursos/PaginasCursos';

// Se carga solo al entrar a su ruta: si esas pantallas tienen un error
// (hoy CrearEvaluacion importa un servicio que no existe), el resto de la app sigue funcionando.
const EvaluacionesDemo = lazy(() => import('./pages/evaluaciones/EvaluacionesDemo'));

// Módulo notificaciones y certificados (María)
const MisNotificaciones = lazy(() => import('./pages/notificaciones/MisNotificaciones'));
const MisCertificados = lazy(() => import('./pages/certificados/MisCertificados'));
const VerificarCertificado = lazy(() => import('./pages/certificados/VerificarCertificado'));
const cargando = <p className="texto-suave">Cargando...</p>;

export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/403" element={<Prohibido />} />
      {/* Verificación pública de certificados (María): es el enlace de la notificación CERTIFICADO */}
      <Route path="/verificar" element={<Suspense fallback={cargando}><VerificarCertificado /></Suspense>} />
      <Route path="/certificados/:codigo" element={<Suspense fallback={cargando}><VerificarCertificado /></Suspense>} />

      {/* Cualquier usuario con sesión */}
      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/cursos" element={<CatalogoPagina />} />
          <Route path="/cursos/:id" element={<DetallePagina />} />
          <Route path="/cursos/:id/evaluaciones" element={<EvaluacionesPagina />} />
          {/* Temporal hasta que evaluaciones pase a GraphQL */}
          <Route
            path="/evaluaciones-demo"
            element={
              <Suspense fallback={<p className="texto-suave">Cargando...</p>}>
                <EvaluacionesDemo />
              </Suspense>
            }
          />
          {/* Notificaciones (María) */}
          <Route path="/notificaciones" element={<Suspense fallback={cargando}><MisNotificaciones /></Suspense>} />
        </Route>
      </Route>

      {/* Certificados del estudiante (María) */}
      <Route element={<RutaProtegida roles={['ESTUDIANTE']} />}>
        <Route element={<Layout />}>
          <Route path="/mis-certificados" element={<Suspense fallback={cargando}><MisCertificados /></Suspense>} />
        </Route>
      </Route>

      {/* Solo ESTUDIANTE */}
      <Route element={<RutaProtegida roles={['ESTUDIANTE']} />}>
        <Route element={<Layout />}>
          <Route path="/mis-cursos" element={<MisCursos />} />
        </Route>
      </Route>

      {/* DOCENTE o ADMINISTRADOR: gestión de cursos (módulo cursos) */}
      <Route element={<RutaProtegida roles={['DOCENTE', 'ADMINISTRADOR']} />}>
        <Route element={<Layout />}>
          <Route path="/docente/cursos" element={<GestionCursosPagina />} />
          <Route path="/docente/cursos/nuevo" element={<FormularioCursoPagina />} />
          <Route path="/docente/cursos/:id/editar" element={<FormularioCursoPagina />} />
        </Route>
      </Route>

      {/* Solo ADMINISTRADOR */}
      <Route element={<RutaProtegida roles={['ADMINISTRADOR']} />}>
        <Route element={<Layout />}>
          <Route path="/admin/usuarios" element={<Usuarios />} />
        </Route>
      </Route>

      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  );
}
