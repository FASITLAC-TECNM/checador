// services/authService.js
// Servicio de autenticación para login de usuarios

import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

console.log('🔐 Auth API URL:', API_URL);

/**
 * Iniciar sesión con usuario/correo y contraseña
 * @param {string} usuario - Nombre de usuario o correo electrónico
 * @param {string} contraseña - Contraseña del usuario
 * @returns {Promise<Object>} Objeto con información del usuario autenticado
 */
export const login = async (usuario, contraseña) => {
    try {
        // Validar que se proporcionen ambos campos
        if (!usuario || !contraseña) {
            throw new Error('Usuario y contraseña son obligatorios');
        }

        console.log('📡 Enviando login a:', `${API_URL}/auth/login`);
        console.log('📝 Usuario:', usuario);

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usuario: usuario.trim(),
                contraseña: contraseña
            }),
        });

        console.log('📥 Respuesta recibida:', response.status, response.statusText);

        // Obtener el texto de la respuesta primero
        const responseText = await response.text();
        console.log('📄 Texto de respuesta:', responseText.substring(0, 200));

        // Intentar parsear como JSON
        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            console.error('❌ Error al parsear JSON:', parseError);
            throw new Error(`Error del servidor: respuesta no válida (${response.status})`);
        }

        if (!response.ok) {
            throw new Error(data.message || data.error || `Error del servidor (${response.status})`);
        }

        if (!data.success || !data.data) {
            console.error('❌ Respuesta sin datos:', data);
            throw new Error('Respuesta del servidor inválida: falta información del usuario');
        }

        console.log('✅ Login exitoso:', data.data.usuario.nombre);
        console.log('📊 Datos completos:', data.data);

        // Si es empleado, obtener información del empleado (incluye departamento)
        let empleadoInfo = null;
        if (data.data.usuario.es_empleado && data.data.usuario.empleado_id) {
            try {
                console.log('🔍 Obteniendo información del empleado...');
                const empResponse = await fetch(`${API_URL}/empleados/${data.data.usuario.empleado_id}`);
                if (empResponse.ok) {
                    const empData = await empResponse.json();
                    empleadoInfo = empData.empleado || empData;
                    console.log('✅ Información del empleado obtenida:', empleadoInfo);
                }
            } catch (empError) {
                console.warn('⚠️ No se pudo obtener información del empleado:', empError);
            }
        }

        // Retornar los datos en el formato esperado
        return {
            success: true,
            usuario: {
                id: data.data.usuario.id,
                usuario: data.data.usuario.usuario,
                correo: data.data.usuario.correo,
                nombre: data.data.usuario.nombre,
                telefono: data.data.usuario.telefono,
                foto: data.data.usuario.foto,
                es_empleado: data.data.usuario.es_empleado,
                empleado_id: data.data.usuario.empleado_id,
                rfc: data.data.usuario.rfc,
                nss: data.data.usuario.nss
            },
            empleadoInfo: empleadoInfo,
            roles: data.data.roles || [],
            permisos: data.data.permisos || '0',
            esAdmin: data.data.esAdmin || false,
            token: data.data.token || null,
            message: data.message || 'Inicio de sesión exitoso'
        };

    } catch (error) {
        console.error('❌ Error en login:', error);
        throw error;
    }
};

/**
 * Cerrar sesión del usuario
 * @returns {Promise<Object>}
 */
export const logout = async () => {
    try {
        console.log('📡 Cerrando sesión');

        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Error al cerrar sesión');
        }

        console.log('✅ Sesión cerrada correctamente');
        return data;
    } catch (error) {
        console.error('❌ Error en logout:', error);
        throw error;
    }
};

/**
 * Verificar sesión actual
 * @returns {Promise<Object>}
 */
export const verificarSesion = async () => {
    try {
        const response = await fetch(`${API_URL}/auth/verificar`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            throw new Error(data.message || 'Sesión no válida');
        }

        return data;
    } catch (error) {
        console.error('❌ Error al verificar sesión:', error);
        throw error;
    }
};

/**
 * Cambiar contraseña del usuario autenticado
 * @param {string} contraseñaActual - Contraseña actual
 * @param {string} contraseñaNueva - Nueva contraseña
 * @returns {Promise<Object>}
 */
export const cambiarPassword = async (contraseñaActual, contraseñaNueva) => {
    try {
        if (contraseñaNueva.length < 6) {
            throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
        }

        const response = await fetch(`${API_URL}/auth/cambiar-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contraseña_actual: contraseñaActual,
                contraseña_nueva: contraseñaNueva
            }),
        });

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Error al cambiar contraseña');
        }

        return data;
    } catch (error) {
        console.error('❌ Error al cambiar contraseña:', error);
        throw error;
    }
};

export default {
    login,
    logout,
    verificarSesion,
    cambiarPassword
};