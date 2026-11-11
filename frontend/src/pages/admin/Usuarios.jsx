import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { USUARIOS, CAMBIAR_ESTADO_USUARIO } from '../../api/usuarios';
import { useSesion } from '../../context/SesionContext';
import { mensajeDeError } from '../../utils/errores';
import FormularioUsuario from './FormularioUsuario';

const FILTROS = [
  { valor: '', texto: 'Todos' },
  { valor: 'ESTUDIANTE', texto: 'Estudiantes' },
  { valor: 'DOCENTE', texto: 'Docentes' },
  { valor: 'ADMINISTRADOR', texto: 'Administradores' },
];

const NOMBRE_ROL = { ADMINISTRADOR: 'Administrador', DOCENTE: 'Docente', ESTUDIANTE: 'Estudiante' };

function BotonCopiar({ texto }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin permiso de portapapeles: el id igual se puede seleccionar a mano.
    }
  }
  return (
    <button type="button" className="boton-enlace" onClick={copiar} title="Copiar id">
      {copiado ? 'Copiado' : 'Copiar id'}
    </button>
  );
}

export default function Usuarios() {
  const { usuario: yo } = useSesion();
  const [rol, setRol] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const { data, loading, error } = useQuery(USUARIOS, {
    variables: { rol: rol || null },
    fetchPolicy: 'cache-and-network',
  });
  const [cambiarEstado, { loading: cambiando }] = useMutation(CAMBIAR_ESTADO_USUARIO);

  async function alternarEstado(u) {
    setErrorAccion('');
    try {
      await cambiarEstado({ variables: { id: u.id, activo: !u.activo } });
    } catch (err) {
      setErrorAccion(mensajeDeError(err));
    }
  }

  const usuarios = data?.usuarios ?? [];

  return (
    <section className="seccion">
      <div>
        <h1 className="titulo">Usuarios</h1>
        <p className="texto-suave">
          Crea docentes y administradores, y activa o desactiva cuentas. Un usuario desactivado no puede iniciar sesión.
        </p>
      </div>

      <div className="admin-grid">
        <div className="tarjeta">
          <div className="cabecera-tabla">
            <h2 className="subtitulo">Lista de usuarios</h2>
            <label className="campo campo-en-linea">
              <span>Rol</span>
              <select value={rol} onChange={(e) => setRol(e.target.value)}>
                {FILTROS.map((f) => (
                  <option key={f.valor} value={f.valor}>{f.texto}</option>
                ))}
              </select>
            </label>
          </div>

          {errorAccion && <p className="alerta alerta-error" role="alert">{errorAccion}</p>}
          {error && <p className="alerta alerta-error">{mensajeDeError(error)}</p>}
          {loading && usuarios.length === 0 && <p className="texto-suave">Cargando usuarios...</p>}
          {!loading && !error && usuarios.length === 0 && (
            <p className="texto-suave">No hay usuarios con ese rol.</p>
          )}

          {usuarios.length > 0 && (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => {
                    const soyYo = u.id === yo.id;
                    return (
                      <tr key={u.id} className={u.activo ? '' : 'fila-inactiva'}>
                        <td>
                          <div className="celda-nombre">{`${u.nombres} ${u.apellidos}`.trim() || '—'}</div>
                          <div className="celda-id">
                            <code>{u.id}</code> <BotonCopiar texto={u.id} />
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td><span className="chip">{NOMBRE_ROL[u.rol] || u.rol}</span></td>
                        <td>
                          <span className={u.activo ? 'estado estado-activo' : 'estado estado-inactivo'}>
                            {u.activo ? 'Activo' : 'Desactivado'}
                          </span>
                        </td>
                        <td className="celda-accion">
                          {soyYo ? (
                            <span className="texto-suave">Tú</span>
                          ) : (
                            <button
                              type="button"
                              className="boton boton-secundario"
                              disabled={cambiando}
                              onClick={() => alternarEstado(u)}
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <FormularioUsuario />
      </div>
    </section>
  );
}
