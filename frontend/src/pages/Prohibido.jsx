import { Link } from 'react-router-dom';

export default function Prohibido() {
  return (
    <div className="pagina-centro">
      <div className="tarjeta tarjeta-angosta">
        <p className="codigo-grande">403</p>
        <h1 className="titulo">No tienes permiso para ver esta página</h1>
        <p className="texto-suave">Tu rol no tiene acceso a esta sección.</p>
        <Link to="/" className="boton">Volver al inicio</Link>
      </div>
    </div>
  );
}
