// config/api.js
// Configuración centralizada de la API
export const getApiEndpoint = (path = '') => {
    const BASE_URL = 'https://9dm7dqf9-3001.usw3.devtunnels.ms';  // Puerto 3001 para el backend
    // Asegurar que path empiece con /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

export default getApiEndpoint;