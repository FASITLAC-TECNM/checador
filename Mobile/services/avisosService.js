// services/avisosService.js
// Servicio para avisos globales (con cacheo) y avisos por empleado (bajo demanda)

import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

// Cache en memoria para avisos globales
let cacheGlobal = {
    data: null,
    timestamp: null,
};

// Duración del cache: 5 minutos
const CACHE_DURACION_MS = 5 * 60 * 1000;

/**
 * Verifica si el cache global sigue vigente
 */
const cacheEsValido = () => {
    if (!cacheGlobal.data || !cacheGlobal.timestamp) return false;
    return (Date.now() - cacheGlobal.timestamp) < CACHE_DURACION_MS;
};

/**
 * Limpia el cache de avisos globales (para forzar recarga)
 */
export const limpiarCacheAvisos = () => {
    cacheGlobal = { data: null, timestamp: null };
};

/**
 * GET /api/avisos/globales
 * Obtiene avisos globales con cacheo en memoria
 * @param {string} token - Token de autenticación
 * @param {boolean} forzarRecarga - Si es true, ignora el cache
 * @returns {Promise<Object>}
 */
export const getAvisosGlobales = async (token, forzarRecarga = false) => {
    // Retornar cache si es válido y no se fuerza recarga
    if (!forzarRecarga && cacheEsValido()) {
        return { success: true, data: cacheGlobal.data, fromCache: true };
    }

    const response = await fetch(`${API_URL}/avisos/globales`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Error al obtener avisos globales');
    }

    const resultado = await response.json();

    // Guardar en cache
    if (resultado.success) {
        cacheGlobal = {
            data: resultado.data,
            timestamp: Date.now(),
        };
    }

    return { ...resultado, fromCache: false };
};

/**
 * GET /api/empleados/:id/avisos
 * Obtiene avisos específicos de un empleado (sin cacheo, solo bajo demanda)
 * @param {string} token - Token de autenticación
 * @param {number} empleadoId - ID del empleado
 * @returns {Promise<Object>}
 */
export const getAvisosDeEmpleado = async (token, empleadoId) => {
    const response = await fetch(`${API_URL}/empleados/${empleadoId}/avisos`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Error al obtener avisos del empleado');
    }

    const resultado = await response.json();
    return resultado;
};

export default {
    getAvisosGlobales,
    getAvisosDeEmpleado,
    limpiarCacheAvisos
};
