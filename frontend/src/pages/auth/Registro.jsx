import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LOGIN, REGISTRO } from '../../api/usuarios';
import { useSesion } from '../../context/SesionContext';
import { mensajeDeError } from '../../utils/errores';

const LARGO_MINIMO_CLAVE = 6; // el mismo que valida ms-usuarios

const VACIO = { nombres: '', apellidos: '', email: '', password: '', confirmar: '' };

function validar(datos) {
  if (!datos.nombres.trim() || !datos.apellidos.trim() || !datos.email.trim() || !datos.password) {
    return 'Completa todos los campos';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
    return 'El correo no tiene un formato válido';
  }
  if (datos.password.length < LARGO_MINIMO_CLAVE) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres`;
  }
  if (datos.password !== datos.confirmar) {
    return 'Las contraseñas no coinciden';
  }
  return '';
}

export default function Registro() {
  const { usuario, iniciarSesion } = useSesion();
  const navigate = useNavigate();
  const [datos, setDatos] = useState(VACIO);
  const [error, setError] = useState('');
  const [registro, { loading: registrando }] = useMutation(REGISTRO);
  const [login, { loading: entrando }] = useMutation(LOGIN);

  if (usuario) return <Navigate to="/" replace />;

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });
  const ocupado = registrando || entrando;

  async function enviar(e) {
    e.preventDefault();
    const problema = validar(datos);
    setError(problema);
    if (problema) return;

    const input = {
      nombres: datos.nombres.trim(),
      apellidos: datos.apellidos.trim(),
      email: datos.email.trim(),
      password: datos.password,
    };

    try {
      await registro({ variables: { input } });
    } catch (err) {
      setError(mensajeDeError(err));
      return;
    }

    // Cuenta creada: se inicia sesión de una vez para no pedir los datos otra vez.
    try {
      const { data } = await login({ variables: { email: input.email, password: input.password } });
      iniciarSesion(data.login.token, data.login.usuario);
      navigate('/', { replace: true });
    } catch {
      navigate('/login', {
        replace: true,
        state: { email: input.email, aviso: 'Tu cuenta se creó. Ahora inicia sesión.' },
      });
    }
  }

  return (
    <div className="pagina-centro">
      <form className="tarjeta tarjeta-angosta formulario" onSubmit={enviar} noValidate>
        <h1 className="titulo">Crear cuenta</h1>
        <p className="texto-suave">Regístrate como estudiante para inscribirte en los cursos</p>

        {error && <p className="alerta alerta-error" role="alert">{error}</p>}

        <div className="fila">
          <label className="campo">
            <span>Nombres</span>
            <input autoComplete="given-name" value={datos.nombres} onChange={cambiar('nombres')} autoFocus />
          </label>
          <label className="campo">
            <span>Apellidos</span>
            <input autoComplete="family-name" value={datos.apellidos} onChange={cambiar('apellidos')} />
          </label>
        </div>

        <label className="campo">
          <span>Correo</span>
          <input
            type="email"
            autoComplete="email"
            value={datos.email}
            onChange={cambiar('email')}
            placeholder="ana@unl.edu.ec"
          />
        </label>

        <label className="campo">
          <span>Contraseña</span>
          <input type="password" autoComplete="new-password" value={datos.password} onChange={cambiar('password')} />
          <small className="texto-suave">Mínimo {LARGO_MINIMO_CLAVE} caracteres</small>
        </label>

        <label className="campo">
          <span>Repite la contraseña</span>
          <input type="password" autoComplete="new-password" value={datos.confirmar} onChange={cambiar('confirmar')} />
        </label>

        <button type="submit" className="boton boton-ancho" disabled={ocupado}>
          {registrando ? 'Creando cuenta...' : entrando ? 'Entrando...' : 'Crear cuenta'}
        </button>

        <p className="texto-suave pie-formulario">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
