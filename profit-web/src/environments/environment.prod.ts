export const environment = {
  production: true,
  apiUrl: 'https://your-production-api.com/api',
  // acceso-service corre en la PC del kiosco. Va por HTTPS porque la app se sirve
  // por HTTPS y Chrome bloquea el salto a la red local desde un origen público
  // si el destino no es un contexto seguro (ver acceso-service/README.md).
  javaServiceUrl: 'https://localhost:8443'
};
