import { useQuery } from '@apollo/client';
import { NavLink } from 'react-router-dom';
import { TOTAL_NO_LEIDAS } from '../api/notificaciones';
import '../styles/notificaciones.css';

// Campana del menú (frontend.md, T7): consulta el contador cada 15 segundos (P5).
// Si ms-certificados no responde, la campana se muestra sin número y el resto sigue igual.
export default function CampanaNotificaciones() {
  const { data } = useQuery(TOTAL_NO_LEIDAS, {
    pollInterval: 15000,
    fetchPolicy: 'cache-and-network',
  });
  const total = data?.totalNoLeidas ?? 0;
  const etiqueta = total > 0 ? `Notificaciones, ${total} sin leer` : 'Notificaciones';

  return (
    <NavLink to="/notificaciones" className="notif-campana" aria-label={etiqueta} title={etiqueta}>
      <span aria-hidden="true">🔔</span>
      {total > 0 && <span className="notif-contador">{total > 99 ? '99+' : total}</span>}
    </NavLink>
  );
}
