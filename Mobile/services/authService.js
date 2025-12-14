// services/authService.js
// Servicio de autenticación para login de usuarios

import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

console.log('🔐 Auth API URL:', API_URL);

/**
 * Iniciar sesión con username y contraseña
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Objeto con información del usuario autenticado
 */
export const login = async (username, password) => {
    try {
        // Validar que se proporcionen ambos campos
        if (!username || !password) {
            throw new Error('Usuario y contraseña son obligatorios');
        }

        console.log('📡 Enviando login a:', `${API_URL}/session/validate`);
        console.log('📝 Username:', username);

        const response = await fetch(`${API_URL}/session/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username.trim(),
                password: password
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
            throw new Error(data.error || data.message || `Error del servidor (${response.status})`);
        }

        if (!data.usuario) {
            console.error('❌ Respuesta sin usuario:', data);
            throw new Error('Respuesta del servidor inválida: falta información del usuario');
        }

        console.log('✅ Login exitoso:', data.usuario.username);

        // Retornar los datos en el formato esperado
        return {
            success: true,
            usuario: {
                id: data.usuario.id_usuario || data.usuario.id,
                id_empresa: data.usuario.id_empresa,
                email: data.usuario.email,
                nombre: data.usuario.nombre,
                username: data.usuario.username,
                telefono: data.usuario.telefono,
                foto: data.usuario.foto,
                activo: data.usuario.activo,
                conexion: data.usuario.conexion || 'Conectado'
            },
            empleado: data.empleado || null,
            rol: data.rol || null,
            permisos: data.permisos || [],
            departamento: data.departamento || null,
            token: data.token || null,
            message: data.message || 'Inicio de sesión exitoso'
        };

    } catch (error) {
        console.error('❌ Error en login:', error);
        throw error;
    }
};

/**
 * Cerrar sesión del usuario
 * @param {number} idUsuario - ID del usuario
 * @returns {Promise<Object>}
 */
export const logout = async (idUsuario) => {
    try {
        console.log('📡 Cerrando sesión para usuario:', idUsuario);

        const response = await fetch(`${API_URL}/session/close`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: idUsuario }),
        });

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            throw new Error(data.error || 'Error al cerrar sesión');
        }

        console.log('✅ Sesión cerrada correctamente');
        return data;
    } catch (error) {
        console.error('❌ Error en logout:', error);
        throw error;
    }
};

export const verificarEmail = async (email) => {
    try {
        const response = await fetch(`${API_URL}/auth/verificar-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email.toLowerCase().trim() }),
        });

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            throw new Error(data.error || 'Error al verificar email');
        }

        return data;
    } catch (error) {
        console.error('❌ Error al verificar email:', error);
        throw error;
    }
};

export const solicitarRecuperacion = async (email) => {
    try {
        const response = await fetch(`${API_URL}/auth/recuperar-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email.toLowerCase().trim() }),
        });

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            throw new Error(data.error || 'Error al solicitar recuperación');
        }

        return data;
    } catch (error) {
        console.error('❌ Error en recuperación:', error);
        throw error;
    }
};

export const cambiarPassword = async (idUsuario, passwordActual, passwordNueva) => {
    try {
        if (passwordNueva.length < 6) {
            throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
        }

        const response = await fetch(`${API_URL}/auth/cambiar-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id_usuario: idUsuario,
                password_actual: passwordActual,
                password_nueva: passwordNueva
            }),
        });

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            throw new Error(data.error || 'Error al cambiar contraseña');
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
    verificarEmail,
    solicitarRecuperacion,
    cambiarPassword
};