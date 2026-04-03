// services/usuarioService.js
// Servicio modular para gestión de usuarios

import { getApiEndpoint } from '../config/api';

// Usar la configuración centralizada
const API_URL = getApiEndpoint('/api');
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
 * @param {number} id - ID del usuario
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
 * @param {Object} usuario - Datos del usuario
 * @param {string} usuario.username - Nombre de usuario (max 50 chars)
 * @param {string} usuario.email - Correo electrónico (max 100 chars)
 * @param {string} usuario.password - Contraseña (max 255 chars)
 * @param {string} usuario.nombre - Nombre completo (max 100 chars)
 * @param {string} [usuario.telefono] - Teléfono (max 20 chars)
 * @param {string} [usuario.foto] - URL de la foto (max 255 chars)
 * @param {string} [usuario.activo] - Estado activo (ACTIVO, SUSPENDIDO, BAJA)
 * @param {string} [usuario.estado] - Estado de conexión (CONECTADO, DESCONECTADO)
 */
export const crearUsuario = async (usuario) => {
    try {
        // Validaciones de longitud
        if (usuario.username && usuario.username.length > 50) {
            throw new Error('El username no puede exceder 50 caracteres');
        }
        if (usuario.email && usuario.email.length > 100) {
            throw new Error('El email no puede exceder 100 caracteres');
        }
        if (usuario.password && usuario.password.length > 255) {
            throw new Error('El password no puede exceder 255 caracteres');
        }
        if (usuario.nombre && usuario.nombre.length > 100) {
            throw new Error('El nombre no puede exceder 100 caracteres');
        }
        if (usuario.telefono && usuario.telefono.length > 20) {
            throw new Error('El teléfono no puede exceder 20 caracteres');
        }
        if (usuario.foto && usuario.foto.length > 255) {
            throw new Error('La URL de la foto no puede exceder 255 caracteres');
        }

        // Mapear campos del frontend a la BD
        const usuarioDB = {
            id_empresa: usuario.id_empresa || 4, // Valor por defecto: empresa 4
            username: usuario.username,
            email: usuario.email,
            password: usuario.password || '1234',
            nombre: usuario.nombre,
            telefono: usuario.telefono || '',
            foto: usuario.foto || null,
            activo: usuario.activo || 'Activo',      // Con mayúscula inicial
            estado: usuario.estado || 'Desconectado' // Con mayúscula inicial
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
 * @param {number} id - ID del usuario
 * @param {Object} usuario - Datos del usuario a actualizar
 */
export const actualizarUsuario = async (id, usuario) => {
    try {
        // Validaciones de longitud
        if (usuario.username && usuario.username.length > 50) {
            throw new Error('El username no puede exceder 50 caracteres');
        }
        if (usuario.email && usuario.email.length > 100) {
            throw new Error('El email no puede exceder 100 caracteres');
        }
        if (usuario.password && usuario.password.length > 255) {
            throw new Error('El password no puede exceder 255 caracteres');
        }
        if (usuario.nombre && usuario.nombre.length > 100) {
            throw new Error('El nombre no puede exceder 100 caracteres');
        }
        if (usuario.telefono && usuario.telefono.length > 20) {
            throw new Error('El teléfono no puede exceder 20 caracteres');
        }
        if (usuario.foto && usuario.foto.length > 255) {
            throw new Error('La URL de la foto no puede exceder 255 caracteres');
        }

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
 * @param {number} id - ID del usuario a eliminar
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
 * @param {number} id - ID del usuario
 * @param {string} estado - Estado de conexión (CONECTADO, DESCONECTADO)
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
 * @param {Object} filtros - Filtros a aplicar
 * @param {string} [filtros.activo] - Estado activo (ACTIVO, SUSPENDIDO, BAJA)
 * @param {string} [filtros.estado] - Estado de conexión (CONECTADO, DESCONECTADO)
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
 * @returns {Object} Estadísticas con total, activos, suspendidos, baja, conectados, desconectados
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

/**
 * Obtener roles de un usuario
 * @param {number} idUsuario - ID del usuario
 * @returns {Promise<Array>} Lista de roles asignados al usuario
 */
export const obtenerRolesDeUsuario = async (idUsuario) => {
    try {
        const response = await fetch(`${API_URL}/usuarios/${idUsuario}/roles`);
        if (!response.ok) throw new Error('Error al obtener roles del usuario');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Asignar un rol a un usuario
 * @param {number} idUsuario - ID del usuario
 * @param {number} idRol - ID del rol a asignar
 * @returns {Promise<Object>} Resultado de la asignación
 */
export const asignarRolAUsuario = async (idUsuario, idRol) => {
    try {
        const response = await fetch(`${API_URL}/usuarios/${idUsuario}/roles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id_rol: idRol }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al asignar rol');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Remover un rol de un usuario
 * @param {number} idUsuario - ID del usuario
 * @param {number} idRol - ID del rol a remover
 * @returns {Promise<Object>} Resultado de la operación
 */
export const removerRolDeUsuario = async (idUsuario, idRol) => {
    try {
        const response = await fetch(`${API_URL}/usuarios/${idUsuario}/roles/${idRol}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al remover rol');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

// Exportar todo el servicio como default
export default {
    getUsuarios,
    getUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    actualizarEstadoConexion,
    filtrarUsuarios,
    getEstadisticas,
    obtenerRolesDeUsuario,
    asignarRolAUsuario,
    removerRolDeUsuario
};
