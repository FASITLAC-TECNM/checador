// src/services/biometricAuthService.js
// Servicio de autenticación biométrica (huella dactilar)

import { getApiEndpoint } from "../config/apiEndPoint";

const API_URL = getApiEndpoint("/api");
console.log("🔗 Biometric API URL:", API_URL);

/**
 * Identificar usuario por huella dactilar
 * Compara el template de huella contra todos los registrados
 * @param {string} templateBase64 - Template de huella en Base64
 * @returns {Promise<Object>} - Usuario identificado o error
 */
export const identificarPorHuella = async (templateBase64) => {
  try {
    console.log("🔍 Iniciando identificación biométrica...");

    // Llamar al endpoint de identificación 1:N
    const response = await fetch(`${API_URL}/biometric/identify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_base64: templateBase64,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    console.log("📨 Respuesta del backend:", result);

    // Si no se verificó la huella
    if (!result.verified) {
      return {
        success: false,
        error: "Huella no reconocida en el sistema",
      };
    }

    // Obtener datos completos del empleado
    const empleadoResponse = await fetch(
      `${API_URL}/empleados/${result.id_empleado}`
    );

    if (!empleadoResponse.ok) {
      throw new Error("Error al obtener datos del empleado");
    }

    const empleado = await empleadoResponse.json();
    console.log("👤 Empleado identificado:", empleado);

    // Actualizar estado a CONECTADO
    try {
      await actualizarEstadoUsuario(empleado.id_usuario, "CONECTADO");
      empleado.estado = "CONECTADO";
    } catch (error) {
      console.error("⚠️ No se pudo actualizar el estado:", error);
    }

    return {
      success: true,
      usuario: empleado,
      matchScore: result.matchScore,
    };
  } catch (error) {
    console.error("❌ Error en identificación biométrica:", error);
    return {
      success: false,
      error: error.message || "Error al identificar huella",
    };
  }
};

/**
 * Verificar huella de un empleado específico
 * @param {number} idEmpleado - ID del empleado
 * @param {string} templateBase64 - Template de huella en Base64
 * @returns {Promise<Object>} - Resultado de la verificación
 */
export const verificarHuellaEmpleado = async (idEmpleado, templateBase64) => {
  try {
    console.log(`🔐 Verificando huella del empleado ${idEmpleado}...`);

    const response = await fetch(`${API_URL}/biometric/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_empleado: idEmpleado,
        template_base64: templateBase64,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Resultado de verificación:", result);

    if (!result.verified) {
      return {
        success: false,
        error: "La huella no coincide",
      };
    }

    // Obtener datos del empleado
    const empleadoResponse = await fetch(`${API_URL}/empleados/${idEmpleado}`);

    if (!empleadoResponse.ok) {
      throw new Error("Error al obtener datos del empleado");
    }

    const empleado = await empleadoResponse.json();

    // Actualizar estado a CONECTADO
    try {
      await actualizarEstadoUsuario(empleado.id_usuario, "CONECTADO");
      empleado.estado = "CONECTADO";
    } catch (error) {
      console.error("⚠️ No se pudo actualizar el estado:", error);
    }

    return {
      success: true,
      usuario: empleado,
    };
  } catch (error) {
    console.error("❌ Error verificando huella:", error);
    return {
      success: false,
      error: error.message || "Error al verificar huella",
    };
  }
};

/**
 * Registrar huella para un empleado
 * @param {number} idEmpleado - ID del empleado
 * @param {string} templateBase64 - Template de huella en Base64
 * @param {string} userId - User ID del middleware
 * @returns {Promise<Object>} - Resultado del registro
 */
export const registrarHuella = async (idEmpleado, templateBase64, userId) => {
  try {
    console.log(`💾 Registrando huella para empleado ${idEmpleado}...`);

    const response = await fetch(`${API_URL}/biometric/enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_empleado: idEmpleado,
        template_base64: templateBase64,
        userId: userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Huella registrada exitosamente");

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error("❌ Error registrando huella:", error);
    return {
      success: false,
      error: error.message || "Error al registrar huella",
    };
  }
};

/**
 * Obtener usuario por ID
 * @param {number} id - ID del usuario
 * @returns {Promise<Object>} - Usuario encontrado
 */
export const getUsuarioById = async (id) => {
  try {
    const response = await fetch(`${API_URL}/usuarios/${id}`);

    if (!response.ok) {
      throw new Error("Usuario no encontrado");
    }

    return await response.json();
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    throw error;
  }
};

/**
 * Actualizar estado del usuario
 * @param {number} id - ID del usuario
 * @param {string} nuevoEstado - Nuevo estado (CONECTADO/DESCONECTADO)
 * @returns {Promise<Object>}
 */
export const actualizarEstadoUsuario = async (id, nuevoEstado) => {
  try {
    console.log(`🔄 Actualizando estado del usuario ${id} a ${nuevoEstado}...`);

    // Obtener el usuario completo primero
    const usuarioActual = await getUsuarioById(id);
    console.log("📋 Usuario actual obtenido:", usuarioActual);

    // Crear una copia con el estado actualizado
    const usuarioActualizado = {
      ...usuarioActual,
      estado: nuevoEstado,
    };

    // Usar PUT con el objeto completo
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(usuarioActualizado),
    });

    console.log("📡 Respuesta del servidor:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error en respuesta:", errorText);
      throw new Error(`Error al actualizar estado: ${response.status}`);
    }

    const resultado = await response.json();
    console.log("✅ Estado actualizado exitosamente:", resultado);
    return resultado;
  } catch (error) {
    console.error("❌ Error al actualizar estado:", error);
    throw error;
  }
};

/**
 * Guardar sesión en localStorage
 * @param {Object} usuario - Datos del usuario
 */
export const guardarSesion = (usuario) => {
  localStorage.setItem("usuarioActual", JSON.stringify(usuario));
  localStorage.setItem("ultimoLogin", new Date().toISOString());
  localStorage.setItem("metodoAutenticacion", "HUELLA");
};

/**
 * Obtener sesión actual
 * @returns {Object|null} - Usuario actual o null
 */
export const obtenerSesion = () => {
  const usuario = localStorage.getItem("usuarioActual");
  return usuario ? JSON.parse(usuario) : null;
};

/**
 * Cerrar sesión y actualizar estado
 * @param {number} userId - ID del usuario
 */
export const cerrarSesion = async (userId) => {
  try {
    // Actualizar estado a DESCONECTADO antes de cerrar sesión
    if (userId) {
      await actualizarEstadoUsuario(userId, "DESCONECTADO");
    }
  } catch (error) {
    console.error("Error al actualizar estado al cerrar sesión:", error);
  } finally {
    localStorage.removeItem("usuarioActual");
    localStorage.removeItem("ultimoLogin");
    localStorage.removeItem("metodoAutenticacion");
  }
};

/**
 * Verificar si hay sesión activa
 * @returns {boolean}
 */
export const haySesionActiva = () => {
  return obtenerSesion() !== null;
};
