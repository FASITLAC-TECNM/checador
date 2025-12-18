import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');

console.log('📱 Dispositivos Móviles API URL:', API_URL);

/**
 * Obtener todos los dispositivos móviles
 */
export const getDispositivosMoviles = async () => {
    try {
        const response = await fetch(`${API_URL}/dispositivos-moviles`);
        if (!response.ok) throw new Error('Error al obtener dispositivos móviles');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener dispositivo móvil por ID
 */
export const getDispositivoMovilById = async (id) => {
    try {
        const response = await fetch(`${API_URL}/dispositivos-moviles/${id}`);
        if (!response.ok) throw new Error('Error al obtener dispositivo móvil');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener dispositivos móviles de un usuario
 */
export const getDispositivosMovilesPorUsuario = async (id_usuario) => {
    try {
        const response = await fetch(`${API_URL}/dispositivos-moviles/usuario/${id_usuario}`);
        if (!response.ok) throw new Error('Error al obtener dispositivos del usuario');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener dispositivos móviles de un empleado
 */
export const getDispositivosMovilesPorEmpleado = async (id_empleado) => {
    try {
        const response = await fetch(`${API_URL}/dispositivos-moviles/empleado/${id_empleado}`);
        if (!response.ok) throw new Error('Error al obtener dispositivos del empleado');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Crear dispositivo móvil
 */
export const createDispositivoMovil = async (dispositivoData) => {
    try {
        const response = await fetch(`${API_URL}/dispositivos-moviles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dispositivoData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear dispositivo móvil');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Actualizar dispositivo móvil
 */
export const updateDispositivoMovil = async (id, dispositivoData) => {
    try {
        const response = await fetch(`${API_URL}/dispositivos-moviles/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dispositivoData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar dispositivo móvil');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Eliminar dispositivo móvil
 */
export const deleteDispositivoMovil = async (id) => {
    try {
        const response = await fetch(`${API_URL}/dispositivos-moviles/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar dispositivo móvil');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export default {
    getDispositivosMoviles,
    getDispositivoMovilById,
    getDispositivosMovilesPorUsuario,
    getDispositivosMovilesPorEmpleado,
    createDispositivoMovil,
    updateDispositivoMovil,
    deleteDispositivoMovil
};
