import { getApiEndpoint } from '../config/api.js';
export * as empleadoService from './empleadoServices.js';
export * as authService from './authService.js';

const API_URL = getApiEndpoint('/api');

export const getUsuarios = async (token) => {
  try {
    const response = await fetch(`${API_URL}/usuarios`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Error al obtener usuarios');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const getUsuario = async (id, token) => {
  try {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Error al obtener usuario');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const crearUsuario = async (usuario, token) => {
  try {

    const usuarioDB = {
      username: usuario.username,
      email: usuario.email,
      password: usuario.password || '1234',
      nombre: usuario.nombre,
      telefono: usuario.telefono || '',
      foto: usuario.foto || null,
      activo: usuario.activo || 'ACTIVO',
      estado: usuario.estado || 'DESCONECTADO'
    };

    const response = await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(usuarioDB)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear usuario');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const actualizarUsuario = async (id, usuario, token) => {
  try {
    const usuarioDB = {
      username: usuario.username,
      email: usuario.email,
      nombre: usuario.nombre,
      telefono: usuario.telefono || '',
      foto: usuario.foto || null,
      activo: usuario.activo,
      estado: usuario.estado
    };

    if (usuario.password && usuario.password.trim() !== '') {
      usuarioDB.password = usuario.password;
    }

    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(usuarioDB)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar usuario');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const eliminarUsuario = async (id, token) => {
  try {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Error al eliminar usuario');
    return await response.json();
  } catch (error) {
    throw error;
  }
};