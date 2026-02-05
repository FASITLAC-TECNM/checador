// services/solicitudMovilService.js
import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import getApiEndpoint from '../config/api';

// Configuración del API usando tu configuración centralizada
const API_BASE_URL = getApiEndpoint('/api');


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


    return {
      id: response.data.data.id,
      token_solicitud: response.data.data.token,
      estado: response.data.data.estado
    };

  } catch (error) {
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


    const response = await api.patch(`/solicitudes/${solicitudId}/pendiente`, payload);


    return {
      id: response.data.data.id,
      token_solicitud: response.data.data.token,
      estado: response.data.data.estado
    };

  } catch (error) {
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
 * Maneja los errores 404 de forma silenciosa para evitar logs alarmantes
 */
export const getSolicitudPorToken = async (token) => {
  try {

    const response = await api.get(`/solicitudes/verificar/${token}`);


    return response.data.data;

  } catch (error) {
    // Manejar 404 de forma más amigable
    if (error.response?.status === 404) {
      // Crear un error específico que sea fácil de identificar
      const notFoundError = new Error('Solicitud no encontrada');
      notFoundError.code = 'SOLICITUD_NOT_FOUND';
      notFoundError.status = 404;
      throw notFoundError;
    }

    throw new Error('Error al verificar el estado de la solicitud');
  }
};

/**
 * Verificar si un correo existe en una empresa específica
 */
export const verificarCorreoEnEmpresa = async (correo, empresaId) => {
  try {

    // Validación básica
    if (!correo || !empresaId) {
      return {
        existe: false,
        mensaje: 'Correo o empresa no válidos'
      };
    }

    const correoLower = correo.trim().toLowerCase();

    // Intentar verificar en el backend
    try {
      const response = await api.get(`/empleados/verificar-correo`, {
        params: {
          correo: correoLower,
          empresa_id: empresaId
        }
      });


      if (response.data.success && response.data.data) {
        const empleado = response.data.data;
        
        return {
          existe: true,
          activo: empleado.es_activo,
          empleadoId: empleado.id,
          usuario: {
            id: empleado.usuario_id,
            nombre: empleado.nombre,
            correo: empleado.correo
          },
          mensaje: empleado.es_activo 
            ? `Correo verificado: ${empleado.nombre}` 
            : 'Usuario inactivo'
        };
      }

      return {
        existe: false,
        mensaje: 'Correo no encontrado en esta empresa'
      };

    } catch (error) {
      // Si es 404, el correo no existe
      if (error.response?.status === 404) {
        return {
          existe: false,
          mensaje: 'Este correo no está registrado en la empresa'
        };
      }

      // Si es 401/403, la ruta está protegida
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Permitir continuar si la ruta requiere autenticación
        // El backend validará al crear la solicitud
        return {
          existe: true,
          activo: true,
          valido: true,
          pendienteValidacion: true,
          empleadoId: null,
          usuario: {
            nombre: correoLower.split('@')[0],
            correo: correoLower
          },
          mensaje: 'Se verificará al enviar la solicitud'
        };
      }

      // Otro error
      throw error;
    }

  } catch (error) {
    
    // En caso de error, permitir continuar
    // La validación real se hará en el backend
    return {
      existe: true,
      activo: true,
      valido: true,
      pendienteValidacion: true,
      empleadoId: null,
      usuario: {
        nombre: correo.split('@')[0],
        correo: correo.trim().toLowerCase()
      },
      mensaje: 'No se pudo verificar, se validará al enviar'
    };
  }
};

/**
 * Verificar si una empresa existe por su ID
 */
export const verificarEmpresa = async (empresaId) => {
  try {

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
      

      return {
        existe: true,
        nombre: response.data.data.nombre,
        activa: response.data.data.es_activo
      };
    } catch (error) {
      // Si es 401 o 403 (sin autenticación), asumimos que la empresa existe
      // El backend validará el ID cuando se envíe la solicitud
      if (error.response?.status === 401 || error.response?.status === 403) {
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
    
    // En caso de error de red u otro, permitimos continuar
    // La validación real se hará en el backend al crear la solicitud
    return {
      existe: true,
      nombre: empresaId,
      activa: true,
      pendienteValidacion: true
    };
  }
};

/**
 * Guardar token de autenticación
 */
export const guardarToken = async (token) => {
  try {
    await AsyncStorage.setItem('@auth_token', token);
  } catch (error) {
  }
};

/**
 * Verificar si un dispositivo móvil existe y está activo
 */
export const verificarDispositivoActivo = async (solicitudId) => {
  try {

    const response = await api.get(`/solicitudes/${solicitudId}`);


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
    // Manejar 404 de forma más amigable
    if (error.response?.status === 404) {
      return {
        valido: false,
        motivo: 'Solicitud eliminada o no existe'
      };
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
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
  } catch (error) {
  }
};