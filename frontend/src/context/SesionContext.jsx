import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client, alPerderSesion } from '../apollo';
import { leerSesion, guardarSesion, borrarSesion } from './sesionGuardada';

const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(() => leerSesion());
  const navigate = useNavigate();

  const iniciarSesion = useCallback((token, usuario) => {
    const nueva = { token, usuario };
    guardarSesion(nueva);
    setSesion(nueva);
  }, []);

  const cerrarSesion = useCallback(
    (aviso) => {
      borrarSesion();
      setSesion(null);
      client.clearStore().catch(() => {});
      navigate('/login', { replace: true, state: aviso ? { aviso } : undefined });
    },
    [navigate]
  );

  // Token vencido o inválido: se limpia la sesión y se manda al login (frontend.md, T2).
  useEffect(
    () => alPerderSesion(() => cerrarSesion('Tu sesión expiró, vuelve a iniciar sesión')),
    [cerrarSesion]
  );

  const valor = useMemo(
    () => ({ sesion, usuario: sesion?.usuario ?? null, iniciarSesion, cerrarSesion }),
    [sesion, iniciarSesion, cerrarSesion]
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion se usa dentro de <SesionProvider>');
  return contexto;
}
