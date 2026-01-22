// services/solicitudMovilService.js
import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import getApiEndpoint from '../config/api';

// Configuración del API usando tu configuración centralizada
const API_BASE_URL = getApiEndpoint('/api');

console.log('🔧 API Base URL configurada:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación si existe
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('No hay token de autenticación');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Crear una nueva solicitud de dispositivo móvil
 */
export const crearSolicitudMovil = async (data) => {
  try {
    const payload = {
      tipo: 'movil',
      nombre: data.nombre,
      descripcion: data.descripcion,
      correo: data.correo,
      ip: data.ip,
      mac: data.mac,
      sistema_operativo: data.sistema_operativo,
      observaciones: data.observaciones,
      empresa_id: data.empresa_id
    };

    const response = await api.post('/solicitudes', payload);

    console.log('✅ Respuesta exitosa:', response.data);

    return {
      id: response.data.data.id,
      token_solicitud: response.data.data.token,
      estado: response.data.data.estado
    };

  } catch (error) {
    console.error('❌ Error en crearSolicitudMovil:', error);
    console.error('❌ Error detalles:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response) {
      // Error de respuesta del servidor
      throw new Error(error.response.data.message || 'Error al crear solicitud');
    } else if (error.request) {
      // No se recibió respuesta
      throw new Error(`No se pudo conectar con el servidor en ${API_BASE_URL}. Verifica tu conexión y que el backend esté corriendo.`);
    } else {
      // Error en la configuración
      throw new Error('Error al configurar la solicitud');
    }
  }
};

/**
 * Reabrir una solicitud rechazada cambiando su estado a pendiente
 */
export const reabrirSolicitudMovil = async (solicitudId, observaciones) => {
  try {
    const payload = {
      observaciones: observaciones || 'Solicitud reabierta desde dispositivo móvil'
    };

    console.log('🔄 Reabriendo solicitud:', solicitudId);

    const response = await api.patch(`/solicitudes/${solicitudId}/pendiente`, payload);

    console.log('✅ Solicitud reabierta:', response.data);

    return {
      id: response.data.data.id,
      token_solicitud: response.data.data.token,
      estado: response.data.data.estado
    };

  } catch (error) {
    console.error('❌ Error en reabrirSolicitudMovil:', error);
    console.error('❌ Error detalles:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response) {
      // Si ya está pendiente
      if (error.response.status === 400 && error.response.data?.message?.includes('ya está en estado pendiente')) {
        return {
          id: solicitudId,
          estado: 'pendiente',
          yaEstabaPendiente: true
        };
      }
      throw new Error(error.response.data.message || 'Error al reabrir solicitud');
    } else if (error.request) {
      throw new Error(`No se pudo conectar con el servidor en ${API_BASE_URL}`);
    } else {
      throw new Error('Error al configurar la solicitud');
    }
  }
};

/**
 * Obtener estado de solicitud por token
 */
export const getSolicitudPorToken = async (token) => {
  try {
    console.log('🔍 Verificando solicitud con token:', token);

    const response = await api.get(`/solicitudes/verificar/${token}`);

    console.log('📥 Estado recibido:', response.data);

    return response.data.data;

  } catch (error) {
    console.error('❌ Error en getSolicitudPorToken:', error);
    
    if (error.response?.status === 404) {
      throw new Error('Solicitud no encontrada');
    }
    
    throw new Error('Error al verificar el estado de la solicitud');
  }
};

/**
 * Verificar si una empresa existe por su ID
 * Esta función asume que NO tienes autenticación aún durante el onboarding
 * Por lo tanto, simplemente valida el formato del código
 */
export const verificarEmpresa = async (empresaId) => {
  try {
    console.log('🏢 Verificando empresa:', empresaId);

    // Validación básica del formato
    if (!empresaId || empresaId.trim().length < 3) {
      return {
        existe: false,
        mensaje: 'Código de empresa inválido'
      };
    }

    // Intenta hacer la consulta al servidor
    try {
      const response = await api.get(`/empresas/${empresaId}`);
      
      console.log('✅ Empresa verificada:', response.data);

      return {
        existe: true,
        nombre: response.data.data.nombre,
        activa: response.data.data.es_activo
      };
    } catch (error) {
      // Si es 401 o 403 (sin autenticación), asumimos que la empresa existe
      // El backend validará el ID cuando se envíe la solicitud
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('⚠️ Ruta protegida, se validará al enviar solicitud');
        return {
          existe: true,
          nombre: empresaId,
          activa: true,
          pendienteValidacion: true
        };
      }

      // Si es 404, la empresa no existe
      if (error.response?.status === 404) {
        return {
          existe: false,
          mensaje: 'Empresa no encontrada'
        };
      }

      // Otros errores
      throw error;
    }

  } catch (error) {
    console.error('❌ Error verificando empresa:', error);
    
    // En caso de error de red u otro, permitimos continuar
    // La validación real se hará en el backend al crear la solicitud
    console.log('⚠️ No se pudo verificar, se validará al enviar solicitud');
    return {
      existe: true,
      nombre: empresaId,
      activa: true,
      pendienteValidacion: true
    };
  }
};

/**
 * Guardar token de autenticación (si lo tienes)
 */
export const guardarToken = async (token) => {
  try {
    await AsyncStorage.setItem('@auth_token', token);
    console.log('✅ Token guardado');
  } catch (error) {
    console.error('❌ Error guardando token:', error);
  }
};

/**
 * Verificar si un dispositivo móvil existe y está activo
 */
export const verificarDispositivoActivo = async (solicitudId) => {
  try {
    console.log('🔍 Verificando dispositivo con solicitud:', solicitudId);

    const response = await api.get(`/solicitudes/${solicitudId}`);

    console.log('📥 Estado de solicitud:', response.data);

    // Verificar que la solicitud existe y está aceptada
    if (response.data.success && response.data.data) {
      const solicitud = response.data.data;
      
      if (solicitud.estado?.toLowerCase() === 'aceptado') {
        return {
          valido: true,
          solicitud: solicitud
        };
      } else {
        return {
          valido: false,
          motivo: `Solicitud en estado: ${solicitud.estado}`,
          estado: solicitud.estado
        };
      }
    }

    return {
      valido: false,
      motivo: 'Solicitud no encontrada'
    };

  } catch (error) {
    console.error('❌ Error verificando dispositivo:', error);
    
    if (error.response?.status === 404) {
      return {
        valido: false,
        motivo: 'Solicitud eliminada o no existe'
      };
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      // Si requiere autenticación, intentar con el token
      return {
        valido: false,
        motivo: 'Requiere autenticación',
        requiereLogin: true
      };
    }

    throw error;
  }
};

/**
 * Limpiar token de autenticación
 */
export const limpiarToken = async () => {
  try {
    await AsyncStorage.removeItem('@auth_token');
    console.log('✅ Token eliminado');
  } catch (error) {
    console.error('❌ Error eliminando token:', error);
  }
};