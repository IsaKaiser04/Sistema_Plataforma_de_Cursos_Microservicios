import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LOGIN } from '../../api/usuarios';
import { useSesion } from '../../context/SesionContext';
import { mensajeDeError } from '../../utils/errores';

export default function Login() {
  const { usuario, iniciarSesion } = useSesion();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [login, { loading }] = useMutation(LOGIN);

  // Ya hay sesión: no tiene sentido mostrar el login.
  if (usuario) return <Navigate to="/" replace />;

  const aviso = location.state?.aviso;

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña');
      return;
    }
    try {
      const { data } = await login({ variables: { email: email.trim(), password } });
      iniciarSesion(data.login.token, data.login.usuario);
      navigate(location.state?.desde || '/', { replace: true });
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

  return (
    <div className="pagina-centro">
      <form className="tarjeta tarjeta-angosta formulario" onSubmit={enviar} noValidate>
        <h1 className="titulo">Iniciar sesión</h1>
        <p className="texto-suave">Entra a la Plataforma de Cursos</p>

        {aviso && <p className="alerta alerta-info">{aviso}</p>}
        {error && <p className="alerta alerta-error" role="alert">{error}</p>}

        <label className="campo">
          <span>Correo</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ana@unl.edu.ec"
            autoFocus
          />
        </label>

        <label className="campo">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" className="boton boton-ancho" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="texto-suave pie-formulario">
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
        </p>
      </form>
    </div>
  );
}
