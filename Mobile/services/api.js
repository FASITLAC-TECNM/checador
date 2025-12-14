// services/api.js
// Servicios de API para gestión de usuarios - VERSIÓN ACTUALIZADA

import { getApiEndpoint } from '../config/api.js';

// Importar y re-exportar servicios modulares
export * as empleadoService from './empleadosServices.js';
export * as authService from './authService.js';

// Usar la configuración centralizada
const API_URL = getApiEndpoint('/api');

console.log('🔗 API URL:', API_URL);

/**
 * Obtener todos los usuarios
 */
export const getUsuarios = async () => {
    try {
        const response = await fetch(`${API_URL}/usuarios`);
        if (!response.ok) throw new Error('Error al obtener usuarios');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener un usuario por ID
 */
export const getUsuario = async (id) => {
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`);
        if (!response.ok) throw new Error('Error al obtener usuario');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Crear un nuevo usuario
 */
export const crearUsuario = async (usuario) => {
    try {
        // Mapear campos del frontend a la BD
        const usuarioDB = {
            username: usuario.username,
            email: usuario.email,
            password: usuario.password || '1234', // Contraseña por defecto si no se proporciona
            nombre: usuario.nombre,
            telefono: usuario.telefono || '',
            foto: usuario.foto || null,
            activo: usuario.activo || 'ACTIVO',
            estado: usuario.estado || 'DESCONECTADO'
        };

        const response = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(usuarioDB),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear usuario');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Actualizar un usuario existente
 */
export const actualizarUsuario = async (id, usuario) => {
    try {
        const usuarioDB = {
            username: usuario.username,
            email: usuario.email,
            nombre: usuario.nombre,
            telefono: usuario.telefono || '',
            foto: usuario.foto || null,
            activo: usuario.activo,
            estado: usuario.estado
        };

        // Solo incluir contraseña si se proporciona
        if (usuario.password && usuario.password.trim() !== '') {
            usuarioDB.password = usuario.password;
        }

        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(usuarioDB),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar usuario');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Eliminar un usuario
 */
export const eliminarUsuario = async (id) => {
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) throw new Error('Error al eliminar usuario');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Actualizar solo el estado de conexión de un usuario
 */
export const actualizarEstadoConexion = async (id, estado) => {
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}/estado`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ estado }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar estado');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Filtrar usuarios por estado activo y/o estado de conexión
 */
export const filtrarUsuarios = async (filtros) => {
    try {
        const params = new URLSearchParams();

        if (filtros.activo) params.append('activo', filtros.activo);
        if (filtros.estado) params.append('estado', filtros.estado);

        const response = await fetch(`${API_URL}/usuarios/filtrar?${params.toString()}`);

        if (!response.ok) throw new Error('Error al filtrar usuarios');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener estadísticas de usuarios
 */
export const getEstadisticas = async () => {
    try {
        const response = await fetch(`${API_URL}/usuarios/stats`);

        if (!response.ok) throw new Error('Error al obtener estadísticas');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

// ============================================
// SERVICIOS DE EMPLEADOS
// ============================================

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
 */
export const crearEmpleado = async (empleado) => {
    try {
        const empleadoDB = {
            id_usuario: empleado.id_usuario,
            nss: empleado.nss,
            rfc: empleado.rfc,
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

/**
 * Actualizar un empleado existente
 */
export const actualizarEmpleado = async (id, empleado) => {
    try {
        const empleadoDB = {
            nss: empleado.nss,
            rfc: empleado.rfc,
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

/**
 * Eliminar un empleado
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
 */
export const validarPinEmpleado = async (idEmpleado, pin) => {
    try {
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