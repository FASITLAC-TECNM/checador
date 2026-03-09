
import getApiEndpoint from '../config/api.js';






export const getEmpresas = async (token, esActivo = null) => {
  try {

    let url = '/api/empresas';

    if (esActivo !== null) {
      url += `?es_activo=${esActivo}`;
    }

    const response = await fetch(
      getApiEndpoint(url),
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener empresas');
    }

    return data;

  } catch (error) {
    throw error;
  }
};


export const getMiEmpresa = async (token) => {
  try {
    const response = await fetch(
      getApiEndpoint('/api/empresas/mi-empresa'),
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener datos de tu empresa');
    }

    return data;

  } catch (error) {
    throw error;
  }
};


export const getEmpresaById = async (empresaId, token) => {
  try {

    const response = await fetch(
      getApiEndpoint(`/api/empresas/${empresaId}`),
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener empresa');
    }

    return data;

  } catch (error) {
    throw error;
  }
};


export const createEmpresa = async (empresaData, token) => {
  try {

    const response = await fetch(
      getApiEndpoint('/api/empresas'),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(empresaData)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al crear empresa');
    }

    return data;

  } catch (error) {
    throw error;
  }
};


export const updateEmpresa = async (empresaId, empresaData, token) => {
  try {

    const response = await fetch(
      getApiEndpoint(`/api/empresas/${empresaId}`),
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(empresaData)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al actualizar empresa');
    }

    return data;

  } catch (error) {
    throw error;
  }
};


export const deleteEmpresa = async (empresaId, token) => {
  try {

    const response = await fetch(
      getApiEndpoint(`/api/empresas/${empresaId}`),
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al desactivar empresa');
    }

    return data;

  } catch (error) {
    throw error;
  }
};


export const getEmpresaPublicaById = async (empresaId) => {
  try {
    const response = await fetch(
      getApiEndpoint(`/api/empresas/public/${empresaId}`),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener información pública de la empresa');
    }

    return data;

  } catch (error) {
    throw error;
  }
};