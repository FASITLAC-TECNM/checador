// services/solicitudesService.js
// Servicio para gestión de solicitudes de escritorio

import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');
/**
 * Obtener todas las solicitudes
 */
export const getSolicitudes = async () => {
    try {
        const response = await fetch(`${API_URL}/solicitudes-escritorio`);
        if (!response.ok) throw new Error('Error al obtener solicitudes');
        return await response.json();
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        throw error;
    }
};

/**
 * Obtener solicitudes pendientes
 */
export const getSolicitudesPendientes = async () => {
    try {
        const response = await fetch(`${API_URL}/solicitudes-escritorio/pendientes`);
        if (!response.ok) throw new Error('Error al obtener solicitudes pendientes');
        return await response.json();
    } catch (error) {
        console.error('Error al obtener solicitudes pendientes:', error);
        throw error;
    }
};

/**
 * Obtener una solicitud por ID
 */
export const getSolicitudById = async (id) => {
    try {
        const response = await fetch(`${API_URL}/solicitudes-escritorio/${id}`);
        if (!response.ok) throw new Error('Error al obtener solicitud');
        return await response.json();
    } catch (error) {
        console.error('Error al obtener solicitud:', error);
        throw error;
    }
};

/**
 * Crear una nueva solicitud
 */
export const createSolicitud = async (solicitudData) => {
    try {
        const response = await fetch(`${API_URL}/solicitudes-escritorio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(solicitudData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear solicitud');
        }
        return await response.json();
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        throw error;
    }
};

/**
 * Aceptar una solicitud
 */
export const aceptarSolicitud = async (id, idUsuarioAprobador) => {
    try {
        const response = await fetch(`${API_URL}/solicitudes-escritorio/${id}/aceptar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id_usuario_aprobador: idUsuarioAprobador }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al aceptar solicitud');
        }
        return await response.json();
    } catch (error) {
        console.error('Error al aceptar solicitud:', error);
        throw error;
    }
};

/**
 * Rechazar una solicitud
 */
export const rechazarSolicitud = async (id, idUsuarioAprobador, motivoRechazo) => {
    try {
        const response = await fetch(`${API_URL}/solicitudes-escritorio/${id}/rechazar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id_usuario_aprobador: idUsuarioAprobador,
                motivo_rechazo: motivoRechazo
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al rechazar solicitud');
        }
        return await response.json();
    } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        throw error;
    }
};

/**
 * Eliminar una solicitud
 */
export const deleteSolicitud = async (id) => {
    try {
        const response = await fetch(`${API_URL}/solicitudes-escritorio/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar solicitud');
        }
        return await response.json();
    } catch (error) {
        console.error('Error al eliminar solicitud:', error);
        throw error;
    }
};

/**
 * Obtener estadísticas de solicitudes
 */
export const getEstadisticas = async () => {
    try {
        const response = await fetch(`${API_URL}/solicitudes-escritorio/stats`);
        if (!response.ok) throw new Error('Error al obtener estadísticas');
        return await response.json();
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        throw error;
    }
};

export default {
    getSolicitudes,
    getSolicitudesPendientes,
    getSolicitudById,
    createSolicitud,
    aceptarSolicitud,
    rechazarSolicitud,
    deleteSolicitud,
    getEstadisticas
};
