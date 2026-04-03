// services/reportesService.js
// Servicio modular para gestión de reportes

import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');

/**
 * Obtener datos para reporte individual de empleado
 * @param {number} idEmpleado - ID del empleado
 * @param {Object} opciones - Opciones del reporte
 * @param {string} opciones.fecha_inicio - Fecha inicio (YYYY-MM-DD)
 * @param {string} opciones.fecha_fin - Fecha fin (YYYY-MM-DD)
 * @param {boolean} [opciones.incluir_incidencias=true] - Incluir incidencias
 * @param {boolean} [opciones.incluir_estadisticas=true] - Incluir estadísticas
 * @returns {Promise<Object>} Datos del reporte
 */
export const obtenerDatosReporteEmpleado = async (idEmpleado, opciones = {}) => {
    try {
        const params = new URLSearchParams({
            ...(opciones.fecha_inicio && { fecha_inicio: opciones.fecha_inicio }),
            ...(opciones.fecha_fin && { fecha_fin: opciones.fecha_fin }),
            incluir_incidencias: opciones.incluir_incidencias ?? true,
            incluir_estadisticas: opciones.incluir_estadisticas ?? true
        });

        const response = await fetch(`${API_URL}/reportes/empleado/${idEmpleado}?${params}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al obtener datos del reporte');
        }
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo reporte de empleado:', error);
        throw error;
    }
};

/**
 * Obtener datos para reporte de departamento
 * @param {number} idDepartamento - ID del departamento
 * @param {Object} opciones - Opciones del reporte
 * @param {string} opciones.fecha_inicio - Fecha inicio (YYYY-MM-DD)
 * @param {string} opciones.fecha_fin - Fecha fin (YYYY-MM-DD)
 * @param {boolean} [opciones.incluir_empleados_inactivos=false] - Incluir empleados inactivos
 * @returns {Promise<Object>} Datos del reporte
 */
export const obtenerDatosReporteDepartamento = async (idDepartamento, opciones = {}) => {
    try {
        const params = new URLSearchParams({
            fecha_inicio: opciones.fecha_inicio,
            fecha_fin: opciones.fecha_fin,
            incluir_empleados_inactivos: opciones.incluir_empleados_inactivos ?? false
        });

        const response = await fetch(`${API_URL}/reportes/departamento/${idDepartamento}?${params}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al obtener datos del reporte');
        }
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo reporte de departamento:', error);
        throw error;
    }
};

/**
 * Obtener datos para reporte global/ejecutivo
 * @param {Object} opciones - Opciones del reporte
 * @param {string} opciones.fecha_inicio - Fecha inicio (YYYY-MM-DD)
 * @param {string} opciones.fecha_fin - Fecha fin (YYYY-MM-DD)
 * @param {string} [opciones.agrupar_por] - Criterio de agrupación (departamento, mes, semana)
 * @returns {Promise<Object>} Datos del reporte
 */
export const obtenerDatosReporteGlobal = async (opciones = {}) => {
    try {
        const params = new URLSearchParams({
            fecha_inicio: opciones.fecha_inicio,
            fecha_fin: opciones.fecha_fin,
            ...(opciones.agrupar_por && { agrupar_por: opciones.agrupar_por })
        });

        const response = await fetch(`${API_URL}/reportes/global?${params}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al obtener datos del reporte');
        }
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo reporte global:', error);
        throw error;
    }
};

/**
 * Obtener datos para reporte de incidencias
 * @param {Object} opciones - Opciones del reporte
 * @param {string} opciones.fecha_inicio - Fecha inicio (YYYY-MM-DD)
 * @param {string} opciones.fecha_fin - Fecha fin (YYYY-MM-DD)
 * @param {string} [opciones.tipo_incidencia] - Tipo de incidencia (retardo, justificante, permiso, vacaciones, dias_festivos)
 * @param {string} [opciones.estado] - Estado (aprobada, pendiente, rechazada)
 * @param {number} [opciones.id_empleado] - ID del empleado
 * @param {number} [opciones.id_departamento] - ID del departamento
 * @returns {Promise<Object>} Datos del reporte
 */
export const obtenerDatosReporteIncidencias = async (opciones = {}) => {
    try {
        const params = new URLSearchParams({
            fecha_inicio: opciones.fecha_inicio,
            fecha_fin: opciones.fecha_fin,
            ...(opciones.tipo_incidencia && { tipo_incidencia: opciones.tipo_incidencia }),
            ...(opciones.estado && { estado: opciones.estado }),
            ...(opciones.id_empleado && { id_empleado: opciones.id_empleado }),
            ...(opciones.id_departamento && { id_departamento: opciones.id_departamento })
        });

        const response = await fetch(`${API_URL}/reportes/incidencias?${params}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al obtener datos del reporte');
        }
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo reporte de incidencias:', error);
        throw error;
    }
};

// Exportar todo el servicio como default
export default {
    obtenerDatosReporteEmpleado,
    obtenerDatosReporteDepartamento,
    obtenerDatosReporteGlobal,
    obtenerDatosReporteIncidencias
};
