
import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');






export const getConfiguracion = async (token) => {
  try {
    const configResponse = await fetch(`${API_URL}/configuracion`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!configResponse.ok) {
      const errorData = await configResponse.json();
      throw new Error(errorData.error || 'Error al obtener configuración');
    }

    const responseJson = await configResponse.json();


    const config = responseJson.data || responseJson;


    let paletaColores = config.paleta_colores;
    if (typeof paletaColores === 'string') {
      try {
        paletaColores = JSON.parse(paletaColores);
      } catch (e) {

      }
    }


    let ordenCredenciales = config.credenciales_orden || config.orden_credenciales;

    if (typeof ordenCredenciales === 'string') {
      try {
        ordenCredenciales = JSON.parse(ordenCredenciales);
      } catch (e) {

      }
    }

    // Map aliases from desktop naming to mobile naming
    const ALIAS_MAP = {
      'huella': 'dactilar',
      'rostro': 'facial',
      'codigo': 'pin',
      'code': 'pin',
      'face': 'facial',
      'fingerprint': 'dactilar'
    };

    // Normalizar a formato uniforme [{ metodo: 'pin', activo: true, nivel: 1 }, ...]
    let ordenNormalizado = [];
    if (Array.isArray(ordenCredenciales)) {
      ordenNormalizado = ordenCredenciales.map((item, index) => {
        if (typeof item === 'string') {
          const metodo = ALIAS_MAP[item] || item;
          return { metodo, activo: true, nivel: index + 1 };
        }
        const metodo = ALIAS_MAP[item.metodo] || item.metodo || '';
        return {
          metodo,
          activo: item.activo !== false,
          nivel: item.nivel || item.prioridad || index + 1
        };
      });
    } else if (typeof ordenCredenciales === 'object' && ordenCredenciales !== null) {
      ordenNormalizado = Object.entries(ordenCredenciales)
        .map(([key, value]) => ({
          metodo: ALIAS_MAP[key] || key,
          activo: value?.activo !== false,
          nivel: value?.prioridad || value?.nivel || 99
        }))
        .sort((a, b) => a.nivel - b.nivel);
    } else {
      // Default
      ordenNormalizado = [
        { metodo: 'pin', activo: true, nivel: 1 },
        { metodo: 'dactilar', activo: true, nivel: 2 },
        { metodo: 'facial', activo: true, nivel: 3 }
      ];
    }

    const configuracion = {
      ...config,
      paleta_colores: paletaColores,
      credenciales_orden: ordenNormalizado,
      orden_credenciales: ordenNormalizado
    };

    return {
      success: true,
      data: configuracion
    };

  } catch (error) {
    throw error;
  }
};


export const updateConfiguracion = async (configId, configuracionData, token) => {
  try {
    const response = await fetch(`${API_URL}/configuracion/${configId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configuracionData)
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al actualizar configuración');
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    throw error;
  }
};


export const toggleMantenimiento = async (configId, esMantenimiento, token) => {
  try {
    const response = await fetch(`${API_URL}/configuracion/${configId}/mantenimiento`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ es_mantenimiento: esMantenimiento })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al alternar mantenimiento');
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    throw error;
  }
};


export const getOrdenCredenciales = async (token) => {
  try {
    const response = await getConfiguracion(token);

    if (response.success && response.data.orden_credenciales) {
      const orden = response.data.orden_credenciales;
      // Persist to SQLite cache for offline use
      try {
        const sqliteManager = (await import('./offline/sqliteManager.mjs')).default;
        await sqliteManager.saveOrdenCredenciales(orden);
      } catch { /* non-critical */ }

      return {
        success: true,
        ordenCredenciales: orden
      };
    }

    return {
      success: true,
      ordenCredenciales: null
    };

  } catch (error) {
    // Network failed — try the SQLite cache
    try {
      const sqliteManager = (await import('./offline/sqliteManager.mjs')).default;
      const cached = await sqliteManager.getOrdenCredenciales();
      if (cached) {
        return { success: true, ordenCredenciales: cached };
      }
    } catch { /* ignore */ }

    return {
      success: true,
      ordenCredenciales: null
    };
  }
};


export const getMaintenanceStatus = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    let response;
    try {
      response = await fetch(`${API_URL}/configuracion/public/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
    } catch (e) {
      clearTimeout(timeoutId);
      return { maintenance: false };
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { maintenance: false };
    }

    const data = await response.json();
    return { maintenance: data.maintenance === true };
  } catch (error) {
    return { maintenance: false };
  }
};

export default {
  getConfiguracion,
  updateConfiguracion,
  toggleMantenimiento,
  getOrdenCredenciales,
  getMaintenanceStatus
};