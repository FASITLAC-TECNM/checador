import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

/**
 * Obtiene todas las incidencias con filtros opcionales
 */
export const getIncidencias = async (token, filtros = {}) => {
    try {
        const params = new URLSearchParams();
        
        if (filtros.empleado_id) params.append('empleado_id', filtros.empleado_id);
        if (filtros.tipo) params.append('tipo', filtros.tipo);
        if (filtros.estado) params.append('estado', filtros.estado);
        if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
        if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
        if (filtros.limit) params.append('limit', filtros.limit);
        if (filtros.offset) params.append('offset', filtros.offset);

        const url = `${API_URL}/incidencias${params.toString() ? `?${params}` : ''}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error del servidor (${response.status})`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Obtiene incidencias de un empleado específico
 */
export const getIncidenciasEmpleado = async (empleadoId, token, filtros = {}) => {
    try {
        return await getIncidencias(token, { ...filtros, empleado_id: empleadoId });
    } catch (error) {
        throw error;
    }
};

/**
 * Obtiene una incidencia por ID
 */
export const getIncidenciaById = async (incidenciaId, token) => {
    try {
        const response = await fetch(`${API_URL}/incidencias/${incidenciaId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error del servidor (${response.status})`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Crea una nueva incidencia
 */
export const createIncidencia = async (incidenciaData, token) => {
    try {

        const response = await fetch(`${API_URL}/incidencias`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(incidenciaData)
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch {
                errorData = { message: responseText };
            }
            throw new Error(errorData.message || `Error del servidor (${response.status})`);
        }

        const data = JSON.parse(responseText);
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Actualiza una incidencia pendiente
 */
export const updateIncidencia = async (incidenciaId, incidenciaData, token) => {
    try {
        const response = await fetch(`${API_URL}/incidencias/${incidenciaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(incidenciaData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error del servidor (${response.status})`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Aprueba una incidencia
 */
export const aprobarIncidencia = async (incidenciaId, observaciones, token) => {
    try {
        const response = await fetch(`${API_URL}/incidencias/${incidenciaId}/aprobar`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ observaciones })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error del servidor (${response.status})`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Rechaza una incidencia
 */
export const rechazarIncidencia = async (incidenciaId, observaciones, token) => {
    try {
        const response = await fetch(`${API_URL}/incidencias/${incidenciaId}/rechazar`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ observaciones })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error del servidor (${response.status})`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Obtiene incidencias pendientes
 */
export const getIncidenciasPendientes = async (token) => {
    try {
        const response = await fetch(`${API_URL}/incidencias/pendientes`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error del servidor (${response.status})`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
};

export default {
    getIncidencias,
    getIncidenciasEmpleado,
    getIncidenciaById,
    createIncidencia,
    updateIncidencia,
    aprobarIncidencia,
    rechazarIncidencia,
    getIncidenciasPendientes
};