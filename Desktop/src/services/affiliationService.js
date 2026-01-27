// src/services/affiliationService.js
// Servicio para gestionar solicitudes de afiliación de escritorio

import { getApiEndpoint } from "../config/apiEndPoint";

const API_URL = getApiEndpoint("/api");

/**
 * Generar un token de 6 caracteres para la solicitud
 * @returns {string} - Token de 6 caracteres alfanuméricos
 */
const generarToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

/**
 * Crear una solicitud de afiliación
 * @param {Object} datos - Datos de la solicitud
 * @param {string} datos.nombre - Nombre del equipo (CHAR 55)
 * @param {string} datos.descripcion - Descripción del equipo (TEXT)
 * @param {string} datos.correo - Correo electrónico (CHAR 55, opcional)
 * @param {string} datos.ip - Dirección IP (CHAR 12)
 * @param {string} datos.mac - Dirección MAC (CHAR 12)
 * @param {string} datos.sistema_operativo - Sistema operativo (CHAR 55)
 * @param {string} datos.empresa_id - ID de la empresa (CHAR 8)
 * @param {Array} datos.dispositivos - Dispositivos biométricos a registrar
 * @returns {Promise<Object>} - Solicitud creada
 */
export const crearSolicitudAfiliacion = async (datos) => {
  try {
    console.log("📝 Creando solicitud de afiliación:", datos);

    const token = generarToken();

    // Formatear dispositivos para el campo dispositivos_temp
    const dispositivosTemp = datos.dispositivos?.map(d => ({
      nombre: d.name?.substring(0, 55) || "",
      tipo: d.type || "facial",
      ip: d.ip?.substring(0, 12) || "",
      puerto: d.port?.substring(0, 55) || ""
    })) || [];

    const solicitud = {
      tipo: "escritorio",
      nombre: datos.nombre?.substring(0, 55) || "",
      descripcion: datos.descripcion || "",
      correo: datos.correo?.substring(0, 55) || null,
      ip: datos.ip?.substring(0, 12) || "",
      mac: datos.mac?.substring(0, 12) || "",
      sistema_operativo: datos.sistema_operativo?.substring(0, 55) || "",
      token: token,
      empresa_id: datos.empresa_id?.substring(0, 8) || "",
      dispositivos_temp: dispositivosTemp,
    };

    const response = await fetch(`${API_URL}/solicitudes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(solicitud),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al crear la solicitud");
    }

    const resultado = await response.json();
    console.log("✅ Solicitud creada exitosamente:", resultado);
    console.log("📦 Estructura resultado.data:", resultado.data);
    console.log("📦 Todos los campos de data:", JSON.stringify(resultado.data, null, 2));

    // El backend devuelve { success, message, data: { id, token, ... } }
    const solicitudData = resultado.data || resultado;
    const solicitudId = solicitudData.id || solicitudData.solicitud_id || solicitudData.insertId;
    // Usar el token que devuelve el backend (convertir a string por si es número)
    const tokenBackend = solicitudData.token?.toString() || solicitudData.verification_token?.toString() || solicitudData.codigo?.toString();
    const tokenFinal = tokenBackend || token;

    console.log("🆔 ID extraído:", solicitudId);
    console.log("🔑 Token del backend:", tokenBackend);
    console.log("🔑 Token final a guardar:", tokenFinal);
    console.log("🔍 Token enviado originalmente:", token);

    // Guardar el ID y token de la solicitud en localStorage
    if (solicitudId) {
      localStorage.setItem("solicitud_id", solicitudId);
      localStorage.setItem("solicitud_token", tokenFinal);
    } else {
      console.error("⚠️ No se pudo obtener el ID de la solicitud");
    }

    return { ...solicitudData, id: solicitudId, token: tokenFinal };
  } catch (error) {
    console.error("❌ Error al crear solicitud:", error);
    throw error;
  }
};

/**
 * Obtener el estado de una solicitud (endpoint público)
 * @param {string} token - Token de verificación (CHAR 6)
 * @returns {Promise<Object>} - Estado de la solicitud
 */
export const obtenerEstadoSolicitud = async (token) => {
  try {
    console.log("🔍 Consultando estado con token:", token);
    const url = `${API_URL}/solicitudes/verificar/${token}`;
    console.log("🔗 URL:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Error al obtener el estado de la solicitud");
    }

    const resultado = await response.json();
    console.log("📋 Respuesta del servidor:", resultado);
    return resultado.data || resultado;
  } catch (error) {
    console.error("❌ Error al obtener estado:", error);
    throw error;
  }
};

/**
 * Verificar si hay una solicitud pendiente guardada
 * @returns {Object|null} - Datos de la solicitud guardada o null
 */
export const obtenerSolicitudGuardada = () => {
  const solicitudId = localStorage.getItem("solicitud_id");
  const token = localStorage.getItem("solicitud_token");

  if (solicitudId && token) {
    return {
      id: solicitudId,
      token: token,
    };
  }

  return null;
};

/**
 * Limpiar la solicitud guardada
 */
export const limpiarSolicitudGuardada = () => {
  localStorage.removeItem("solicitud_id");
  localStorage.removeItem("solicitud_token");
};

/**
 * Cancelar una solicitud pendiente
 * @param {string} solicitudId - ID de la solicitud (CHAR 8)
 */
export const cancelarSolicitud = async (solicitudId) => {
  try {
    const response = await fetch(
      `${API_URL}/solicitudes/${solicitudId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Error al cancelar la solicitud");
    }

    limpiarSolicitudGuardada();
    return true;
  } catch (error) {
    console.error("❌ Error al cancelar solicitud:", error);
    throw error;
  }
};

/**
 * Obtener información del sistema para la solicitud
 * @returns {Promise<Object>} - Información del sistema
 */
export const obtenerInfoSistema = async () => {
  try {
    // Si estamos en Electron, usar la API
    if (window.electronAPI) {
      const systemInfo = await window.electronAPI.getSystemInfo();
      const networkInfo = await window.electronAPI.getNetworkInfo();

      return {
        sistema_operativo: `${systemInfo.platform} ${systemInfo.arch}`,
        mac: networkInfo.mac || "00:00:00:00:00:00",
        ip: networkInfo.ip || "127.0.0.1",
      };
    } else {
      // Si es web, usar valores por defecto
      return {
        sistema_operativo: navigator.platform || "Unknown",
        mac: "00:00:00:00:00:00",
        ip: "127.0.0.1",
      };
    }
  } catch (error) {
    console.error("❌ Error al obtener info del sistema:", error);
    return {
      sistema_operativo: "Unknown",
      mac: "00:00:00:00:00:00",
      ip: "127.0.0.1",
    };
  }
};
