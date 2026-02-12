import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

/**
 * Obtiene todos los empleados
 */
export const getEmpleados = async (token, params = {}) => {
    try {
        const queryParams = new URLSearchParams(params).toString();
        const url = queryParams ? `${API_URL}/empleados?${queryParams}` : `${API_URL}/empleados`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al obtener empleados');
        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Obtiene un empleado por ID (incluye foto de perfil)
 */
export const getEmpleado = async (id, token) => {
    try {
        const response = await fetch(`${API_URL}/empleados/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al obtener empleado');
        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Obtiene un empleado por ID con validación completa
 * Esta función incluye TODA la información del usuario + empleado + foto
 */
export const getEmpleadoById = async (empleadoId, token) => {
    try {
        if (!empleadoId) {
            throw new Error('empleado_id es requerido');
        }

        if (!token) {
            throw new Error('Token de autenticación no disponible');
        }

        const response = await fetch(`${API_URL}/empleados/${empleadoId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Empleado no encontrado');
            }
            if (response.status === 401) {
                throw new Error('No autorizado - Token inválido');
            }
            if (response.status === 403) {
                throw new Error('No tienes permisos para ver este empleado');
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Error al obtener empleado');
        }

        return data;

    } catch (error) {
        throw error;
    }
};

/**
 * Obtiene datos completos del usuario por ID (incluye datos de empleado si aplica)
 * IMPORTANTE: Esta función obtiene la foto desde usuarios, no desde empleados
 */
export const getUsuarioCompleto = async (usuarioId, token) => {
    try {
        if (!usuarioId) {
            throw new Error('usuario_id es requerido');
        }

        if (!token) {
            throw new Error('Token de autenticación no disponible');
        }

        const response = await fetch(`${API_URL}/usuarios/${usuarioId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Usuario no encontrado');
            }
            if (response.status === 401) {
                throw new Error('No autorizado - Token inválido');
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Error al obtener usuario');
        }

        return data;

    } catch (error) {
        throw error;
    }
};

/**
 * Obtiene empleado por usuario_id
 */
export const getEmpleadoPorUsuario = async (idUsuario, token) => {
    try {
        const response = await fetch(`${API_URL}/empleados/usuario/${idUsuario}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al obtener empleado');
        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Crea un nuevo empleado
 */
export const crearEmpleado = async (empleado, token) => {
    try {
        if (!empleado.id_usuario) {
            throw new Error('El ID de usuario es obligatorio');
        }
        if (!empleado.nss || empleado.nss.length !== 11) {
            throw new Error('El NSS debe tener exactamente 11 dígitos');
        }
        if (!empleado.rfc || empleado.rfc.length !== 13) {
            throw new Error('El RFC debe tener exactamente 13 caracteres');
        }
        if (!empleado.pin || empleado.pin.length !== 4) {
            throw new Error('El PIN debe tener exactamente 4 dígitos');
        }

        const empleadoDB = {
            id_usuario: empleado.id_usuario,
            nss: empleado.nss,
            rfc: empleado.rfc.toUpperCase(),
            pin: empleado.pin
        };

        const response = await fetch(`${API_URL}/empleados`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(empleadoDB),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear empleado');
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Actualiza un empleado
 */
export const actualizarEmpleado = async (id, empleado, token) => {
    try {
        if (empleado.nss && empleado.nss.length !== 11) {
            throw new Error('El NSS debe tener exactamente 11 dígitos');
        }
        if (empleado.rfc && empleado.rfc.length !== 13) {
            throw new Error('El RFC debe tener exactamente 13 caracteres');
        }
        if (empleado.pin && empleado.pin.length !== 4) {
            throw new Error('El PIN debe tener exactamente 4 dígitos');
        }

        const empleadoDB = {
            nss: empleado.nss,
            rfc: empleado.rfc?.toUpperCase(),
            pin: empleado.pin,
            horario_id: empleado.horario_id
        };

        const response = await fetch(`${API_URL}/empleados/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(empleadoDB),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar empleado');
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Elimina un empleado
 */
export const eliminarEmpleado = async (id, token) => {
    try {
        const response = await fetch(`${API_URL}/empleados/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al eliminar empleado');
        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Valida el PIN de un empleado
 */
export const validarPinEmpleado = async (idEmpleado, pin, token) => {
    try {
        if (!pin || pin.length !== 4) {
            throw new Error('El PIN debe tener 4 dígitos');
        }

        const response = await fetch(`${API_URL}/empleados/${idEmpleado}/validar-pin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ pin }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al validar PIN');
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Obtiene los departamentos de un empleado
 * GET /api/empleados/:id/departamentos
 */
export const getDepartamentosDeEmpleado = async (empleadoId, token) => {
    try {
        const response = await fetch(`${API_URL}/empleados/${empleadoId}/departamentos`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al obtener departamentos del empleado');
        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Asigna un departamento a un empleado
 * POST /api/empleados/:id/departamentos
 */
export const asignarDepartamento = async (empleadoId, departamentoId, token) => {
    try {
        const response = await fetch(`${API_URL}/empleados/${empleadoId}/departamentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ departamento_id: departamentoId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al asignar departamento');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Remueve un empleado de un departamento
 * DELETE /api/empleados/:id/departamentos/:deptoId
 */
export const removerDepartamento = async (empleadoId, departamentoId, token) => {
    try {
        const response = await fetch(`${API_URL}/empleados/${empleadoId}/departamentos/${departamentoId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al remover departamento');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Obtiene el horario de un empleado
 */
export const getHorarioDeEmpleado = async (empleadoId, token) => {
    try {
        const response = await fetch(`${API_URL}/empleados/${empleadoId}/horario`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al obtener horario');
        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Buscar empleado por NSS
 * GET /api/empleados/buscar/nss/:nss
 */
export const buscarPorNSS = async (nss, token) => {
    try {
        const response = await fetch(`${API_URL}/empleados/buscar/nss/${nss}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al buscar por NSS');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Buscar empleado por RFC
 * GET /api/empleados/buscar/rfc/:rfc
 */
export const buscarPorRFC = async (rfc, token) => {
    try {
        const response = await fetch(`${API_URL}/empleados/buscar/rfc/${rfc}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al buscar por RFC');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
};

export default {
    getEmpleados,
    getEmpleado,
    getEmpleadoById,
    getUsuarioCompleto,
    getEmpleadoPorUsuario,
    crearEmpleado,
    actualizarEmpleado,
    eliminarEmpleado,
    validarPinEmpleado,
    buscarPorNSS,
    buscarPorRFC,
    getDepartamentosDeEmpleado,
    asignarDepartamento,
    removerDepartamento,
    getHorarioDeEmpleado
};