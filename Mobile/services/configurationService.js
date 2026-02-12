// services/configuracion.service.js
import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');

/**
 * Servicio para gestionar configuración del sistema
 */

// Obtener configuración actual
export const getConfiguracion = async (token) => {
    try {
        const configResponse = await fetch(`${API_URL}/configuracion`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!configResponse.ok) {
            const errorData = await configResponse.json();
            throw new Error(errorData.error || 'Error al obtener configuración');
        }

        const responseJson = await configResponse.json();

        // El backend retorna { success, data: { ...campos... } }
        const config = responseJson.data || responseJson;

        // Parsear campos JSON si vienen como string
        let paletaColores = config.paleta_colores;
        if (typeof paletaColores === 'string') {
            try {
                paletaColores = JSON.parse(paletaColores);
            } catch (e) {
                // ignorar error de parseo
            }
        }

        // Buscar orden_credenciales en los campos posibles
        let ordenCredenciales = config.credenciales_orden || config.orden_credenciales;

        if (typeof ordenCredenciales === 'string') {
            try {
                ordenCredenciales = JSON.parse(ordenCredenciales);
            } catch (e) {
                // ignorar error de parseo
            }
        }

        // Si es un array, convertir a objeto con prioridad por posición
        if (Array.isArray(ordenCredenciales)) {
            const nuevoOrden = {};
            ordenCredenciales.forEach((metodo, index) => {
                nuevoOrden[metodo] = { prioridad: index + 1, activo: true };
            });
            ordenCredenciales = nuevoOrden;
        }

        const configuracion = {
            ...config,
            paleta_colores: paletaColores,
            credenciales_orden: ordenCredenciales,
            orden_credenciales: ordenCredenciales
        };

        return {
            success: true,
            data: configuracion
        };

    } catch (error) {
        throw error;
    }
};

// Actualizar configuración (solo admin)
export const updateConfiguracion = async (configId, configuracionData, token) => {
    try {
        const response = await fetch(`${API_URL}/configuracion/${configId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configuracionData)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al actualizar configuración');
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error) {
        throw error;
    }
};

// Alternar modo mantenimiento (solo admin)
export const toggleMantenimiento = async (configId, esMantenimiento, token) => {
    try {
        const response = await fetch(`${API_URL}/configuracion/${configId}/mantenimiento`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ es_mantenimiento: esMantenimiento })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al alternar mantenimiento');
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error) {
        throw error;
    }
};

// Obtener solo el orden de credenciales
export const getOrdenCredenciales = async (token) => {
    try {
        const response = await getConfiguracion(token);

        if (response.success && response.data.orden_credenciales) {
            return {
                success: true,
                ordenCredenciales: response.data.orden_credenciales
            };
        }

        return {
            success: true,
            ordenCredenciales: null
        };

    } catch (error) {
        return {
            success: true,
            ordenCredenciales: null
        };
    }
};

export default {
    getConfiguracion,
    updateConfiguracion,
    toggleMantenimiento,
    getOrdenCredenciales
};
