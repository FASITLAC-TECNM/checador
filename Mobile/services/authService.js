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
// services/authService.js

// services/authService.js

export const login = async (usuario, contraseña) => {
    try {
        if (!usuario || !contraseña) {
            throw new Error('Usuario y contraseña son obligatorios');
        }

        console.log('📡 Enviando login a:', `${API_URL}/auth/login`);

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
            console.error('❌ Error al parsear JSON:', parseError);
            throw new Error(`Error del servidor: respuesta no válida (${response.status})`);
        }

        if (!response.ok) {
            throw new Error(data.message || data.error || `Error del servidor (${response.status})`);
        }

        if (!data.success || !data.data) {
            throw new Error('Respuesta del servidor inválida');
        }

        console.log('✅ Login exitoso:', data.data.usuario.nombre);

        // ⭐ OBTENER INFORMACIÓN DEL EMPLEADO
        let empleadoInfo = null;
        
        if (data.data.usuario.es_empleado && data.data.usuario.empleado_id) {
            try {
                const empleadoId = data.data.usuario.empleado_id;
                const token = data.data.token;

                console.log('═══════════════════════════════════════');
                console.log('🔍 OBTENIENDO INFORMACIÓN DEL EMPLEADO');
                console.log('═══════════════════════════════════════');
                console.log('📋 Empleado ID:', empleadoId);
                console.log('🔑 Token:', token ? token.substring(0, 20) + '...' : 'NO HAY TOKEN');

                const empUrl = `${API_URL}/empleados/${empleadoId}`;
                console.log('📡 Llamando a:', empUrl);

                const empResponse = await fetch(empUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                console.log('📥 Status empleado:', empResponse.status);

                if (!empResponse.ok) {
                    const errorText = await empResponse.text();
                    console.error('❌ ERROR obteniendo empleado:', errorText);
                    throw new Error('No se pudo obtener info del empleado');
                }

                const empText = await empResponse.text();
                const empData = JSON.parse(empText);
                empleadoInfo = empData.data || empData;
                
                console.log('✅ Empleado obtenido');
                console.log('📊 Tiene departamentos:', empleadoInfo.departamentos?.length || 0);

                if (empleadoInfo.departamentos && empleadoInfo.departamentos.length > 0) {
                    console.log('📋 Departamentos:', JSON.stringify(empleadoInfo.departamentos, null, 2));
                    
                    const deptoId = empleadoInfo.departamentos[0].id;
                    console.log('');
                    console.log('═══════════════════════════════════════');
                    console.log('🏢 OBTENIENDO DEPARTAMENTO COMPLETO');
                    console.log('═══════════════════════════════════════');
                    console.log('📋 Departamento ID:', deptoId);

                    const deptoUrl = `${API_URL}/departamentos/${deptoId}`;
                    console.log('📡 Llamando a:', deptoUrl);

                    const deptoResponse = await fetch(deptoUrl, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    console.log('📥 Status departamento:', deptoResponse.status);

                    if (!deptoResponse.ok) {
                        const errorText = await deptoResponse.text();
                        console.error('❌ ERROR obteniendo departamento:', errorText);
                        console.error('❌ Probablemente sea un error de permisos (403)');
                    } else {
                        const deptoText = await deptoResponse.text();
                        console.log('📄 Respuesta departamento:', deptoText.substring(0, 500));
                        
                        const deptoData = JSON.parse(deptoText);
                        const departamentoCompleto = deptoData.data || deptoData;
                        
                        console.log('✅ Departamento obtenido:', departamentoCompleto.nombre);
                        console.log('📍 Ubicación:', departamentoCompleto.ubicacion ? 'SÍ ✅' : 'NO ❌');
                        
                        if (departamentoCompleto.ubicacion) {
                            console.log('📐 Tipo de ubicación:', typeof departamentoCompleto.ubicacion);
                            console.log('📐 Ubicación (primeros 200 chars):', 
                                JSON.stringify(departamentoCompleto.ubicacion).substring(0, 200));
                        }
                        
                        // ⭐ AGREGAR AL empleadoInfo
                        empleadoInfo.departamento = departamentoCompleto;
                        empleadoInfo.id_departamento = deptoId;
                        
                        console.log('✅ Departamento agregado a empleadoInfo');
                    }
                } else {
                    console.warn('⚠️ El empleado NO tiene departamentos asignados');
                }

                console.log('═══════════════════════════════════════');

            } catch (empError) {
                console.error('❌ ERROR FATAL al obtener empleado:', empError.message);
                console.error('❌ Stack:', empError.stack);
            }
        }

        console.log('');
        console.log('📦 RESULTADO FINAL:');
        console.log('   - empleadoInfo:', empleadoInfo ? 'CON DATOS ✅' : 'NULL ❌');
        if (empleadoInfo) {
            console.log('   - departamento:', empleadoInfo.departamento ? 'SÍ ✅' : 'NO ❌');
            console.log('   - id_departamento:', empleadoInfo.id_departamento || 'NO ❌');
        }
        console.log('');

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