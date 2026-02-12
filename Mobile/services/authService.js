// services/authService.js
// Servicio de autenticación para login de usuarios

import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');


/**
 * Iniciar sesión con usuario/correo y contraseña
 * @param {string} usuario - Nombre de usuario o correo electrónico
 * @param {string} contraseña - Contraseña del usuario
 * @returns {Promise<Object>} Objeto con información del usuario autenticado
 */
export const login = async (usuario, contraseña) => {
    try {
        if (!usuario || !contraseña) {
            throw new Error('Usuario y contraseña son obligatorios');
        }


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

        const responseText = await response.text();
        let data;

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            throw new Error(`Error del servidor: respuesta no válida (${response.status})`);
        }

        if (!response.ok) {
            throw new Error(data.message || data.error || `Error del servidor (${response.status})`);
        }

        if (!data.success || !data.data) {
            throw new Error('Respuesta del servidor inválida');
        }


        // ⭐ OBTENER INFORMACIÓN DEL EMPLEADO
        let empleadoInfo = null;

        if (data.data.usuario.es_empleado && data.data.usuario.empleado_id) {
            try {
                const empleadoId = data.data.usuario.empleado_id;
                const token = data.data.token;


                const empUrl = `${API_URL}/empleados/${empleadoId}`;

                const empResponse = await fetch(empUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });


                if (!empResponse.ok) {
                    const errorText = await empResponse.text();
                    throw new Error('No se pudo obtener info del empleado');
                }

                const empText = await empResponse.text();
                const empData = JSON.parse(empText);
                empleadoInfo = empData.data || empData;


                if (empleadoInfo.departamentos && empleadoInfo.departamentos.length > 0) {
                    const deptoId = empleadoInfo.departamentos[0].id;

                    const deptoUrl = `${API_URL}/departamentos/${deptoId}`;

                    const deptoResponse = await fetch(deptoUrl, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });


                    if (!deptoResponse.ok) {
                        const errorText = await deptoResponse.text();
                    } else {
                        const deptoText = await deptoResponse.text();

                        const deptoData = JSON.parse(deptoText);
                        const departamentoCompleto = deptoData.data || deptoData;

                        // ⭐ AGREGAR AL empleadoInfo
                        empleadoInfo.departamento = departamentoCompleto;
                        empleadoInfo.id_departamento = deptoId;
                    }
                }

            } catch (empError) {
            }
        }

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
        throw error;
    }
};
/**
 * Cerrar sesión del usuario
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>}
 */
export const logout = async (token) => {
    try {

        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers,
        });

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Error al cerrar sesión');
        }

        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Verificar sesión actual
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>}
 */
export const verificarSesion = async (token) => {
    try {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/auth/verificar`, {
            method: 'GET',
            headers,
        });

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
            throw new Error(data.message || 'Sesión no válida');
        }

        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Cambiar contraseña del usuario autenticado
 * @param {string} contraseñaActual - Contraseña actual
 * @param {string} contraseñaNueva - Nueva contraseña
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>}
 */
export const cambiarPassword = async (contraseñaActual, contraseñaNueva, token) => {
    try {
        if (contraseñaNueva.length < 6) {
            throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
        }

        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/auth/cambiar-password`, {
            method: 'POST',
            headers,
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
        throw error;
    }
};

/**
 * Login biométrico
 * @param {Object} biometricData - Datos biométricos (empleado_id, template, tipo, etc.)
 * @returns {Promise<Object>}
 */
export const loginBiometrico = async (biometricData) => {
    try {
        const response = await fetch(`${API_URL}/auth/biometric`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(biometricData),
        });

        const responseText = await response.text();
        let data;

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            throw new Error(`Error del servidor: respuesta no válida (${response.status})`);
        }

        if (!response.ok) {
            throw new Error(data.message || data.error || `Error del servidor (${response.status})`);
        }

        return data;
    } catch (error) {
        throw error;
    }
};

export default {
    login,
    logout,
    verificarSesion,
    cambiarPassword,
    loginBiometrico
};