// services/credencialesService.js
// Servicio modular para gestión de credenciales (PIN, dactilar, facial)

import { getApiEndpoint } from '../config/api';

// Usar la configuración centralizada
const API_URL = getApiEndpoint('/api');
/**
 * Obtener credenciales de un empleado
 * @param {number} idEmpleado - ID del empleado
 */
export const getCredencialesByEmpleado = async (idEmpleado) => {
    try {
        const response = await fetch(`${API_URL}/credenciales/empleado/${idEmpleado}`);
        if (!response.ok) {
            if (response.status === 404) {
                return null; // No hay credenciales registradas
            }
            throw new Error('Error al obtener credenciales');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export const getCredencialesPorEmpleado = async (idEmpleado) => {
    const response = await fetch(`${API_URL}/credenciales/empleado/${idEmpleado}`);
    if (!response.ok) throw new Error('Error al obtener credenciales');
    return response.json();
};

/**es
 * Obtener métodos de autenticación configurados para un empleado
 * @param {number} idEmpleado - ID del empleado
 */
export const getMetodosAutenticacion = async (idEmpleado) => {
    try {
        const response = await fetch(`${API_URL}/credenciales/empleado/${idEmpleado}/metodos`);
        if (!response.ok) throw new Error('Error al obtener métodos de autenticación');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Crear credenciales para un empleado
 * @param {Object} credenciales - Datos de las credenciales
 * @param {number} credenciales.id_empleado - ID del empleado
 * @param {string} [credenciales.pin] - PIN de 4 dígitos (opcional)
 */
export const crearCredenciales = async (credenciales) => {
    try {
        // Validar PIN si se proporciona
        if (credenciales.pin) {
            if (!/^\d{4}$/.test(credenciales.pin.toString())) {
                throw new Error('El PIN debe ser un número de 4 dígitos');
            }
        }

        const credencialesDB = {
            id_empleado: credenciales.id_empleado,
            pin: credenciales.pin || null
        };

        const response = await fetch(`${API_URL}/credenciales`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credencialesDB),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear credenciales');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Actualizar credenciales (principalmente PIN)
 * @param {number} idEmpleado - ID del empleado
 * @param {Object} credenciales - Datos a actualizar
 * @param {string} [credenciales.pin] - Nuevo PIN de 4 dígitos
 */
export const actualizarCredenciales = async (idEmpleado, credenciales) => {
    try {
        // Validar PIN si se proporciona
        if (credenciales.pin) {
            if (!/^\d{4}$/.test(credenciales.pin.toString())) {
                throw new Error('El PIN debe ser un número de 4 dígitos');
            }
        }

        const credencialesDB = {
            pin: credenciales.pin || null
        };

        const response = await fetch(`${API_URL}/credenciales/empleado/${idEmpleado}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credencialesDB),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar credenciales');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Eliminar credenciales de un empleado
 * @param {number} idEmpleado - ID del empleado
 */
export const eliminarCredenciales = async (idEmpleado) => {
    try {
        const response = await fetch(`${API_URL}/credenciales/empleado/${idEmpleado}`, {
            method: 'DELETE',
        });

        if (!response.ok) throw new Error('Error al eliminar credenciales');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Validar PIN de un empleado
 * @param {number} idEmpleado - ID del empleado
 * @param {string} pin - PIN a validar (4 dígitos)
 * @returns {Promise<{valido: boolean, message: string}>}
 */
export const validarPin = async (idEmpleado, pin) => {
    try {
        if (!pin || !/^\d{4}$/.test(pin.toString())) {
            throw new Error('El PIN debe ser un número de 4 dígitos');
        }

        const response = await fetch(`${API_URL}/credenciales/validar-pin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id_empleado: idEmpleado, pin }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al validar PIN');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Actualizar huella dactilar de un empleado
 * @param {number} idEmpleado - ID del empleado
 * @param {Buffer|string} dactilar - Datos de la huella (Buffer o base64)
 */
export const actualizarDactilar = async (idEmpleado, dactilar) => {
    try {
        const response = await fetch(`${API_URL}/credenciales/empleado/${idEmpleado}/dactilar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dactilar }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar huella dactilar');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Actualizar reconocimiento facial de un empleado
 * @param {number} idEmpleado - ID del empleado
 * @param {Buffer|string} facial - Datos del reconocimiento facial (Buffer o base64)
 */
export const actualizarFacial = async (idEmpleado, facial) => {
    try {
        const response = await fetch(`${API_URL}/credenciales/empleado/${idEmpleado}/facial`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ facial }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar reconocimiento facial');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

// Exportar todo el servicio como default
export default {
    getCredencialesByEmpleado,
    getMetodosAutenticacion,
    crearCredenciales,
    actualizarCredenciales,
    eliminarCredenciales,
    validarPin,
    actualizarDactilar,
    actualizarFacial
};
