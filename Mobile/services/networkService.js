import NetInfo from '@react-native-community/netinfo';
import { getApiEndpoint } from '../config/api.js';
const API_URL = getApiEndpoint('/api');

export const obtenerSegmentosRed = async (token) => {
  try {
    const response = await fetch(`${API_URL}/configuracion`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) return [];
    const data = await response.json();
    const segmentos = data.data?.segmentos_red;
    if (!segmentos) return [];
    if (typeof segmentos === 'string') {
      try { return JSON.parse(segmentos); } catch { return []; }
    }
    return Array.isArray(segmentos) ? segmentos : [];
  } catch {
    return [];
  }
};

export const verificarRedDispositivo = async (token) => {
  const t0 = Date.now();
  try {
    const response = await fetch(`${API_URL}/configuracion`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const latencia = Date.now() - t0;
    if (!response.ok) {
      return {
        conectado: false,
        segmentos_configurados: [],
        latencia_ms: latencia,
        message: `Error al conectar con el servidor (${response.status})`
      };
    }
    const data = await response.json();
    const raw = data.data?.segmentos_red;
    let segmentos = [];
    if (raw) {
      segmentos = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
    }
    let ip_cliente = null;
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        ip_cliente = ipData.ip;
      }
    } catch (e) { }
    return {
      conectado: true,
      segmentos_configurados: segmentos,
      latencia_ms: latencia,
      ip_cliente,
      message: segmentos.length === 0 ? 'Conectado — sin restricción de red' : `Conectado — red configurada`,
      nota: 'Validación en modo diagnóstico. La validación real se ejecuta en el backend.'
    };
  } catch (error) {
    return {
      conectado: false,
      segmentos_configurados: [],
      latencia_ms: null,
      message: 'Sin conexión al servidor'
    };
  }
};
export default {
  verificarRedDispositivo,
  obtenerSegmentosRed
};