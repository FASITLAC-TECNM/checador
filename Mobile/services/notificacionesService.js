


import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');







export const getNotificacionesRecientes = async (token, limit = 20) => {
  try {
    const response = await fetch(`${API_URL}/eventos/recientes?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener notificaciones');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};











export const getNotificaciones = async (token, filtros = {}) => {
  try {
    const params = new URLSearchParams();

    if (filtros.empleado_id) params.append('empleado_id', filtros.empleado_id);
    if (filtros.tipo_evento) params.append('tipo_evento', filtros.tipo_evento);
    if (filtros.prioridad) params.append('prioridad', filtros.prioridad);
    if (filtros.limit) params.append('limit', filtros.limit);
    if (filtros.offset) params.append('offset', filtros.offset);

    const url = `${API_URL}/eventos${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener notificaciones');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};






export const getEstadisticasEventos = async (token) => {
  try {
    const response = await fetch(`${API_URL}/eventos/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener estadísticas');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};







export const getNotificacionById = async (token, id) => {
  try {
    const response = await fetch(`${API_URL}/eventos/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener notificación');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

export default {
  getNotificacionesRecientes,
  getNotificaciones,
  getEstadisticasEventos,
  getNotificacionById
};