// src/services/empleadoService.js
// Servicio para obtener datos de empleados

import { API_CONFIG } from "../config/apiEndPoint";

const API_URL = API_CONFIG.BASE_URL;

/**
 * Obtener datos completos de un empleado por su ID de usuario
 * @param {string} usuarioId - ID del usuario
 * @returns {Promise<Object>} - Datos del empleado
 */
export const getEmpleadoByUsuarioId = async (usuarioId) => {
  try {
    console.log(`📋 Buscando empleado para usuario ${usuarioId}...`);
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${API_URL}${API_CONFIG.ENDPOINTS.EMPLEADOS}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error("Error al obtener empleados");
    }

    const empleados = await response.json();
    const empleado = empleados.find((emp) => emp.usuario_id === usuarioId);

    if (empleado) {
      console.log("✅ Empleado encontrado:", empleado);
    }
    return empleado || null;
  } catch (error) {
    console.error("❌ Error al obtener empleado:", error);
    throw error;
  }
};

/**
 * Obtener datos de un empleado por su ID de empleado
 * @param {string} empleadoId - ID del empleado
 * @returns {Promise<Object>} - Datos del empleado
 */
export const getEmpleadoById = async (empleadoId) => {
  try {
    console.log(`📋 Obteniendo datos del empleado ${empleadoId}...`);
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${API_URL}${API_CONFIG.ENDPOINTS.EMPLEADOS}/${empleadoId}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error("Empleado no encontrado");
    }

    const empleado = await response.json();
    console.log("✅ Datos del empleado obtenidos:", empleado);
    return empleado;
  } catch (error) {
    console.error("❌ Error al obtener empleado:", error);
    throw error;
  }
};

/**
 * Obtener el horario asignado a un empleado
 * @param {string} horarioId - ID del horario
 * @returns {Promise<Object>} - Datos del horario
 */
export const getHorarioById = async (horarioId) => {
  try {
    console.log(`⏰ Obteniendo horario ${horarioId}...`);
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${API_URL}${API_CONFIG.ENDPOINTS.HORARIOS}/${horarioId}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error("Horario no encontrado");
    }

    const horario = await response.json();
    console.log("✅ Horario obtenido:", horario);
    return horario;
  } catch (error) {
    console.error("❌ Error al obtener horario:", error);
    throw error;
  }
};

/**
 * Obtener datos completos del empleado incluyendo su horario
 * Puede recibir el ID de usuario o los datos del usuario con empleado_id y horario_id
 * @param {string|Object} usuarioIdOrData - ID del usuario o objeto con datos
 * @returns {Promise<Object>} - Datos completos del empleado con horario
 */
export const getEmpleadoConHorario = async (usuarioIdOrData) => {
  try {
    let empleado = null;
    let horarioId = null;

    // Si es un objeto con empleado_id, usar esos datos directamente
    if (typeof usuarioIdOrData === 'object' && usuarioIdOrData.empleado_id) {
      empleado = {
        id: usuarioIdOrData.empleado_id,
        rfc: usuarioIdOrData.rfc,
        nss: usuarioIdOrData.nss,
        usuario_id: usuarioIdOrData.id,
      };
      horarioId = usuarioIdOrData.horario_id;
    }
    // Si es un ID, buscar el empleado
    else if (typeof usuarioIdOrData === 'string' || typeof usuarioIdOrData === 'number') {
      empleado = await getEmpleadoByUsuarioId(usuarioIdOrData);
      horarioId = empleado?.horario_id;
    }

    if (!empleado) {
      console.warn("⚠️ No se encontró empleado");
      return null;
    }

    // Obtener horario si existe
    let horario = null;
    if (horarioId) {
      try {
        horario = await getHorarioById(horarioId);
      } catch (error) {
        console.warn("⚠️ No se pudo obtener el horario:", error);
      }
    }

    return {
      ...empleado,
      horario,
    };
  } catch (error) {
    console.error("❌ Error al obtener empleado con horario:", error);
    throw error;
  }
};

/**
 * Obtener las asistencias de un empleado
 * @param {string} empleadoId - ID del empleado
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<Array>} - Lista de asistencias
 */
export const getAsistenciasEmpleado = async (empleadoId, options = {}) => {
  try {
    console.log(`📊 Obteniendo asistencias del empleado ${empleadoId}...`);

    let url = `${API_CONFIG.ENDPOINTS.ASISTENCIAS}?empleado_id=${empleadoId}`;

    if (options.fechaInicio) {
      url += `&fecha_inicio=${options.fechaInicio}`;
    }
    if (options.fechaFin) {
      url += `&fecha_fin=${options.fechaFin}`;
    }

    const asistencias = await fetchApi(url);
    console.log("✅ Asistencias obtenidas:", asistencias.length);
    return asistencias;
  } catch (error) {
    console.error("❌ Error al obtener asistencias:", error);
    throw error;
  }
};

/**
 * Obtener las incidencias de un empleado
 * @param {string} empleadoId - ID del empleado
 * @returns {Promise<Array>} - Lista de incidencias
 */
export const getIncidenciasEmpleado = async (empleadoId) => {
  try {
    console.log(`📋 Obteniendo incidencias del empleado ${empleadoId}...`);
    const incidencias = await fetchApi(`${API_CONFIG.ENDPOINTS.INCIDENCIAS}?empleado_id=${empleadoId}`);
    console.log("✅ Incidencias obtenidas:", incidencias.length);
    return incidencias;
  } catch (error) {
    console.error("❌ Error al obtener incidencias:", error);
    throw error;
  }
};

export default {
  getEmpleadoById,
  getHorarioById,
  getEmpleadoConHorario,
  getAsistenciasEmpleado,
  getIncidenciasEmpleado,
};
