// config/api.js
// Configuración centralizada de la API
export const getApiEndpoint = (path = '') => {
    const BASE_URL = 'https://9dm7dqf9-3002.usw3.devtunnels.ms';  // Puerto 3002 para el backend
    // Asegurar que path empiece con / y evitar doble barra
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

export default getApiEndpoint;