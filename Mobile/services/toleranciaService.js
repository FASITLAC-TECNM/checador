import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

// Tolerancia por defecto cuando no hay datos del servidor
const DEFAULT_TOLERANCIA = {
    minutos_retardo: 10,
    minutos_falta: 30,
    permite_registro_anticipado: true,
    minutos_anticipado_max: 60,
    aplica_tolerancia_entrada: true,
    aplica_tolerancia_salida: false,
    // Nuevos campos retardo A/B (alineados con el backend actualizado)
    minutos_retardo_a_max: 20,
    minutos_retardo_b_max: 29,
    equivalencia_retardo_a: 10,
    equivalencia_retardo_b: 5,
};

/**
 * Obtiene todas las tolerancias del sistema
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Lista de tolerancias
 */
export const getTolerancias = async (token) => {
    try {
        const response = await fetch(`${API_URL}/tolerancias`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
 * Obtiene una tolerancia específica por ID
 * @param {string} toleranciaId - ID de la tolerancia
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Datos de la tolerancia (incluye campos nuevos de retardo A/B)
 */
export const getToleranciaById = async (toleranciaId, token) => {
    try {
        const response = await fetch(`${API_URL}/tolerancias/${toleranciaId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
 * Obtiene la tolerancia del empleado usando el endpoint de sync del móvil.
 * Este endpoint devuelve la tolerancia completa incluyendo los nuevos campos:
 * minutos_retardo_a_max, minutos_retardo_b_max, equivalencia_retardo_a/b, dias_aplica.
 *
 * @param {string} empleadoId - ID del empleado (no usuario_id)
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} { success: true, data: { ...tolerancia } }
 */
export const getToleranciaEmpleado = async (empleadoId, token) => {
    try {
        const response = await fetch(
            `${API_URL}/movil/sync/mis-datos?empleado_id=${empleadoId}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            return { success: true, data: DEFAULT_TOLERANCIA };
        }

        const data = await response.json();

        if (!data.success || !data.tolerancia) {
            return { success: true, data: DEFAULT_TOLERANCIA };
        }

        // Asegurar que los campos nuevos tengan fallback si el servidor los omite
        const tolerancia = {
            ...DEFAULT_TOLERANCIA,
            ...data.tolerancia
        };

        return { success: true, data: tolerancia };

    } catch (error) {
        // En caso de error de red, retornar valores por defecto
        return { success: true, data: DEFAULT_TOLERANCIA };
    }
};

/**
 * Obtiene la tolerancia del empleado pasando usuario_id (método legacy).
 * Internamente resuelve el empleado_id y llama a getToleranciaEmpleado.
 * Se mantiene para compatibilidad con código existente.
 *
 * @param {string} usuarioId - ID del usuario
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} { success: true, data: { ...tolerancia } }
 */
export const getToleranciaEmpleadoPorUsuario = async (usuarioId, token) => {
    try {
        // Obtener roles del usuario para encontrar la tolerancia
        const rolesResponse = await fetch(`${API_URL}/usuarios/${usuarioId}/roles`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!rolesResponse.ok) {
            return { success: true, data: DEFAULT_TOLERANCIA };
        }

        const rolesData = await rolesResponse.json();
        const roles = rolesData.data || [];

        // Buscar el rol con mayor posición que tenga tolerancia asignada
        const rolConTolerancia = roles
            .filter(r => r.tolerancia_id)
            .sort((a, b) => b.posicion - a.posicion)[0];

        if (!rolConTolerancia) {
            return { success: true, data: DEFAULT_TOLERANCIA };
        }

        // Obtener la tolerancia completa (incluye campos nuevos)
        const toleranciaData = await getToleranciaById(rolConTolerancia.tolerancia_id, token);

        // Asegurar que los campos nuevos tengan fallback si el servidor los omite
        if (toleranciaData?.data) {
            toleranciaData.data = { ...DEFAULT_TOLERANCIA, ...toleranciaData.data };
        }

        return toleranciaData;

    } catch (error) {
        return { success: true, data: DEFAULT_TOLERANCIA };
    }
};

/**
 * Crea una nueva tolerancia (requiere permisos de admin)
 * @param {Object} toleranciaData - Datos de la tolerancia a crear
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Tolerancia creada
 */
export const createTolerancia = async (toleranciaData, token) => {
    try {
        const response = await fetch(`${API_URL}/tolerancias`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(toleranciaData)
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
 * Actualiza una tolerancia existente (requiere permisos de admin)
 * @param {string} toleranciaId - ID de la tolerancia
 * @param {Object} toleranciaData - Datos actualizados
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Tolerancia actualizada
 */
export const updateTolerancia = async (toleranciaId, toleranciaData, token) => {
    try {
        const response = await fetch(`${API_URL}/tolerancias/${toleranciaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(toleranciaData)
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
 * Elimina una tolerancia (requiere permisos de admin)
 * @param {string} toleranciaId - ID de la tolerancia
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Confirmación de eliminación
 */
export const deleteTolerancia = async (toleranciaId, token) => {
    try {
        const response = await fetch(`${API_URL}/tolerancias/${toleranciaId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
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

export default {
    getTolerancias,
    getToleranciaById,
    getToleranciaEmpleado,
    getToleranciaEmpleadoPorUsuario,
    createTolerancia,
    updateTolerancia,
    deleteTolerancia,
    DEFAULT_TOLERANCIA,
};