// services/api.js
// Servicios de API para gestión de usuarios - VERSIÓN SIMPLIFICADA
import { getApiEndpoint } from "../config/api";

// Usar la configuración centralizada
const API_URL = getApiEndpoint("/api");
console.log("🔗 API URL:", API_URL); // Para debug

/**
 * Obtener todos los usuarios
 */
export const getUsuarios = async () => {
  try {
    const response = await fetch(`${API_URL}/usuarios`);
    if (!response.ok) throw new Error("Error al obtener usuarios");
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Obtener un usuario por ID
 */
export const getUsuario = async (id) => {
  try {
    const response = await fetch(`${API_URL}/usuarios/${id}`);
    if (!response.ok) throw new Error("Error al obtener usuario");
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Crear un nuevo usuario
 */
export const createUsuario = async (usuario) => {
  try {
    const response = await fetch(`${API_URL}/usuarios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(usuario),
    });
    if (!response.ok) throw new Error("Error al crear usuario");
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Actualizar un usuario
 */
export const updateUsuario = async (id, usuario) => {
  try {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(usuario),
    });
    if (!response.ok) throw new Error("Error al actualizar usuario");
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Eliminar un usuario
 */
export const deleteUsuario = async (id) => {
  try {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Error al eliminar usuario");
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
