// services/authService.js
// Servicio de autenticación para login de usuarios

import { getApiEndpoint } from '../config/api.js'; 

const API_URL = getApiEndpoint('/api');

console.log('🔐 Auth API URL:', API_URL);

/**
 * Iniciar sesión con username y contraseña
 */
export const login = async (username, password) => {  // ✅ Cambié email por username
    try {
        if (!username || !password) {
            throw new Error('Usuario y contraseña son obligatorios');
        }

        console.log('📡 Enviando login a:', `${API_URL}/auth/login`);
        
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username.trim(),  // ✅ Cambié de email a username
                password: password
            }),
        });

        console.log('📥 Respuesta recibida:', response.status, response.statusText);

        // Obtener el texto de la respuesta primero
        const responseText = await response.text();
        console.log('📄 Texto de respuesta:', responseText);

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

        return {
            success: true,
            usuario: {
                id: data.usuario.id_usuario || data.usuario.id,
                email: data.usuario.email,
                nombre: data.usuario.nombre,
                username: data.usuario.username,
                telefono: data.usuario.telefono,
                foto: data.usuario.foto,
                activo: data.usuario.activo,
                estado: data.usuario.estado
            },
            token: data.token || null,
            message: data.message || 'Inicio de sesión exitoso'
        };

    } catch (error) {
        console.error('❌ Error en login:', error);
        throw error;
    }
};

export const logout = async (idUsuario) => {
    try {
        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id_usuario: idUsuario }),
        });

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            throw new Error(data.error || 'Error al cerrar sesión');
        }

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