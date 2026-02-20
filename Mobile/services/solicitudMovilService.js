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
      console.log('Error al obtener token:', error);
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
    console.log('Error en verificarCorreoEnEmpresa:', error);
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
    console.log('🔍 Verificando empresa:', empresaId);

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

      console.log('✅ Empresa verificada:', response.data);

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
      console.log('❌ Error al verificar empresa:', error.response?.status, error.message);

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
    console.error('❌ Error crítico en verificarEmpresa:', error);
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
    console.log('Error al guardar token:', error);
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
 * 🔥 NUEVA FUNCIÓN: Verificar si un empleado tiene dispositivo móvil registrado en la BD
 * Usa el endpoint dedicado: GET /api/movil/sync/dispositivos/:empleadoId
 * 
 * Resuelve el problema de cuando se borra la caché de la app - ahora consulta la BD real
 * 
 * @param {string} empleadoId - ID del empleado
 * @param {string} token - Token de autenticación
 * @returns {Promise<{existe: boolean, activo: boolean, solicitud_id?: string, token?: string}>}
 */
export const verificarDispositivoPorEmpleado = async (empleadoId, token) => {
  try {
    console.log('🔍 [solicitudMovilService] Verificando dispositivo para empleado:', empleadoId);

    const tempApi = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    try {
      const response = await tempApi.get(`/movil/sync/dispositivos/${empleadoId}`);

      console.log('📱 [solicitudMovilService] Respuesta del servidor:', response.data);

      // 🔥 FIX: El endpoint retorna { dispositivos: [...], total: N, success: true }
      if (response.data.success && response.data.dispositivos) {
        const dispositivos = response.data.dispositivos;

        if (dispositivos.length > 0) {
          const dispositivo = dispositivos[0]; // Tomar el primer dispositivo

          console.log('✅ [solicitudMovilService] Dispositivo encontrado:', {
            id: dispositivo.id,
            sistema_operativo: dispositivo.sistema_operativo
          });

          // Ahora necesitamos verificar si tiene solicitud aceptada
          // Buscar en tabla de solicitudes por empleado_id
          try {
            // Intentar obtener la solicitud asociada
            const solicitudesResponse = await tempApi.get(`/solicitudes/empleado/${empleadoId}`);

            if (solicitudesResponse.data.success && solicitudesResponse.data.data) {
              const solicitudes = Array.isArray(solicitudesResponse.data.data)
                ? solicitudesResponse.data.data
                : [solicitudesResponse.data.data];

              // Buscar solicitud aceptada de tipo móvil
              const solicitudAceptada = solicitudes.find(s =>
                s.tipo === 'movil' && s.estado?.toLowerCase() === 'aceptado'
              );

              if (solicitudAceptada) {
                return {
                  existe: true,
                  activo: true,
                  dispositivo_id: dispositivo.id,
                  solicitud_id: solicitudAceptada.id,
                  token: solicitudAceptada.token || null,
                  sistema_operativo: dispositivo.sistema_operativo
                };
              }
            }
          } catch (solError) {
            console.log('⚠️ [solicitudMovilService] No se pudo obtener solicitud, asumiendo activo');
          }

          // Si tiene dispositivo pero no pudimos verificar solicitud, asumir activo
          return {
            existe: true,
            activo: true, // Asumir activo si tiene dispositivo registrado
            dispositivo_id: dispositivo.id,
            sistema_operativo: dispositivo.sistema_operativo
          };
        }

        // No tiene dispositivos
        console.log('ℹ️ [solicitudMovilService] Empleado no tiene dispositivo registrado');
        return {
          existe: false,
          activo: false
        };
      }

      console.log('⚠️ [solicitudMovilService] Respuesta inesperada del servidor');
      return {
        existe: false,
        activo: false
      };

    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️ [solicitudMovilService] Empleado no tiene dispositivo registrado (404)');
        return {
          existe: false,
          activo: false
        };
      }

      console.error('❌ [solicitudMovilService] Error consultando dispositivo:', error.message);
      throw error;
    }

  } catch (error) {
    console.error('❌ [solicitudMovilService] Error crítico en verificarDispositivoPorEmpleado:', error);
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
    console.log('Error al limpiar token:', error);
  }
};