


import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');


let cacheGlobal = {
  data: null,
  timestamp: null
};


const CACHE_DURACION_MS = 5 * 60 * 1000;




const cacheEsValido = () => {
  if (!cacheGlobal.data || !cacheGlobal.timestamp) return false;
  return Date.now() - cacheGlobal.timestamp < CACHE_DURACION_MS;
};




export const limpiarCacheAvisos = () => {
  cacheGlobal = { data: null, timestamp: null };
};








export const getAvisosGlobales = async (token, forzarRecarga = false) => {

  if (!forzarRecarga && cacheEsValido()) {
    return { success: true, data: cacheGlobal.data, fromCache: true };
  }

  const fetchPromise = fetch(`${API_URL}/avisos/globales`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  const response = await Promise.race([
    fetchPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado')), 5000)
    )
  ]);

  if (!response.ok) {
    throw new Error('Error al obtener avisos globales');
  }

  const resultado = await response.json();


  if (resultado.success) {
    cacheGlobal = {
      data: resultado.data,
      timestamp: Date.now()
    };
  }

  return { ...resultado, fromCache: false };
};








export const getAvisosDeEmpleado = async (token, empleadoId) => {
  const fetchPromise = fetch(`${API_URL}/empleados/${empleadoId}/avisos`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  const response = await Promise.race([
    fetchPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado')), 5000)
    )
  ]);

  if (!response.ok) {
    throw new Error('Error al obtener avisos del empleado');
  }

  const resultado = await response.json();
  return resultado;
};

export default {
  getAvisosGlobales,
  getAvisosDeEmpleado,
  limpiarCacheAvisos
};