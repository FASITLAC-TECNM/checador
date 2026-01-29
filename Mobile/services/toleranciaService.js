import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

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
        console.error('❌ Error obteniendo tolerancias:', error);
        throw error;
    }
};

/**
 * Obtiene una tolerancia específica por ID
 * @param {string} toleranciaId - ID de la tolerancia
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Datos de la tolerancia
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
        console.error('❌ Error obteniendo tolerancia:', error);
        throw error;
    }
};

/**
 * Obtiene la tolerancia aplicable a un empleado basándose en sus roles
 * @param {string} usuarioId - ID del usuario
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Datos de tolerancia del empleado
 */
export const getToleranciaEmpleado = async (usuarioId, token) => {
    try {
        // 1. Obtener roles del usuario
        const rolesResponse = await fetch(`${API_URL}/usuarios/${usuarioId}/roles`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!rolesResponse.ok) {
            // Si no tiene roles, retornar tolerancia por defecto
            return {
                success: true,
                data: {
                    minutos_retardo: 10,
                    minutos_falta: 30,
                    permite_registro_anticipado: true,
                    minutos_anticipado_max: 60,
                    aplica_tolerancia_entrada: true,
                    aplica_tolerancia_salida: false
                }
            };
        }

        const rolesData = await rolesResponse.json();
        const roles = rolesData.data || [];

        // 2. Buscar el rol con mayor posición que tenga tolerancia asignada
        const rolConTolerancia = roles
            .filter(r => r.tolerancia_id)
            .sort((a, b) => b.posicion - a.posicion)[0];

        if (!rolConTolerancia) {
            // Si ningún rol tiene tolerancia, retornar tolerancia por defecto
            return {
                success: true,
                data: {
                    minutos_retardo: 10,
                    minutos_falta: 30,
                    permite_registro_anticipado: true,
                    minutos_anticipado_max: 60,
                    aplica_tolerancia_entrada: true,
                    aplica_tolerancia_salida: false
                }
            };
        }

        // 3. Obtener la tolerancia completa
        const toleranciaData = await getToleranciaById(rolConTolerancia.tolerancia_id, token);
        
        return toleranciaData;

    } catch (error) {
        console.error('❌ Error obteniendo tolerancia del empleado:', error);
        
        // En caso de error, retornar tolerancia por defecto
        return {
            success: true,
            data: {
                minutos_retardo: 10,
                minutos_falta: 30,
                permite_registro_anticipado: true,
                minutos_anticipado_max: 60,
                aplica_tolerancia_entrada: true,
                aplica_tolerancia_salida: false
            }
        };
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
        console.error('❌ Error creando tolerancia:', error);
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
        console.error('❌ Error actualizando tolerancia:', error);
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
        console.error('❌ Error eliminando tolerancia:', error);
        throw error;
    }
};

export default {
    getTolerancias,
    getToleranciaById,
    getToleranciaEmpleado,
    createTolerancia,
    updateTolerancia,
    deleteTolerancia
};