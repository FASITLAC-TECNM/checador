// src/services/authService.js
// Servicio de autenticación con API remota

import { getApiEndpoint } from "../config/apiEndPoint";
import { agregarEvento } from "./bitacoraService";

// Usar la configuración centralizada
const API_URL = getApiEndpoint("/api");
console.log("🔗 API URL:", API_URL); // Para debug

/**
 * Autenticar usuario
 * @param {string} username - Nombre de usuario
 * @param {string} pin - PIN del usuario
 * @returns {Promise<Object>} - Usuario autenticado o error
 */
export const loginUsuario = async (username, pin) => {
  try {
    console.log("🔐 Iniciando login para:", username);

    // Obtener todos los usuarios
    const response = await fetch(`${API_URL}/empleados`);

    if (!response.ok) {
      throw new Error("Error al conectar con el servidor");
    }

    const usuarios = await response.json();
    console.log("👥 Usuarios obtenidos:", usuarios.length);

    // Buscar usuario por username
    const usuarioEncontrado = usuarios.find(
      (user) => user.username === username
    );

    if (!usuarioEncontrado) {
      // Registrar intento de login fallido - usuario no encontrado
      const eventoError = agregarEvento({
        user: username,
        action: `Intento de login fallido - Usuario no encontrado`,
        type: "error",
      });
      console.log("❌ Evento de error registrado en bitácora:", eventoError);
      throw new Error("Usuario no encontrado");
    }

    console.log("👤 Usuario encontrado:", usuarioEncontrado);

    // Verificar PIN desde la API de credenciales
    try {
      // Usar el id del empleado (no id_usuario)
      const credencialesResponse = await fetch(
        `${API_URL}/credenciales/empleado/${usuarioEncontrado.id}`
      );

      if (!credencialesResponse.ok) {
        throw new Error("No se pudieron obtener las credenciales");
      }

      const credenciales = await credencialesResponse.json();
      console.log("🔑 Credenciales obtenidas:", {
        id_empleado: credenciales.id_empleado,
        tiene_pin: !!credenciales.pin,
      });

      // Verificar que el PIN exista
      if (!credenciales.pin) {
        throw new Error("Este empleado no tiene PIN configurado");
      }

      // Verificar que el PIN coincida
      const pinIngresado = parseInt(pin);
      const pinRegistrado = parseInt(credenciales.pin);

      console.log(`🔐 Comparando PINs - Ingresado: ${pinIngresado}, Registrado: ${pinRegistrado}`);

      if (pinIngresado !== pinRegistrado) {
        // Registrar intento de login fallido - PIN incorrecto
        const eventoError = agregarEvento({
          user: username,
          action: `Intento de login fallido por PIN - PIN incorrecto`,
          type: "error",
        });
        console.log("❌ Evento de PIN incorrecto registrado en bitácora:", eventoError);
        throw new Error("PIN incorrecto");
      }

      console.log("✅ PIN verificado correctamente");
    } catch (error) {
      console.error("❌ Error al verificar PIN:", error);
      // Si el error no es de PIN incorrecto, registrar el error
      if (!error.message.includes("PIN incorrecto")) {
        agregarEvento({
          user: username,
          action: `Error al verificar credenciales - ${error.message}`,
          type: "error",
        });
      }
      throw new Error(error.message || "Usuario o PIN incorrectos");
    }

    // Obtener datos completos del empleado desde el endpoint específico
    try {
      console.log(`📋 Obteniendo datos completos del empleado ID ${usuarioEncontrado.id}...`);
      const empleadoResponse = await fetch(
        `${API_URL}/empleados/${usuarioEncontrado.id}`
      );

      if (empleadoResponse.ok) {
        const empleadoCompleto = await empleadoResponse.json();
        console.log("✅ Datos completos del empleado obtenidos:", {
          id: empleadoCompleto.id,
          nombre: empleadoCompleto.nombre,
          tiene_rfc: !!empleadoCompleto.rfc,
          tiene_nss: !!empleadoCompleto.nss,
        });

        // Usar los datos completos del empleado
        usuarioEncontrado.rfc = empleadoCompleto.rfc;
        usuarioEncontrado.nss = empleadoCompleto.nss;
        usuarioEncontrado.departamento = empleadoCompleto.departamento;
        usuarioEncontrado.horario_inicio = empleadoCompleto.horario_inicio;
        usuarioEncontrado.horario_fin = empleadoCompleto.horario_fin;
      }
    } catch (error) {
      console.warn("⚠️ No se pudieron obtener datos completos del empleado:", error);
    }

    // Actualizar estado a CONECTADO
    try {
      console.log(
        `🔄 Intentando actualizar estado del usuario ${usuarioEncontrado.id_usuario} a CONECTADO...`
      );
      const usuarioActualizado = await actualizarEstadoUsuario(
        usuarioEncontrado.id_usuario,
        "CONECTADO"
      );
      console.log("✅ Estado actualizado en API:", usuarioActualizado);

      // Usar el usuario actualizado de la respuesta si está disponible
      if (usuarioActualizado && usuarioActualizado.estado) {
        // Combinar datos del empleado con estado actualizado
        return {
          success: true,
          usuario: { ...usuarioEncontrado, estado: "CONECTADO" },
        };
      }

      // Si no viene actualizado, actualizar manualmente
      usuarioEncontrado.estado = "CONECTADO";
    } catch (error) {
      console.error("⚠️ No se pudo actualizar el estado a CONECTADO:", error);
      // Continuar con el login aunque falle la actualización
      usuarioEncontrado.estado = "CONECTADO";
    }

    // Registrar login exitoso en la bitácora ANTES de retornar
    const eventoRegistrado = agregarEvento({
      user: usuarioEncontrado.nombre || username,
      action: `Inicio de sesión exitoso por PIN`,
      type: "success",
    });

    console.log("✅ Evento de login exitoso registrado en bitácora:", eventoRegistrado);

    // Verificar que se guardó correctamente
    const bitacoraActual = localStorage.getItem('eventLog');
    console.log("📋 Bitácora actual en localStorage:", bitacoraActual ? JSON.parse(bitacoraActual).length + " eventos" : "vacía");

    return {
      success: true,
      usuario: usuarioEncontrado,
    };
  } catch (error) {
    console.error("❌ Error en login:", error);
    return {
      success: false,
      error: error.message,
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
 * Guardar sesión en localStorage
 * @param {Object} usuario - Datos del usuario
 */
export const guardarSesion = (usuario) => {
  localStorage.setItem("usuarioActual", JSON.stringify(usuario));
  localStorage.setItem("ultimoLogin", new Date().toISOString());
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
 * Actualizar estado del usuario
 * @param {number} id - ID del usuario
 * @param {string} nuevoEstado - Nuevo estado (CONECTADO/DESCONECTADO)
 * @returns {Promise<Object>}
 */
export const actualizarEstadoUsuario = async (id, nuevoEstado) => {
  try {
    console.log(`🔄 Actualizando estado del usuario ${id} a ${nuevoEstado}...`);

    // 1. Obtener el usuario completo primero
    const usuarioActual = await getUsuarioById(id);
    console.log("📋 Usuario actual obtenido:", usuarioActual);

    // 2. Crear una copia con el estado actualizado
    const usuarioActualizado = {
      ...usuarioActual,
      estado: nuevoEstado,
    };

    // 3. Usar PUT con el objeto completo
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
  }
};

/**
 * Verificar si hay sesión activa
 * @returns {boolean}
 */
export const haySesionActiva = () => {
  return obtenerSesion() !== null;
};
