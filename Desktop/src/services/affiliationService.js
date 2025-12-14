// src/services/affiliationService.js
// Servicio para gestionar solicitudes de afiliación de escritorio

import { getApiEndpoint } from "../config/apiEndPoint";

const API_URL = getApiEndpoint("/api");

/**
 * Generar un token único para la solicitud
 */
const generarToken = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Crear una solicitud de afiliación
 * @param {Object} datos - Datos de la solicitud
 * @param {string} datos.nombre - Nombre del equipo
 * @param {string} datos.descripcion - Descripción del equipo
 * @param {string} datos.ip - Dirección IP
 * @param {string} datos.mac - Dirección MAC
 * @param {string} datos.sistema_operativo - Sistema operativo
 * @returns {Promise<Object>} - Solicitud creada
 */
export const crearSolicitudAfiliacion = async (datos) => {
  try {
    console.log("📝 Creando solicitud de afiliación:", datos);

    const solicitud = {
      nombre: datos.nombre,
      descripcion: datos.descripcion || "",
      ip: datos.ip,
      mac: datos.mac,
      sistema_operativo: datos.sistema_operativo || "",
      token_solicitud: generarToken(),
      estado: "Pendiente",
    };

    const response = await fetch(`${API_URL}/solicitudes-escritorio`, {
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

    // Guardar el ID y token de la solicitud en localStorage
    localStorage.setItem("solicitud_id", resultado.id);
    localStorage.setItem("solicitud_token", resultado.token_solicitud);

    return resultado;
  } catch (error) {
    console.error("❌ Error al crear solicitud:", error);
    throw error;
  }
};

/**
 * Obtener el estado de una solicitud
 * @param {number} solicitudId - ID de la solicitud
 * @returns {Promise<Object>} - Estado de la solicitud
 */
export const obtenerEstadoSolicitud = async (solicitudId) => {
  try {
    const response = await fetch(
      `${API_URL}/solicitudes-escritorio/${solicitudId}`
    );

    if (!response.ok) {
      throw new Error("Error al obtener el estado de la solicitud");
    }

    const solicitud = await response.json();
    return solicitud;
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
      id: parseInt(solicitudId),
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
 * @param {number} solicitudId - ID de la solicitud
 */
export const cancelarSolicitud = async (solicitudId) => {
  try {
    const response = await fetch(
      `${API_URL}/solicitudes-escritorio/${solicitudId}`,
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
