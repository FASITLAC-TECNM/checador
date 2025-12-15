// services/eventosService.js
// Servicio para gestión de eventos del historial

import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');

console.log('🔗 Eventos API URL:', API_URL);

/**
 * Obtener todos los eventos
 * @param {Object} filtros - Filtros opcionales
 * @param {string} filtros.tipo_evento - Filtrar por tipo (notificacion, anuncio, alerta, recordatorio)
 * @param {string} filtros.estado - Filtrar por estado (Entrada, Salida, Ambos)
 * @param {string} filtros.fecha_inicio - Fecha de inicio para filtrar
 * @param {string} filtros.fecha_fin - Fecha de fin para filtrar
 * @param {number} filtros.limit - Límite de resultados
 */
export const obtenerEventos = async (filtros = {}) => {
    try {
        const params = new URLSearchParams();

        if (filtros.tipo_evento) params.append('tipo_evento', filtros.tipo_evento);
        if (filtros.estado) params.append('estado', filtros.estado);
        if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
        if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
        if (filtros.limit) params.append('limit', filtros.limit);

        const url = `${API_URL}/eventos${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('Error al obtener eventos');
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo eventos:', error);
        throw error;
    }
};

/**
 * Obtener un evento por ID
 * @param {number} id - ID del evento
 */
export const obtenerEvento = async (id) => {
    try {
        const response = await fetch(`${API_URL}/eventos/${id}`);
        if (!response.ok) throw new Error('Error al obtener evento');
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo evento:', error);
        throw error;
    }
};

/**
 * Obtener eventos recientes (últimos N eventos)
 * @param {number} limit - Número de eventos a obtener (default: 50)
 */
export const obtenerEventosRecientes = async (limit = 50) => {
    try {
        const response = await fetch(`${API_URL}/eventos?limit=${limit}&orden=desc`);
        if (!response.ok) throw new Error('Error al obtener eventos recientes');
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo eventos recientes:', error);
        throw error;
    }
};

/**
 * Obtener estadísticas de eventos por tipo
 */
export const obtenerEstadisticasEventos = async () => {
    try {
        const response = await fetch(`${API_URL}/eventos/estadisticas`);
        if (!response.ok) {
            // Si no existe el endpoint de estadísticas, calcular localmente
            const eventos = await obtenerEventos();
            return calcularEstadisticas(eventos);
        }
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        // Fallback: obtener todos los eventos y calcular estadísticas localmente
        try {
            const eventos = await obtenerEventos();
            return calcularEstadisticas(eventos);
        } catch (err) {
            throw err;
        }
    }
};

/**
 * Calcular estadísticas localmente de los eventos
 * @param {Array} eventos - Array de eventos
 */
const calcularEstadisticas = (eventos) => {
    const stats = {
        total: eventos.length,
        porTipo: {},
        porEstado: {}
    };

    eventos.forEach(evento => {
        // Contar por tipo
        const tipo = evento.tipo_evento || 'sin_tipo';
        stats.porTipo[tipo] = (stats.porTipo[tipo] || 0) + 1;

        // Contar por estado
        const estado = evento.estado || 'sin_estado';
        stats.porEstado[estado] = (stats.porEstado[estado] || 0) + 1;
    });

    return stats;
};

/**
 * Buscar eventos por término de búsqueda
 * @param {string} termino - Término a buscar en titulo y descripcion
 */
export const buscarEventos = async (termino) => {
    try {
        const response = await fetch(`${API_URL}/eventos/buscar?q=${encodeURIComponent(termino)}`);
        if (!response.ok) {
            // Si no existe el endpoint de búsqueda, buscar localmente
            const eventos = await obtenerEventos();
            return eventos.filter(e =>
                e.titulo?.toLowerCase().includes(termino.toLowerCase()) ||
                e.descripcion?.toLowerCase().includes(termino.toLowerCase())
            );
        }
        return await response.json();
    } catch (error) {
        console.error('Error buscando eventos:', error);
        throw error;
    }
};

/**
 * Exportar eventos a CSV
 * @param {Array} eventos - Array de eventos a exportar
 */
export const exportarEventosCSV = (eventos) => {
    const headers = ['ID', 'Título', 'Descripción', 'Estado', 'Tipo', 'Fecha'];
    const rows = eventos.map(e => [
        e.id,
        e.titulo,
        e.descripcion,
        e.estado,
        e.tipo_evento,
        new Date(e.created_at).toLocaleString('es-MX')
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `eventos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export default {
    obtenerEventos,
    obtenerEvento,
    obtenerEventosRecientes,
    obtenerEstadisticasEventos,
    buscarEventos,
    exportarEventosCSV
};
