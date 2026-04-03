import { useState } from 'react';

/**
 * Hook personalizado para manejo consistente de peticiones fetch
 * @returns {Object} { fetchData, loading, error }
 */
export const useFetch = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Realiza una petición fetch con manejo de errores consistente
     * @param {string} url - URL del endpoint
     * @param {Object} options - Opciones de fetch (method, body, headers, etc)
     * @returns {Promise<Object>} - Respuesta parseada como JSON
     */
    const fetchData = async (url, options = {}) => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('auth_token');

            const response = await fetch(url, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...options.headers,
                }
            });

            // Manejo de errores HTTP
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message ||
                    `HTTP ${response.status}: ${response.statusText}`
                );
            }

            const data = await response.json();
            return data;

        } catch (err) {
            const errorMessage = err.message || 'Error desconocido';
            setError(errorMessage);
            console.error('Error en fetch:', errorMessage);
            throw err;

        } finally {
            setLoading(false);
        }
    };

    /**
     * Realiza una petición GET
     */
    const get = (url, options = {}) => {
        return fetchData(url, { ...options, method: 'GET' });
    };

    /**
     * Realiza una petición POST
     */
    const post = (url, body, options = {}) => {
        return fetchData(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });
    };

    /**
     * Realiza una petición PUT
     */
    const put = (url, body, options = {}) => {
        return fetchData(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
        });
    };

    /**
     * Realiza una petición PATCH
     */
    const patch = (url, body, options = {}) => {
        return fetchData(url, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    };

    /**
     * Realiza una petición DELETE
     */
    const del = (url, options = {}) => {
        return fetchData(url, { ...options, method: 'DELETE' });
    };

    return {
        fetchData,
        get,
        post,
        put,
        patch,
        del,
        loading,
        error,
    };
};
