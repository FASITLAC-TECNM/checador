// services/solicitudMovilService.js
// Servicio para gestión de solicitudes de dispositivos móviles

import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

console.log('📱 Solicitudes Móviles API URL:', API_URL);

// NOTA: La ruta en el backend es /api/solicitudes-movil (sin 'es' al final)

/**
 * Obtener todas las solicitudes móviles
 * @returns {Promise<Array>} Lista de todas las solicitudes
 */
export const getSolicitudesMoviles = async () => {
    try {
        const response = await fetch(`${API_URL}/solicitudes-movil`);
        if (!response.ok) throw new Error('Error al obtener solicitudes móviles');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener todas las solicitudes pendientes
 * @returns {Promise<Array>} Lista de solicitudes pendientes
 */
export const getSolicitudesPendientes = async () => {
    try {
        const response = await fetch(`${API_URL}/solicitudes-movil/pendientes`);
        if (!response.ok) throw new Error('Error al obtener solicitudes pendientes');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener estadísticas de solicitudes móviles
 * @returns {Promise<Object>} Estadísticas generales
 */
export const getEstadisticas = async () => {
    try {
        const response = await fetch(`${API_URL}/solicitudes-movil/stats`);
        if (!response.ok) throw new Error('Error al obtener estadísticas');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener una solicitud por ID
 * @param {number} id - ID de la solicitud
 * @returns {Promise<Object>} Datos de la solicitud
 */
export const getSolicitudMovil = async (id) => {
    try {
        const response = await fetch(`${API_URL}/solicitudes-movil/${id}`);
        if (!response.ok) throw new Error('Error al obtener solicitud móvil');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Obtener una solicitud por token
 * @param {string} token - Token de la solicitud
 * @returns {Promise<Object>} Datos de la solicitud
 */
export const getSolicitudPorToken = async (token) => {
    try {
        const url = `${API_URL}/solicitudes-movil/token/${token}`;
        console.log('🔍 Consultando solicitud por token:', url);

        const response = await fetch(url);
        
        console.log('📥 Status:', response.status);

        // Obtener texto primero para debugging
        const responseText = await response.text();
        
        // Intentar parsear como JSON
        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            console.error('❌ Error al parsear respuesta:', parseError);
            console.error('📄 Respuesta:', responseText.substring(0, 200));
            throw new Error('Respuesta inválida del servidor');
        }

        if (!response.ok) {
            throw new Error(data.error || 'Error al obtener solicitud por token');
        }

        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Crear una nueva solicitud de dispositivo móvil
 * @param {Object} solicitud - Datos de la solicitud
 * @param {string} solicitud.nombre - Nombre del dispositivo
 * @param {string} solicitud.correo - Correo del solicitante
 * @param {string} solicitud.descripcion - Descripción del dispositivo
 * @param {string} solicitud.ip - Dirección IP del dispositivo
 * @param {string} solicitud.mac - Dirección MAC del dispositivo
 * @param {string} solicitud.sistema_operativo - SO del dispositivo (iOS/Android)
 * @param {string} solicitud.observaciones - Observaciones adicionales (opcional)
 * @returns {Promise<Object>} Solicitud creada con token
 */
export const crearSolicitudMovil = async (solicitud) => {
    try {
        // Validaciones
        if (!solicitud.nombre || solicitud.nombre.trim() === '') {
            throw new Error('El nombre del dispositivo es obligatorio');
        }
        if (!solicitud.correo || solicitud.correo.trim() === '') {
            throw new Error('El correo es obligatorio');
        }
        if (!solicitud.ip || solicitud.ip.trim() === '') {
            throw new Error('La dirección IP es obligatoria');
        }
        if (!solicitud.mac || solicitud.mac.trim() === '') {
            throw new Error('La dirección MAC es obligatoria');
        }
        if (!solicitud.sistema_operativo) {
            throw new Error('El sistema operativo es obligatorio');
        }

        // Validar formato de correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(solicitud.correo)) {
            throw new Error('El formato del correo no es válido');
        }

        // Validar sistema operativo
        const sistemasValidos = ['iOS', 'Android'];
        if (!sistemasValidos.includes(solicitud.sistema_operativo)) {
            throw new Error('Sistema operativo no válido. Debe ser iOS o Android');
        }

        const solicitudDB = {
            nombre: solicitud.nombre.trim(),
            correo: solicitud.correo.toLowerCase().trim(),
            descripcion: solicitud.descripcion?.trim() || '',
            ip: solicitud.ip.trim(),
            mac: solicitud.mac.trim().toUpperCase(),
            sistema_operativo: solicitud.sistema_operativo,
            observaciones: solicitud.observaciones?.trim() || ''
        };

        const url = `${API_URL}/solicitudes-movil`;
        console.log('📡 URL completa:', url);
        console.log('📡 Enviando solicitud móvil:', solicitudDB);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(solicitudDB),
        });

        console.log('📥 Status de respuesta:', response.status, response.statusText);

        // Obtener el texto de la respuesta primero para debugging
        const responseText = await response.text();
        console.log('📄 Respuesta del servidor (primeros 500 chars):', responseText.substring(0, 500));

        // Intentar parsear como JSON
        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            console.error('❌ Error al parsear JSON:', parseError);
            console.error('📄 Respuesta completa:', responseText);
            throw new Error(`El servidor respondió con un formato inválido (${response.status}). Verifica que la ruta /api/solicitudes-moviles existe en el backend.`);
        }

        if (!response.ok) {
            throw new Error(data.error || data.message || `Error del servidor (${response.status})`);
        }

        console.log('✅ Solicitud móvil creada exitosamente:', data);

        return data;
    } catch (error) {
        console.error('❌ Error al crear solicitud móvil:', error);
        throw error;
    }
};

/**
 * Aceptar una solicitud de dispositivo móvil
 * @param {number} id - ID de la solicitud
 * @param {number} idUsuarioAprobador - ID del usuario que aprueba
 * @param {string} observaciones - Observaciones de la aprobación (opcional)
 * @returns {Promise<Object>} Resultado de la aprobación
 */
export const aceptarSolicitudMovil = async (id, idUsuarioAprobador, observaciones = '') => {
    try {
        if (!idUsuarioAprobador) {
            throw new Error('El ID del usuario aprobador es obligatorio');
        }

        const data = {
            id_usuario_aprobador: idUsuarioAprobador,
            observaciones: observaciones.trim()
        };

        console.log('✅ Aceptando solicitud móvil:', id);

        const response = await fetch(`${API_URL}/solicitudes-movil/${id}/aceptar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al aceptar solicitud móvil');
        }

        const resultado = await response.json();
        console.log('✅ Solicitud móvil aceptada exitosamente');

        return resultado;
    } catch (error) {
        console.error('❌ Error al aceptar solicitud móvil:', error);
        throw error;
    }
};

/**
 * Rechazar una solicitud de dispositivo móvil
 * @param {number} id - ID de la solicitud
 * @param {number} idUsuarioAprobador - ID del usuario que rechaza
 * @param {string} motivoRechazo - Motivo del rechazo
 * @param {string} observaciones - Observaciones adicionales (opcional)
 * @returns {Promise<Object>} Resultado del rechazo
 */
export const rechazarSolicitudMovil = async (id, idUsuarioAprobador, motivoRechazo, observaciones = '') => {
    try {
        if (!idUsuarioAprobador) {
            throw new Error('El ID del usuario aprobador es obligatorio');
        }
        if (!motivoRechazo || motivoRechazo.trim() === '') {
            throw new Error('El motivo del rechazo es obligatorio');
        }

        const data = {
            id_usuario_aprobador: idUsuarioAprobador,
            motivo_rechazo: motivoRechazo.trim(),
            observaciones: observaciones.trim()
        };

        console.log('❌ Rechazando solicitud móvil:', id);

        const response = await fetch(`${API_URL}/solicitudes-movil/${id}/rechazar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al rechazar solicitud móvil');
        }

        const resultado = await response.json();
        console.log('✅ Solicitud móvil rechazada exitosamente');

        return resultado;
    } catch (error) {
        console.error('❌ Error al rechazar solicitud móvil:', error);
        throw error;
    }
};

/**
 * Eliminar una solicitud de dispositivo móvil
 * @param {number} id - ID de la solicitud a eliminar
 * @returns {Promise<Object>} Resultado de la eliminación
 */
export const eliminarSolicitudMovil = async (id) => {
    try {
        console.log('🗑️ Eliminando solicitud móvil:', id);

        const response = await fetch(`${API_URL}/solicitudes-movil/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar solicitud móvil');
        }

        const resultado = await response.json();
        console.log('✅ Solicitud móvil eliminada exitosamente');

        return resultado;
    } catch (error) {
        console.error('❌ Error al eliminar solicitud móvil:', error);
        throw error;
    }
};

/**
 * Filtrar solicitudes por estado
 * @param {string} estado - Estado a filtrar (Pendiente/Aceptado/Rechazado)
 * @returns {Promise<Array>} Lista de solicitudes filtradas
 */
export const filtrarPorEstado = async (estado) => {
    try {
        const estadosValidos = ['Pendiente', 'Aceptado', 'Rechazado'];
        if (!estadosValidos.includes(estado)) {
            throw new Error('Estado no válido');
        }

        const response = await fetch(`${API_URL}/solicitudes-movil?estado=${estado}`);
        if (!response.ok) throw new Error('Error al filtrar solicitudes');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

/**
 * Filtrar solicitudes por sistema operativo
 * @param {string} sistemaOperativo - SO a filtrar (iOS/Android)
 * @returns {Promise<Array>} Lista de solicitudes filtradas
 */
export const filtrarPorSistemaOperativo = async (sistemaOperativo) => {
    try {
        const sistemasValidos = ['iOS', 'Android'];
        if (!sistemasValidos.includes(sistemaOperativo)) {
            throw new Error('Sistema operativo no válido');
        }

        const response = await fetch(`${API_URL}/solicitudes-movil?sistema_operativo=${sistemaOperativo}`);
        if (!response.ok) throw new Error('Error al filtrar solicitudes');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

// Exportar todo el servicio como default
export default {
    getSolicitudesMoviles,
    getSolicitudesPendientes,
    getEstadisticas,
    getSolicitudMovil,
    getSolicitudPorToken,
    crearSolicitudMovil,
    aceptarSolicitudMovil,
    rechazarSolicitudMovil,
    eliminarSolicitudMovil,
    filtrarPorEstado,
    filtrarPorSistemaOperativo
};