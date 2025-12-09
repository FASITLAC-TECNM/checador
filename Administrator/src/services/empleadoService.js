// services/empleadoService.js
// Servicio modular para gestión de empleados

import { getApiEndpoint } from '../config/api';

// Usar la configuración centralizada
const API_URL = getApiEndpoint('/api');

console.log('🔗 Empleados API URL:', API_URL);

/**
 * Obtener todos los empleados
 */
export const getEmpleados = async () => {
    try {
        const response = await fetch(`${API_URL}/empleados`);
        if (!response.ok) throw new Error('Error al obtener empleados');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener un empleado por ID
 */
export const getEmpleado = async (id) => {
    try {
        const response = await fetch(`${API_URL}/empleados/${id}`);
        if (!response.ok) throw new Error('Error al obtener empleado');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener empleado por ID de usuario
 */
export const getEmpleadoPorUsuario = async (idUsuario) => {
    try {
        const response = await fetch(`${API_URL}/empleados/usuario/${idUsuario}`);
        if (!response.ok) throw new Error('Error al obtener empleado');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Crear un nuevo empleado
 * @param {Object} empleado - Datos del empleado
 * @param {number} empleado.id_usuario - ID del usuario asociado
 * @param {string} empleado.nss - Número de Seguridad Social (11 dígitos)
 * @param {string} empleado.rfc - RFC (13 caracteres)
 * @param {number} [empleado.horario_id] - ID del horario asignado (opcional)
 */
export const crearEmpleado = async (empleado) => {
    try {
        // Validaciones
        if (!empleado.id_usuario) {
            throw new Error('El ID de usuario es obligatorio');
        }
        if (!empleado.nss || empleado.nss.length !== 11) {
            throw new Error('El NSS debe tener exactamente 11 dígitos');
        }
        if (!empleado.rfc || empleado.rfc.length !== 13) {
            throw new Error('El RFC debe tener exactamente 13 caracteres');
        }

        const empleadoDB = {
            id_usuario: empleado.id_usuario,
            nss: empleado.nss,
            rfc: empleado.rfc.toUpperCase(),
            horario_id: empleado.horario_id || null
        };

        const response = await fetch(`${API_URL}/empleados`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(empleadoDB),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear empleado');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Actualizar un empleado existente
 * @param {number} id - ID del empleado
 * @param {Object} empleado - Datos del empleado a actualizar
 */
export const actualizarEmpleado = async (id, empleado) => {
    try {
        // Validaciones
        if (empleado.nss && empleado.nss.length !== 11) {
            throw new Error('El NSS debe tener exactamente 11 dígitos');
        }
        if (empleado.rfc && empleado.rfc.length !== 13) {
            throw new Error('El RFC debe tener exactamente 13 caracteres');
        }

        const empleadoDB = {
            nss: empleado.nss,
            rfc: empleado.rfc?.toUpperCase(),
            estado: empleado.estado,
            horario_id: empleado.horario_id
        };

        const response = await fetch(`${API_URL}/empleados/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(empleadoDB),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar empleado');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Eliminar un empleado
 * @param {number} id - ID del empleado a eliminar
 */
export const eliminarEmpleado = async (id) => {
    try {
        const response = await fetch(`${API_URL}/empleados/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) throw new Error('Error al eliminar empleado');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Validar PIN de empleado
 * @deprecated Usar credencialesService.validarPin() en su lugar
 * @param {number} idEmpleado - ID del empleado
 * @param {string} pin - PIN a validar
 */
export const validarPinEmpleado = async (idEmpleado, pin) => {
    console.warn('⚠️ validarPinEmpleado está deprecado. Usa credencialesService.validarPin() en su lugar');
    try {
        if (!pin || pin.length !== 4) {
            throw new Error('El PIN debe tener 4 dígitos');
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
 * Buscar empleado por NSS
 * @param {string} nss - NSS a buscar
 */
export const buscarPorNSS = async (nss) => {
    try {
        const response = await fetch(`${API_URL}/empleados/buscar/nss/${nss}`);
        if (!response.ok) throw new Error('Error al buscar empleado por NSS');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Buscar empleado por RFC
 * @param {string} rfc - RFC a buscar
 */
export const buscarPorRFC = async (rfc) => {
    try {
        const response = await fetch(`${API_URL}/empleados/buscar/rfc/${rfc.toUpperCase()}`);
        if (!response.ok) throw new Error('Error al buscar empleado por RFC');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener empleados con información completa del usuario
 */
export const getEmpleadosConUsuarios = async () => {
    try {
        const response = await fetch(`${API_URL}/empleados/completo`);
        if (!response.ok) throw new Error('Error al obtener empleados completos');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Validar si un NSS ya existe
 * @param {string} nss - NSS a validar
 * @param {number} idEmpleadoExcluir - ID del empleado a excluir (para edición)
 */
export const validarNSSUnico = async (nss, idEmpleadoExcluir = null) => {
    try {
        const params = new URLSearchParams({ nss });
        if (idEmpleadoExcluir) {
            params.append('excluir_id', idEmpleadoExcluir);
        }

        const response = await fetch(`${API_URL}/empleados/validar/nss?${params.toString()}`);
        if (!response.ok) throw new Error('Error al validar NSS');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Validar si un RFC ya existe
 * @param {string} rfc - RFC a validar
 * @param {number} idEmpleadoExcluir - ID del empleado a excluir (para edición)
 */
export const validarRFCUnico = async (rfc, idEmpleadoExcluir = null) => {
    try {
        const params = new URLSearchParams({ rfc: rfc.toUpperCase() });
        if (idEmpleadoExcluir) {
            params.append('excluir_id', idEmpleadoExcluir);
        }

        const response = await fetch(`${API_URL}/empleados/validar/rfc?${params.toString()}`);
        if (!response.ok) throw new Error('Error al validar RFC');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Cambiar estado de un empleado
 * @param {number} id - ID del empleado
 * @param {string} estado - Nuevo estado (ACTIVO, LICENCIA, VACACIONES, BAJA_TEMPORAL, BAJA_DEFINITIVA)
 * @param {string} motivo - Motivo del cambio (opcional)
 */
export const cambiarEstadoEmpleado = async (id, estado, motivo = null) => {
    try {
        const response = await fetch(`${API_URL}/empleados/${id}/estado`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ estado, motivo }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al cambiar estado del empleado');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener historial de cambios de estado de un empleado
 * @param {number} id - ID del empleado
 */
export const getHistorialEstadoEmpleado = async (id) => {
    try {
        const response = await fetch(`${API_URL}/empleados/${id}/historial-estado`);
        if (!response.ok) throw new Error('Error al obtener historial de estado');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

// Exportar todo el servicio como default
export default {
    getEmpleados,
    getEmpleado,
    getEmpleadoPorUsuario,
    crearEmpleado,
    actualizarEmpleado,
    eliminarEmpleado,
    validarPinEmpleado,
    buscarPorNSS,
    buscarPorRFC,
    getEmpleadosConUsuarios,
    validarNSSUnico,
    validarRFCUnico,
    cambiarEstadoEmpleado,
    getHistorialEstadoEmpleado
};
