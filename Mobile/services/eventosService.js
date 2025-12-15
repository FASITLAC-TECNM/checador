// services/eventosService.js
// Servicio para gestión de eventos/notificaciones

import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

console.log('🔔 Eventos API URL:', API_URL);

/**
 * Obtener todos los eventos con filtros opcionales
 * @param {Object} filtros - Filtros opcionales (tipo_evento, estado, fecha_inicio, fecha_fin, limit, orden)
 * @returns {Promise<Array>} Array de eventos
 */
export const obtenerEventos = async (filtros = {}) => {
    try {
        // Construir query params
        const params = new URLSearchParams();
        
        if (filtros.tipo_evento) params.append('tipo_evento', filtros.tipo_evento);
        if (filtros.estado) params.append('estado', filtros.estado);
        if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
        if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
        if (filtros.limit) params.append('limit', filtros.limit);
        if (filtros.orden) params.append('orden', filtros.orden);

        const url = `${API_URL}/eventos?${params.toString()}`;
        console.log('🔔 Obteniendo eventos:', url);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Eventos obtenidos:', data.length);
        
        return data;
    } catch (error) {
        console.error('❌ Error obteniendo eventos:', error);
        throw error;
    }
};

/**
 * Obtener evento por ID
 * @param {number} id - ID del evento
 * @returns {Promise<Object>} Datos del evento
 */
export const obtenerEventoPorId = async (id) => {
    try {
        const url = `${API_URL}/eventos/${id}`;
        console.log('🔔 Obteniendo evento:', url);

        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Evento no encontrado');
            }
            const errorText = await response.text();
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Evento obtenido:', data);
        
        return data;
    } catch (error) {
        console.error('❌ Error obteniendo evento:', error);
        throw error;
    }
};

/**
 * Obtener estadísticas de eventos
 * @returns {Promise<Object>} Estadísticas
 */
export const obtenerEstadisticasEventos = async () => {
    try {
        const url = `${API_URL}/eventos/estadisticas`;
        console.log('📊 Obteniendo estadísticas:', url);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Estadísticas obtenidas:', data);
        
        return data;
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        throw error;
    }
};

/**
 * Buscar eventos por término
 * @param {string} query - Término de búsqueda
 * @returns {Promise<Array>} Array de eventos encontrados
 */
export const buscarEventos = async (query) => {
    try {
        const url = `${API_URL}/eventos/buscar?q=${encodeURIComponent(query)}`;
        console.log('🔍 Buscando eventos:', url);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Eventos encontrados:', data.length);
        
        return data;
    } catch (error) {
        console.error('❌ Error buscando eventos:', error);
        throw error;
    }
};

/**
 * Crear nuevo evento
 * @param {Object} evento - Datos del evento
 * @returns {Promise<Object>} Evento creado
 */
export const crearEvento = async (evento) => {
    try {
        const url = `${API_URL}/eventos`;
        console.log('🔔 Creando evento:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(evento)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Evento creado:', data);
        
        return data;
    } catch (error) {
        console.error('❌ Error creando evento:', error);
        throw error;
    }
};

/**
 * Obtener eventos recientes (útil para notificaciones)
 * @param {number} limit - Número máximo de eventos
 * @returns {Promise<Array>} Array de eventos recientes
 */
export const obtenerEventosRecientes = async (limit = 20) => {
    try {
        return await obtenerEventos({ limit, orden: 'desc' });
    } catch (error) {
        console.error('❌ Error obteniendo eventos recientes:', error);
        throw error;
    }
};

/**
 * Obtener eventos por estado (Entrada/Salida/Ambos)
 * @param {string} estado - Estado del evento
 * @param {number} limit - Número máximo
 * @returns {Promise<Array>} Array de eventos
 */
export const obtenerEventosPorEstado = async (estado, limit = 50) => {
    try {
        return await obtenerEventos({ 
            estado, 
            limit, 
            orden: 'desc' 
        });
    } catch (error) {
        console.error('❌ Error obteniendo eventos por estado:', error);
        throw error;
    }
};

/**
 * Formatear fecha relativa (ej: "Hace 5 minutos")
 * @param {string} fecha - Fecha en formato ISO
 * @returns {string} Texto de fecha relativa
 */
export const formatearFechaRelativa = (fecha) => {
    const ahora = new Date();
    const fechaEvento = new Date(fecha);
    const diffMs = ahora - fechaEvento;
    const diffSeg = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSeg / 60);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffSeg < 60) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
    if (diffHoras < 24) return `Hace ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`;
    if (diffDias < 7) return `Hace ${diffDias} ${diffDias === 1 ? 'día' : 'días'}`;
    
    return fechaEvento.toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
};

/**
 * Obtener icono según tipo de evento
 * @param {string} tipo - Tipo de evento
 * @returns {string} Nombre del icono de Ionicons
 */
export const obtenerIconoPorTipo = (tipo) => {
    const iconos = {
        'notificacion': 'notifications',
        'anuncio': 'megaphone',
        'alerta': 'alert-circle',
        'recordatorio': 'time'
    };
    
    return iconos[tipo] || 'information-circle';
};

/**
 * Obtener color según tipo de evento
 * @param {string} tipo - Tipo de evento
 * @returns {string} Color en hexadecimal
 */
export const obtenerColorPorTipo = (tipo) => {
    const colores = {
        'notificacion': '#2563eb', // Azul
        'anuncio': '#8b5cf6',      // Morado
        'alerta': '#ef4444',       // Rojo
        'recordatorio': '#f59e0b'  // Ámbar
    };
    
    return colores[tipo] || '#6b7280'; // Gris por defecto
};

// Exportar todo
export default {
    obtenerEventos,
    obtenerEventoPorId,
    obtenerEstadisticasEventos,
    buscarEventos,
    crearEvento,
    obtenerEventosRecientes,
    obtenerEventosPorEstado,
    formatearFechaRelativa,
    obtenerIconoPorTipo,
    obtenerColorPorTipo
};