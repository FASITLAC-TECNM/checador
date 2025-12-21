// services/escritoriosService.js
// Servicio modular para gestión de escritorios/dispositivos

import { getApiEndpoint } from '../config/api';

// Usar la configuración centralizada
const API_URL = getApiEndpoint('/api');
/**
 * Obtener todos los dispositivos
 */
export const getDevices = async () => {
    try {
        const response = await fetch(`${API_URL}/escritorios`);
        if (!response.ok) throw new Error('Error al obtener dispositivos');
        return await response.json();
    } catch (error) {
        console.error('Error al obtener dispositivos:', error);
        throw error;
    }
};

/**
 * Obtener un dispositivo por ID
 */
export const getDeviceById = async (id) => {
    try {
        const response = await fetch(`${API_URL}/escritorios/${id}`);
        if (!response.ok) throw new Error('Error al obtener dispositivo');
        return await response.json();
    } catch (error) {
        console.error('Error al obtener dispositivo:', error);
        throw error;
    }
};

/**
 * Crear un nuevo dispositivo
 */
export const createDevice = async (deviceData) => {
    try {
        const response = await fetch(`${API_URL}/escritorios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(deviceData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear dispositivo');
        }
        return await response.json();
    } catch (error) {
        console.error('Error al crear dispositivo:', error);
        throw error;
    }
};

/**
 * Actualizar un dispositivo
 */
export const updateDevice = async (id, deviceData) => {
    try {
        const response = await fetch(`${API_URL}/escritorios/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(deviceData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar dispositivo');
        }
        return await response.json();
    } catch (error) {
        console.error('Error al actualizar dispositivo:', error);
        throw error;
    }
};

/**
 * Eliminar un dispositivo
 */
export const deleteDevice = async (id) => {
    try {
        const response = await fetch(`${API_URL}/escritorios/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar dispositivo');
        }
        return await response.json();
    } catch (error) {
        console.error('Error al eliminar dispositivo:', error);
        throw error;
    }
};

/**
 * Actualizar el estado de un dispositivo
 */
export const updateDeviceStatus = async (id, estado) => {
    try {
        const response = await fetch(`${API_URL}/escritorios/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ estado }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar estado del dispositivo');
        }
        return await response.json();
    } catch (error) {
        console.error('Error al actualizar estado del dispositivo:', error);
        throw error;
    }
};

/**
 * Registrar ping de dispositivo
 */
export const pingDevice = async (deviceId) => {
    try {
        const response = await fetch(`${API_URL}/escritorios/${deviceId}/ping`, {
            method: 'POST',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al registrar ping');
        }
        return await response.json();
    } catch (error) {
        console.error('Error al registrar ping:', error);
        throw error;
    }
};

/**
 * Obtener estadísticas de dispositivos
 */
export const getDeviceStats = async () => {
    try {
        const response = await fetch(`${API_URL}/escritorios/stats`);
        if (!response.ok) throw new Error('Error al obtener estadísticas');
        return await response.json();
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        throw error;
    }
};

export default {
    getDevices,
    getDeviceById,
    createDevice,
    updateDevice,
    deleteDevice,
    updateDeviceStatus,
    pingDevice,
    getDeviceStats
};
