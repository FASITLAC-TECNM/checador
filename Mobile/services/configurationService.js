// services/configuracion.service.js
import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');

/**
 * Servicio para gestionar configuración del sistema
 */

// Obtener configuración actual
export const getConfiguracion = async (token) => {
    try {
        
        const response = await fetch(`${API_URL}/configuracion`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al obtener configuración');
        }

        const data = await response.json();
        
        // Parsear campos JSON si vienen como string
        const configuracion = {
            ...data,
            paleta_colores: typeof data.paleta_colores === 'string'
                ? JSON.parse(data.paleta_colores)
                : data.paleta_colores,
            credenciales_orden: typeof data.credenciales_orden === 'string'
                ? JSON.parse(data.credenciales_orden)
                : data.credenciales_orden
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
        
        if (response.success && response.data.credenciales_orden) {
            return {
                success: true,
                orden: response.data.credenciales_orden
            };
        }
        
        // Orden por defecto si no hay configuración
        return {
            success: true,
            orden: ['pin', 'dactilar', 'facial']
        };
        
    } catch (error) {
        return {
            success: true,
            orden: ['pin', 'dactilar', 'facial']
        };
    }
};

export default {
    getConfiguracion,
    updateConfiguracion,
    toggleMantenimiento,
    getOrdenCredenciales
};