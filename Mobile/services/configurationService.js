// services/configuracion.service.js
import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');

// Orden por defecto si no hay datos en el backend
const ORDEN_CREDENCIALES_DEFAULT = {
    pin: { prioridad: 1, activo: true },
    dactilar: { prioridad: 2, activo: true },
    facial: { prioridad: 3, activo: true }
};

/**
 * Servicio para gestionar configuración del sistema
 */

// Obtener configuración actual
export const getConfiguracion = async (token) => {
    try {
        // Obtener la configuración directamente
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

        const config = await configResponse.json();

        // Parsear campos JSON si vienen como string
        let paletaColores = config.paleta_colores;
        if (typeof paletaColores === 'string') {
            try {
                paletaColores = JSON.parse(paletaColores);
            } catch (e) {
                console.error('Error parseando paleta_colores:', e);
            }
        }

        let ordenCredenciales = config.credenciales_orden || config.orden_credenciales;
        if (typeof ordenCredenciales === 'string') {
            try {
                ordenCredenciales = JSON.parse(ordenCredenciales);
            } catch (e) {
                console.error('Error parseando orden_credenciales:', e);
            }
        }

        // Si es un array (formato antiguo), convertir a objeto
        if (Array.isArray(ordenCredenciales)) {
            const nuevoOrden = {};
            ordenCredenciales.forEach((metodo, index) => {
                nuevoOrden[metodo] = { prioridad: index + 1, activo: true };
            });
            ordenCredenciales = nuevoOrden;
        }

        // Si no hay orden_credenciales, usar el por defecto
        if (!ordenCredenciales) {
            ordenCredenciales = { ...ORDEN_CREDENCIALES_DEFAULT };
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
        console.error('Error en getConfiguracion:', error);
        throw error;
    }
};

// Actualizar configuración (solo admin)
export const updateConfiguracion = async (configuracionData, token) => {
    try {
        
        const response = await fetch(`${API_URL}/configuracion`, {
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

        return {
            success: true,
            data
        };
        
    } catch (error) {
        throw error;
    }
};

// Alternar modo mantenimiento (solo admin)
export const toggleMantenimiento = async (token) => {
    try {
        
        const response = await fetch(`${API_URL}/configuracion/mantenimiento`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al alternar mantenimiento');
        }

        const data = await response.json();

        return {
            success: true,
            data
        };
        
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

        // Orden por defecto si no hay configuración
        return {
            success: true,
            ordenCredenciales: { ...ORDEN_CREDENCIALES_DEFAULT }
        };

    } catch (error) {
        console.error('Error obteniendo orden de credenciales:', error);
        return {
            success: true,
            ordenCredenciales: { ...ORDEN_CREDENCIALES_DEFAULT }
        };
    }
};

export default {
    getConfiguracion,
    updateConfiguracion,
    toggleMantenimiento,
    getOrdenCredenciales
};