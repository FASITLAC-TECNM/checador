
import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import getApiEndpoint from '../config/api';
const API_BASE_URL = getApiEndpoint('/api');
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

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

export const verificarCorreoEnEmpresa = async (correo, empresaId, tokenOverride = null) => {
  console.log('[SolicitudSvc] ─── verificarCorreoEnEmpresa ───');
  console.log('[SolicitudSvc] correo (raw):', correo, '| empresaId:', empresaId);
  console.log('[SolicitudSvc] tokenOverride:', tokenOverride ? '✓ token personal recibido' : 'null (usará interceptor/storage)');
  try {
    if (!correo || !empresaId) {
      console.warn('[SolicitudSvc] ✗ correo o empresaId vacíos');
      return {
        existe: false,
        mensaje: 'Correo o empresa no válidos'
      };
    }
    const correoLower = correo.trim().toLowerCase();
    console.log('[SolicitudSvc] correo normalizado:', correoLower);
    try {
      const requestConfig = {
        params: { correo: correoLower, empresa_id: empresaId }
      };
      // Si se pasa token personal, sobrescribir el header para no usar el token-movil del storage
      if (tokenOverride) {
        requestConfig.headers = { Authorization: `Bearer ${tokenOverride}` };
        console.log('[SolicitudSvc] Usando token personal en header (override)');
      }
      console.log('[SolicitudSvc] GET /empleados/verificar-correo → params:', { correo: correoLower, empresa_id: empresaId });
      const response = await api.get(`/empleados/verificar-correo`, requestConfig);
      console.log('[SolicitudSvc] Respuesta HTTP status:', response.status);
      console.log('[SolicitudSvc] Respuesta body:', JSON.stringify(response.data));
      if (response.data.success && response.data.data) {
        const empleado = response.data.data;
        console.log('[SolicitudSvc] ✓ Empleado encontrado:', JSON.stringify(empleado));
        return {
          existe: true,
          activo: empleado.es_activo,
          empleadoId: empleado.id,
          usuario: {
            id: empleado.usuario_id,
            nombre: empleado.nombre,
            correo: empleado.correo
          },
          mensaje: empleado.es_activo ?
            `Correo verificado: ${empleado.nombre}` :
            'Usuario inactivo'
        };
      }
      console.warn('[SolicitudSvc] ✗ response.data.success=false o data vacío → data:', JSON.stringify(response.data));
      return {
        existe: false,
        mensaje: 'Correo no encontrado en esta empresa'
      };
    } catch (error) {
      console.error('[SolicitudSvc] ✗ Error HTTP en verificar-correo → status:', error.response?.status);
      console.error('[SolicitudSvc]   body del error:', JSON.stringify(error.response?.data));
      if (error.response?.status === 404) {
        console.warn('[SolicitudSvc] 404 → correo no existe en la empresa');
        return {
          existe: false,
          mensaje: 'Este correo no está registrado en la empresa'
        };
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('[SolicitudSvc] 401/403 → sin token válido, retornando pendienteValidacion=true');
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
    console.error('[SolicitudSvc] ✗ Excepción general en verificarCorreoEnEmpresa:', error?.message);
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

export const verificarEmpresa = async (empresaId, ip) => {
  try {
    if (!empresaId || empresaId.trim().length < 3) {
      return {
        existe: false,
        mensaje: 'Código de empresa inválido'
      };
    }
    try {
      console.log('Solicitando token movil para afiliación con identificador:', empresaId);
      
      const tokenResponse = await api.post(`/auth/token-movil`, {
        identificador: empresaId
      });
      
      if (tokenResponse.data.success && tokenResponse.data.data) {
        const { empresa, token } = tokenResponse.data.data;
        console.log('Token movil obtenido, guardando...');
        await guardarToken(token);
        
        // Ahora con el token guardado, el interceptor lo enviará, validamos la red
        console.log('Validando afiliación y red con token...');
        const response = await api.post(`/solicitudes/validar-afiliacion`, {
          identificador: empresaId,
          ip: ip
        });
        
        if (response.data.success && response.data.data) {
          const { empresa: empresaValidada, validacionRed } = response.data.data;
          return {
            existe: true,
            id: empresaValidada.id,
            nombre: empresaValidada.nombre,
            activa: empresaValidada.es_activo,
            fueraDeRed: validacionRed?.fueraDeRed || false,
            alertasRed: validacionRed?.alertas || [],
            token: token
          };
        }
      }
      return {
        existe: false,
        mensaje: 'Empresa no encontrada o no se pudo generar el token'
      };
    } catch (error) {
      console.log('Error en verificarEmpresa:', error.response?.status, error.response?.data);
      if (error.response?.status === 404) {
        return {
          existe: false,
          mensaje: 'Empresa no encontrada'
        };
      }
      if (error.response?.status === 403) {
        return {
          existe: true,
          activa: false,
          mensaje: error.response?.data?.message || 'La empresa no está activa'
        };
      }
      if (!error.response) {
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
      }
      throw new Error(error.response?.data?.message || 'Error al verificar empresa');
    }
  } catch (error) {
    throw error;
  }
};

export const guardarToken = async (token) => {
  try {
    await AsyncStorage.setItem('@auth_token', token);
  } catch (error) {

  }
};

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























export const verificarDispositivoPorEmpleado = async (empleadoId, token) => {
  try {
    const tempApi = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });



    let dispositivosActivos = [];
    try {
      const syncResponse = await tempApi.get(`/movil/sync/dispositivos/${empleadoId}`);
      if (syncResponse.data.success) {
        dispositivosActivos = syncResponse.data.dispositivos || [];
      }
    } catch (syncError) {
      // Si el sync endpoint falla (403/404/error), no propagamos.
      // Dejamos dispositivosActivos = [] y continuamos al fallback /movil/empleado/
      // que sí devuelve es_activo: false para dispositivos desactivados.
    }


    if (dispositivosActivos.length > 0) {
      const dispositivo = dispositivosActivos[0];
      return {
        existe: true,
        activo: true,
        dispositivo_id: dispositivo.id,
        sistema_operativo: dispositivo.sistema_operativo
      };
    }





    try {
      const movilResponse = await tempApi.get(`/movil/empleado/${empleadoId}`);

      if (movilResponse.data.success && movilResponse.data.data) {
        const dispositivo = movilResponse.data.data;

        if (dispositivo.es_activo === false) {

          return {
            existe: true,
            activo: false,
            dispositivo_id: dispositivo.id,
            sistema_operativo: dispositivo.sistema_operativo
          };
        }
      }
    } catch (movilError) {
      if (movilError.response?.status === 404) {

        return { existe: false, activo: false };
      }

      if (movilError.response?.status === 403) {



        return { existe: false, activo: false };
      }


      throw movilError;
    }


    return { existe: false, activo: false };

  } catch (error) {
    throw error;
  }
};




export const limpiarToken = async () => {
  try {
    await AsyncStorage.removeItem('@auth_token');
  } catch (error) {

  }
};