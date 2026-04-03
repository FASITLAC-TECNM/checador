/**
 * Servicio para la gestión de roles y permisos
 * Maneja todas las operaciones CRUD de roles conectando con el backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Obtener todos los roles
 * @returns {Promise<Array>} Lista de roles con información básica y usuarios asignados
 */
export const obtenerRoles = async () => {
    try {
        const response = await fetch(`${API_URL}/roles`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener roles');
        }

        return await response.json();
    } catch (error) {
        console.error('Error en obtenerRoles:', error);
        throw error;
    }
};

/**
 * Obtener un rol por ID con sus permisos
 * @param {number} id - ID del rol
 * @returns {Promise<Object>} Rol con sus permisos detallados
 */
export const obtenerRolPorId = async (id) => {
    try {
        const response = await fetch(`${API_URL}/roles/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener rol');
        }

        return await response.json();
    } catch (error) {
        console.error('Error en obtenerRolPorId:', error);
        throw error;
    }
};

/**
 * Crear un nuevo rol
 * @param {Object} rolData - Datos del rol a crear
 * @param {string} rolData.nombre - Nombre del rol (requerido)
 * @param {string} rolData.descripcion - Descripción del rol
 * @param {number} rolData.jerarquia - Nivel de jerarquía (1=Mayor, 10=Menor)
 * @param {number} rolData.id_tolerancia - ID de la tolerancia asociada
 * @param {Array} rolData.permisos - Array de permisos [{id_modulo, can_create, can_read, can_update, can_delete}]
 * @returns {Promise<Object>} Rol creado
 */
export const crearRol = async (rolData) => {
    try {
        // Validación básica
        if (!rolData.nombre || !rolData.nombre.trim()) {
            throw new Error('El nombre del rol es requerido');
        }

        const response = await fetch(`${API_URL}/roles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(rolData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear rol');
        }

        return await response.json();
    } catch (error) {
        console.error('Error en crearRol:', error);
        throw error;
    }
};

/**
 * Actualizar un rol existente
 * @param {number} id - ID del rol a actualizar
 * @param {Object} rolData - Datos del rol a actualizar
 * @returns {Promise<Object>} Rol actualizado
 */
export const actualizarRol = async (id, rolData) => {
    try {
        if (!id) {
            throw new Error('ID del rol es requerido');
        }

        const response = await fetch(`${API_URL}/roles/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(rolData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al actualizar rol');
        }

        return await response.json();
    } catch (error) {
        console.error('Error en actualizarRol:', error);
        throw error;
    }
};

/**
 * Eliminar un rol
 * @param {number} id - ID del rol a eliminar
 * @returns {Promise<Object>} Confirmación de eliminación
 */
export const eliminarRol = async (id) => {
    try {
        if (!id) {
            throw new Error('ID del rol es requerido');
        }

        const response = await fetch(`${API_URL}/roles/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar rol');
        }

        return await response.json();
    } catch (error) {
        console.error('Error en eliminarRol:', error);
        throw error;
    }
};

/**
 * Obtener todos los módulos disponibles del sistema
 * @returns {Promise<Array>} Lista de módulos con id, nombre, descripción, icono y orden
 */
export const obtenerModulos = async () => {
    try {
        const response = await fetch(`${API_URL}/modulos`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener módulos');
        }

        return await response.json();
    } catch (error) {
        console.error('Error en obtenerModulos:', error);
        throw error;
    }
};

/**
 * Transformar permisos desde el formato del frontend al formato del backend
 * Frontend: { usuarios: { ver: true, crear: false, editar: true, eliminar: false }, ... }
 * Backend: [{ id_modulo: 1, can_read: true, can_create: false, can_update: true, can_delete: false }, ...]
 *
 * @param {Object} permisosObj - Objeto de permisos del frontend
 * @param {Array} modulos - Array de módulos con sus IDs
 * @returns {Array} Array de permisos en formato backend
 */
export const transformarPermisosParaBackend = (permisosObj, modulos) => {
    const permisos = [];

    // Mapeo de nombres de módulos frontend a backend
    const modulosMap = {};
    modulos.forEach(m => {
        // Normalizar nombre del módulo (singular/plural, minúsculas)
        const nombreNormalizado = m.nombre.toLowerCase().replace(/s$/, '');
        modulosMap[nombreNormalizado] = m.id;
    });

    Object.keys(permisosObj).forEach(moduloKey => {
        // Buscar el ID del módulo
        const nombreNormalizado = moduloKey.toLowerCase().replace(/s$/, '');
        const idModulo = modulosMap[nombreNormalizado];

        if (idModulo) {
            const permisoModulo = permisosObj[moduloKey];
            permisos.push({
                id_modulo: idModulo,
                can_read: permisoModulo.ver || false,
                can_create: permisoModulo.crear || false,
                can_update: permisoModulo.editar || false,
                can_delete: permisoModulo.eliminar || false
            });
        }
    });

    return permisos;
};

/**
 * Transformar permisos desde el formato del backend al formato del frontend
 * Backend: [{ id_modulo: 1, modulo: 'Usuarios', can_read: true, can_create: false, ... }]
 * Frontend: { usuarios: { ver: true, crear: false, editar: true, eliminar: false }, ... }
 *
 * @param {Array} permisosArray - Array de permisos del backend
 * @returns {Object} Objeto de permisos en formato frontend
 */
export const transformarPermisosParaFrontend = (permisosArray) => {
    const permisos = {
        usuarios: { ver: false, crear: false, editar: false, eliminar: false },
        roles: { ver: false, crear: false, editar: false, eliminar: false },
        dispositivos: { ver: false, crear: false, editar: false, eliminar: false },
        asistencias: { ver: false, crear: false, editar: false, eliminar: false },
        reportes: { ver: false, crear: false, editar: false, eliminar: false },
        configuracion: { ver: false, crear: false, editar: false, eliminar: false }
    };

    if (!permisosArray || !Array.isArray(permisosArray)) {
        return permisos;
    }

    permisosArray.forEach(p => {
        if (!p || !p.modulo) return;

        // Normalizar nombre del módulo (quitar espacios, convertir a minúsculas)
        const moduloKey = p.modulo.toLowerCase().trim().replace(/\s+/g, '');

        // Buscar la key que coincida (usuarios, roles, dispositivos, etc.)
        const key = Object.keys(permisos).find(k =>
            k === moduloKey ||
            k === moduloKey + 's' ||
            moduloKey === k + 's' ||
            k.includes(moduloKey) ||
            moduloKey.includes(k)
        );

        if (key) {
            permisos[key] = {
                ver: p.can_read || false,
                crear: p.can_create || false,
                editar: p.can_update || false,
                eliminar: p.can_delete || false
            };
        }
    });

    return permisos;
};

export default {
    obtenerRoles,
    obtenerRolPorId,
    crearRol,
    actualizarRol,
    eliminarRol,
    obtenerModulos,
    transformarPermisosParaBackend,
    transformarPermisosParaFrontend
};
