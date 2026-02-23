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
      // Silencio — no bloquear la petición por fallo al leer token
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
      throw new Error(error.response.data.message || 'Error al crear solicitud');
    } else if (error.request) {
      throw new Error(`No se pudo conectar con el servidor en ${API_BASE_URL}. Verifica tu conexión y que el backend esté corriendo.`);
    } else {
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
    const response = await api.get(`/solicitudes/verificar/${token}`);
    return response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
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
    if (!correo || !empresaId) {
      return {
        existe: false,
        mensaje: 'Correo o empresa no válidos'
      };
    }

    const correoLower = correo.trim().toLowerCase();

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
      if (error.response?.status === 404) {
        return {
          existe: false,
          mensaje: 'Este correo no está registrado en la empresa'
        };
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
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

      throw error;
    }

  } catch (error) {
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
 * ✅ Verificar si una empresa existe por su ID
 * ACTUALIZADO: Usa el endpoint público /solicitudes/empresa/:id/verificar
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

    try {
      // ✅ CAMBIO PRINCIPAL: Usar el endpoint público que ya existe en el backend
      const response = await api.get(`/empresas/public/${empresaId}`);

      if (response.data.success && response.data.data) {
        return {
          existe: true,  // ✅ Si llegó aquí con éxito, la empresa existe
          nombre: response.data.data.nombre,
          activa: response.data.data.es_activo
        };
      }

      return {
        existe: false,
        mensaje: 'Empresa no encontrada'
      };

    } catch (error) {
      // Si es 404, la empresa no existe
      if (error.response?.status === 404) {
        return {
          existe: false,
          mensaje: 'Empresa no encontrada'
        };
      }

      // Si hay error de red, lanzar excepción
      if (!error.response) {
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
      }

      // Otros errores del servidor
      throw new Error(error.response?.data?.message || 'Error al verificar empresa');
    }

  } catch (error) {
    throw error;
  }
};

/**
 * Guardar token de autenticación
 */
export const guardarToken = async (token) => {
  try {
    await AsyncStorage.setItem('@auth_token', token);
  } catch (error) {
    // Silencio
  }
};

/**
 * Verificar si un dispositivo móvil existe y está activo
 */
export const verificarDispositivoActivo = async (solicitudId) => {
  try {
    const response = await api.get(`/solicitudes/${solicitudId}`);

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
 * 🔒 Verificar si un empleado tiene dispositivo móvil registrado en la BD.
 *
 * Usa el endpoint público de sync: GET /api/movil/sync/dispositivos/:empleadoId
 * Este endpoint NO requiere permiso DISPOSITIVO_VER, por lo que cualquier
 * empleado autenticado puede consultarlo (incluyendo empleados con roles básicos).
 *
 * Respuesta del endpoint:
 *   { success: true, dispositivos: [...], total: N }
 *   - total > 0  → tiene al menos un dispositivo ACTIVO
 *   - total === 0 → no tiene dispositivos activos (puede ser que nunca se registró
 *                   o que el admin lo desactivó)
 *
 * Para distinguir entre "nunca registrado" y "desactivado por admin" se hace
 * una segunda consulta a /movil/empleado/:id (con el token del usuario logueado).
 * Si esa devuelve 404 → nunca registró (ir a onboarding).
 * Si devuelve datos con es_activo=false → desactivado por admin (DeviceDisabledScreen).
 *
 * @param {string} empleadoId - ID del empleado
 * @param {string} token - Token de autenticación del usuario logueado
 * @returns {Promise<{existe: boolean, activo: boolean, dispositivo_id?: string}>}
 */
export const verificarDispositivoPorEmpleado = async (empleadoId, token) => {
  try {
    const tempApi = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    // PASO 1: Consultar el endpoint público de sync que devuelve dispositivos ACTIVOS.
    // No requiere permiso especial — cualquier usuario autenticado puede consultarlo.
    let dispositivosActivos = [];
    try {
      const syncResponse = await tempApi.get(`/movil/sync/dispositivos/${empleadoId}`);
      if (syncResponse.data.success) {
        dispositivosActivos = syncResponse.data.dispositivos || [];
      }
    } catch (syncError) {
      // Si falla el endpoint público, re-lanzar para que App.jsx lo maneje como error de red
      throw syncError;
    }

    // CASO A: Tiene dispositivo(s) activo(s) → todo bien
    if (dispositivosActivos.length > 0) {
      const dispositivo = dispositivosActivos[0];
      return {
        existe: true,
        activo: true,
        dispositivo_id: dispositivo.id,
        sistema_operativo: dispositivo.sistema_operativo,
      };
    }

    // CASO B: No tiene dispositivos activos.
    // Necesitamos saber si ALGUNA VEZ tuvo uno (desactivado por admin)
    // vs. si NUNCA se registró (primera vez / caché borrada).
    // Consultamos el endpoint autenticado que devuelve el último (activo o no).
    try {
      const movilResponse = await tempApi.get(`/movil/empleado/${empleadoId}`);

      if (movilResponse.data.success && movilResponse.data.data) {
        const dispositivo = movilResponse.data.data;

        if (dispositivo.es_activo === false) {
          // Estaba registrado pero el admin lo desactivó → DeviceDisabledScreen
          return {
            existe: true,
            activo: false,
            dispositivo_id: dispositivo.id,
            sistema_operativo: dispositivo.sistema_operativo,
          };
        }
      }
    } catch (movilError) {
      if (movilError.response?.status === 404) {
        // 404 = nunca registró dispositivo → ir a onboarding
        return { existe: false, activo: false };
      }

      if (movilError.response?.status === 403) {
        // Sin permiso DISPOSITIVO_VER (rol muy básico).
        // Confiamos en que el endpoint sync ya dijo total=0 → sin dispositivo activo.
        // Tratar como "sin dispositivo" → onboarding.
        return { existe: false, activo: false };
      }

      // Otro error de red/servidor → propagar
      throw movilError;
    }

    // Sin dispositivo activo, y sin historial encontrado → primera afiliación
    return { existe: false, activo: false };

  } catch (error) {
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
    // Silencio
  }
};