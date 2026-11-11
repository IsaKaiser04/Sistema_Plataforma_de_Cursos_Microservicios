import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { obtenerToken } from './context/sesionGuardada';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:4000/graphql';

// SesionContext registra aquí qué hacer cuando el gateway dice NO_AUTENTICADO.
let alPerderSesionFn = () => {};
export function alPerderSesion(fn) {
  alPerderSesionFn = fn;
  return () => {
    alPerderSesionFn = () => {};
  };
}

// Agrega "Authorization: Bearer <token>" a cada petición si hay sesión.
const authLink = setContext((_, { headers }) => {
  const token = obtenerToken();
  return { headers: { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
});

// Si había sesión y el gateway responde NO_AUTENTICADO, el token ya no sirve.
// (En el login sin sesión ese código solo significa credenciales inválidas.)
const errorLink = onError(({ graphQLErrors }) => {
  const sinAutenticar = graphQLErrors?.some((e) => e.extensions?.code === 'NO_AUTENTICADO');
  if (sinAutenticar && obtenerToken()) alPerderSesionFn();
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, new HttpLink({ uri: GATEWAY_URL })]),
  cache: new InMemoryCache(),
});
