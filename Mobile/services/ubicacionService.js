// services/solicitudMovilService.js
import axios from 'axios';
import { Platform } from 'react-native';

// Configuración del API
const API_BASE_URL = 'https://tu-dev-tunnel.com/api'; // REEMPLAZAR con tu dev tunnel URL

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Crear una nueva solicitud de dispositivo móvil
 */
export const crearSolicitudMovil = async (data) => {
  try {
    console.log('📤 Enviando solicitud al servidor:', data);

    const response = await api.post('/solicitudes', {
      tipo: 'movil',
      nombre: data.nombre,
      descripcion: data.descripcion,
      correo: data.correo,
      ip: data.ip,
      mac: data.mac,
      sistema_operativo: data.sistema_operativo,
      observaciones: data.observaciones,
      empresa_id: data.empresa_id // Ahora incluimos empresa_id
    });

    console.log('✅ Respuesta exitosa:', response.data);

    return {
      id: response.data.data.id,
      token_solicitud: response.data.data.token,
      estado: response.data.data.estado
    };

  } catch (error) {
    console.error('❌ Error en crearSolicitudMovil:', error);
    
    if (error.response) {
      // Error de respuesta del servidor
      throw new Error(error.response.data.message || 'Error al crear solicitud');
    } else if (error.request) {
      // No se recibió respuesta
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
    } else {
      // Error en la configuración
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
 */
export const verificarEmpresa = async (empresaId) => {
  try {
    console.log('🏢 Verificando empresa:', empresaId);

    // Nota: Esta ruta requiere autenticación según tu código
    // Para el onboarding, necesitarás hacer esta verificación de otra forma
    // o crear un endpoint público para verificar códigos de empresa
    const response = await api.get(`/empresas/${empresaId}`);

    return {
      existe: true,
      nombre: response.data.data.nombre,
      activa: response.data.data.es_activo
    };

  } catch (error) {
    console.error('❌ Error verificando empresa:', error);
    
    if (error.response?.status === 404) {
      return {
        existe: false,
        mensaje: 'Empresa no encontrada'
      };
    }
    
    throw new Error('Error al verificar la empresa');
  }
};