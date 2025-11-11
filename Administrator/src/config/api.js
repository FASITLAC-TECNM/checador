// Configuración de la API
const getApiUrl = () => {
    // Si está definida la variable de entorno, usarla
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // Detectar automáticamente si estamos en devtunnel
    const currentHost = window.location.host;

    if (currentHost.includes('devtunnels.ms')) {
        // Estamos en devtunnel, usar la URL del backend devtunnel
        return 'https://9dm7dqf9-3001.usw3.devtunnels.ms';
    }

    // Por defecto, usar localhost
    return 'http://localhost:3001';
};

export const API_URL = getApiUrl();

// Helper para construir URLs de endpoints
export const getApiEndpoint = (path) => {
    // Asegurarse de que path empiece con /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_URL}${cleanPath}`;
};

export default {
    API_URL,
    getApiEndpoint
};
