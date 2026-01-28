import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

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
        console.error('[empleadoService] Error:', error.message);
        throw error;
    }
};

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

export const crearEmpleado = async (empleado) => {
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

export const actualizarEmpleado = async (id, empleado) => {
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
            pin: empleado.pin
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

export const validarPinEmpleado = async (idEmpleado, pin) => {
    try {
        if (!pin || pin.length !== 4) {
            throw new Error('El PIN debe tener 4 dígitos');
        }

        const response = await fetch(`${API_URL}/empleados/${idEmpleado}/validar-pin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pin }),
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

export const getEmpleadoConPermisos = async (id) => {
    try {
        const response = await fetch(`${API_URL}/empleados/${id}/permisos`);
        if (!response.ok) throw new Error('Error al obtener empleado con permisos');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export const getStats = async () => {
    try {
        const response = await fetch(`${API_URL}/empleados/stats`);
        if (!response.ok) throw new Error('Error al obtener estadísticas');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export const buscarPorNSS = async (nss) => {
    try {
        const response = await fetch(`${API_URL}/empleados/nss/${nss}`);
        if (!response.ok) throw new Error('Error al buscar empleado por NSS');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export const buscarPorRFC = async (rfc) => {
    try {
        const response = await fetch(`${API_URL}/empleados/rfc/${rfc.toUpperCase()}`);
        if (!response.ok) throw new Error('Error al buscar empleado por RFC');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

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

export default {
    getEmpleados,
    getEmpleado,
    getEmpleadoById,
    getEmpleadoPorUsuario,
    getEmpleadoConPermisos,
    getStats,
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