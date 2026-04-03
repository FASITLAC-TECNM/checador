// services/dashboardService.js
import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');

/**
 * Obtener estadísticas generales del dashboard
 * @returns {Promise<Object>} Estadísticas del sistema
 */
export const getEstadisticasDashboard = async () => {
    try {
        const response = await fetch(`${API_URL}/dashboard/stats`);
        if (!response.ok) {
            throw new Error('Error al obtener estadísticas del dashboard');
        }
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo estadísticas del dashboard:', error);
        throw error;
    }
};

export default {
    getEstadisticasDashboard
};
