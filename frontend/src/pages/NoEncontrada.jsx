import { Link } from 'react-router-dom';

export default function NoEncontrada() {
  return (
    <div className="pagina-centro">
      <div className="tarjeta tarjeta-angosta">
        <p className="codigo-grande">404</p>
        <h1 className="titulo">Esta página no existe</h1>
        <Link to="/" className="boton">Volver al inicio</Link>
      </div>
    </div>
  );
}
