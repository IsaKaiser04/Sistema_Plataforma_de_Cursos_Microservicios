import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREAR_USUARIO } from '../../api/usuarios';
import { mensajeDeError } from '../../utils/errores';

const LARGO_MINIMO_CLAVE = 6; // el mismo que valida ms-usuarios
const VACIO = { nombres: '', apellidos: '', email: '', password: '', rol: 'DOCENTE' };

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
  return '';
}

// Los estudiantes se registran solos; aquí el administrador crea docentes y otros administradores.
export default function FormularioUsuario({ alCrear }) {
  const [datos, setDatos] = useState(VACIO);
  const [error, setError] = useState('');
  const [creado, setCreado] = useState(null);
  const [crearUsuario, { loading }] = useMutation(CREAR_USUARIO, { refetchQueries: ['Usuarios'] });

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setCreado(null);
    const problema = validar(datos);
    setError(problema);
    if (problema) return;

    try {
      const { data } = await crearUsuario({
        variables: {
          input: {
            nombres: datos.nombres.trim(),
            apellidos: datos.apellidos.trim(),
            email: datos.email.trim(),
            password: datos.password,
            rol: datos.rol,
          },
        },
      });
      setCreado(data.crearUsuario);
      setDatos({ ...VACIO, rol: datos.rol });
      alCrear?.(data.crearUsuario);
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

  return (
    <form className="tarjeta formulario" onSubmit={enviar} noValidate>
      <h2 className="subtitulo">Crear docente o administrador</h2>

      {error && <p className="alerta alerta-error" role="alert">{error}</p>}
      {creado && (
        <p className="alerta alerta-exito">
          Se creó {creado.rol === 'DOCENTE' ? 'el docente' : 'el administrador'} {creado.nombres} {creado.apellidos}.
        </p>
      )}

      <div className="fila">
        <label className="campo">
          <span>Nombres</span>
          <input value={datos.nombres} onChange={cambiar('nombres')} />
        </label>
        <label className="campo">
          <span>Apellidos</span>
          <input value={datos.apellidos} onChange={cambiar('apellidos')} />
        </label>
      </div>

      <label className="campo">
        <span>Correo</span>
        <input type="email" value={datos.email} onChange={cambiar('email')} placeholder="docente@unl.edu.ec" />
      </label>

      <div className="fila">
        <label className="campo">
          <span>Contraseña inicial</span>
          <input type="password" autoComplete="new-password" value={datos.password} onChange={cambiar('password')} />
        </label>
        <label className="campo">
          <span>Rol</span>
          <select value={datos.rol} onChange={cambiar('rol')}>
            <option value="DOCENTE">Docente</option>
            <option value="ADMINISTRADOR">Administrador</option>
          </select>
        </label>
      </div>

      <button type="submit" className="boton" disabled={loading}>
        {loading ? 'Creando...' : 'Crear usuario'}
      </button>
    </form>
  );
}
