// src/services/authService.js
// Servicio de autenticación con API remota

const API_URL = "https://9dm7dqf9-3001.usw3.devtunnels.ms/api";

/**
 * Autenticar usuario
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña (email del usuario)
 * @returns {Promise<Object>} - Usuario autenticado o error
 */
export const loginUsuario = async (username, password) => {
  try {
    console.log("🔐 Iniciando login para:", username);

    // Obtener todos los usuarios
    const response = await fetch(`${API_URL}/usuarios`);

    if (!response.ok) {
      throw new Error("Error al conectar con el servidor");
    }

    const usuarios = await response.json();
    console.log("👥 Usuarios obtenidos:", usuarios.length);

    // Buscar usuario que coincida con username y email
    const usuarioEncontrado = usuarios.find(
      (user) => user.username === username && user.email === password
    );

    if (!usuarioEncontrado) {
      throw new Error("Usuario o contraseña incorrectos");
    }

    console.log("✅ Usuario encontrado:", usuarioEncontrado);

    // Verificar que el usuario esté activo
    if (usuarioEncontrado.activo !== "ACTIVO") {
      throw new Error("Usuario inactivo. Contacte al administrador");
    }

    // Actualizar estado a CONECTADO
    try {
      console.log(
        `🔄 Intentando actualizar estado del usuario ${usuarioEncontrado.id} a CONECTADO...`
      );
      const usuarioActualizado = await actualizarEstadoUsuario(
        usuarioEncontrado.id,
        "CONECTADO"
      );
      console.log("✅ Estado actualizado en API:", usuarioActualizado);

      // Usar el usuario actualizado de la respuesta si está disponible
      if (usuarioActualizado && usuarioActualizado.estado) {
        return {
          success: true,
          usuario: usuarioActualizado,
        };
      }

      // Si no viene actualizado, actualizar manualmente
      usuarioEncontrado.estado = "CONECTADO";
    } catch (error) {
      console.error("⚠️ No se pudo actualizar el estado a CONECTADO:", error);
      // Continuar con el login aunque falle la actualización
      usuarioEncontrado.estado = "CONECTADO";
    }

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
      method: "PUT", // ⚠️ Cambiar de PATCH a PUT
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(usuarioActualizado), // ⚠️ Enviar el objeto completo
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
