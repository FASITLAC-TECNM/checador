// src/services/configuracionService.js
// Servicio para gestionar la configuración de la empresa (orden de credenciales, etc.)

import { API_CONFIG, getApiEndpoint } from "../config/apiEndPoint";

const EMPRESAS_ENDPOINT = API_CONFIG.ENDPOINTS.EMPRESAS;
const CONFIGURACION_ENDPOINT = API_CONFIG.ENDPOINTS.CONFIGURACION;

const getAuthToken = () => localStorage.getItem("auth_token");

// Orden por defecto si no hay datos en el backend
const ORDEN_CREDENCIALES_DEFAULT = {
  pin: { prioridad: 1, activo: true },
  facial: { prioridad: 2, activo: true },
  dactilar: { prioridad: 3, activo: true },
};

/**
 * Obtener la configuración de la empresa activa (incluyendo orden_credenciales)
 * @returns {Promise<{ configuracionId: string, ordenCredenciales: Object }>}
 */
export const obtenerOrdenCredenciales = async () => {
  const token = getAuthToken();
  if (!token) throw new Error("No hay sesión activa");

  // 1. Obtener la empresa activa
  const urlEmpresa = getApiEndpoint(`${EMPRESAS_ENDPOINT}?es_activo=true`);
  const resEmpresa = await fetch(urlEmpresa, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resEmpresa.ok) throw new Error("Error al obtener empresa");
  const dataEmpresa = await resEmpresa.json();

  if (!dataEmpresa.success || !dataEmpresa.data?.length) {
    throw new Error("No se encontró una empresa activa");
  }

  const empresa = dataEmpresa.data[0];
  if (!empresa.configuracion_id) {
    throw new Error("La empresa no tiene configuración asignada");
  }

  // 2. Obtener la configuración usando configuracion_id
  const urlConfig = getApiEndpoint(
    `${CONFIGURACION_ENDPOINT}/${empresa.configuracion_id}`
  );
  const resConfig = await fetch(urlConfig, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resConfig.ok) throw new Error("Error al obtener configuración");
  const dataConfig = await resConfig.json();

  if (!dataConfig.success) {
    throw new Error("Respuesta inválida de configuración");
  }

  const cfg = dataConfig.data;
  let ordenCredenciales = { ...ORDEN_CREDENCIALES_DEFAULT };

  if (cfg.orden_credenciales) {
    try {
      const parsed =
        typeof cfg.orden_credenciales === "string"
          ? JSON.parse(cfg.orden_credenciales)
          : cfg.orden_credenciales;

      if (Array.isArray(parsed)) {
        // Formato antiguo (array de strings) → convertir a objeto
        ordenCredenciales = {};
        parsed.forEach((metodo, index) => {
          ordenCredenciales[metodo] = { prioridad: index + 1, activo: true };
        });
      } else {
        ordenCredenciales = parsed;
      }
    } catch (e) {
      console.error("Error parseando orden_credenciales:", e);
    }
  }

  return {
    configuracionId: empresa.configuracion_id,
    ordenCredenciales,
  };
};

/**
 * Guardar el orden de credenciales en el backend
 * @param {string} configuracionId - ID de la configuración
 * @param {Object} ordenCredenciales - Objeto con los métodos y su prioridad/activo
 * @returns {Promise<Object>}
 */
export const guardarOrdenCredenciales = async (
  configuracionId,
  ordenCredenciales
) => {
  const token = getAuthToken();
  if (!token) throw new Error("No hay sesión activa");

  const url = getApiEndpoint(`${CONFIGURACION_ENDPOINT}/${configuracionId}`);
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orden_credenciales: ordenCredenciales }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error HTTP ${response.status}`);
  }

  const resultado = await response.json();
  if (!resultado.success) {
    throw new Error(resultado.message || "Error al guardar configuración");
  }

  return resultado.data || resultado;
};
