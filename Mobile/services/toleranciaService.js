import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');


const DEFAULT_TOLERANCIA = {
  minutos_retardo: 10,
  minutos_falta: 30,
  permite_registro_anticipado: true,
  minutos_anticipado_max: 60,
  aplica_tolerancia_entrada: true,
  aplica_tolerancia_salida: false,

  minutos_retardo_a_max: 20,
  minutos_retardo_b_max: 29,
  equivalencia_retardo_a: 10,
  equivalencia_retardo_b: 5
};






export const getTolerancias = async (token) => {
  try {
    const response = await fetch(`${API_URL}/tolerancias`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};







export const getToleranciaById = async (toleranciaId, token) => {
  try {
    const response = await fetch(`${API_URL}/tolerancias/${toleranciaId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};










export const getToleranciaEmpleado = async (empleadoId, token) => {
  try {
    const response = await fetch(
      `${API_URL}/movil/sync/mis-datos?empleado_id=${empleadoId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      return { success: true, data: DEFAULT_TOLERANCIA };
    }

    const data = await response.json();

    if (!data.success || !data.tolerancia) {
      return { success: true, data: DEFAULT_TOLERANCIA };
    }


    const tolerancia = {
      ...DEFAULT_TOLERANCIA,
      ...data.tolerancia
    };

    return { success: true, data: tolerancia };

  } catch (error) {

    return { success: true, data: DEFAULT_TOLERANCIA };
  }
};










export const getToleranciaEmpleadoPorUsuario = async (usuarioId, token) => {
  try {

    const rolesResponse = await fetch(`${API_URL}/usuarios/${usuarioId}/roles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!rolesResponse.ok) {
      return { success: true, data: DEFAULT_TOLERANCIA };
    }

    const rolesData = await rolesResponse.json();
    const roles = rolesData.data || [];


    const rolConTolerancia = roles.
    filter((r) => r.tolerancia_id).
    sort((a, b) => b.posicion - a.posicion)[0];

    if (!rolConTolerancia) {
      return { success: true, data: DEFAULT_TOLERANCIA };
    }


    const toleranciaData = await getToleranciaById(rolConTolerancia.tolerancia_id, token);


    if (toleranciaData?.data) {
      toleranciaData.data = { ...DEFAULT_TOLERANCIA, ...toleranciaData.data };
    }

    return toleranciaData;

  } catch (error) {
    return { success: true, data: DEFAULT_TOLERANCIA };
  }
};







export const createTolerancia = async (toleranciaData, token) => {
  try {
    const response = await fetch(`${API_URL}/tolerancias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(toleranciaData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};








export const updateTolerancia = async (toleranciaId, toleranciaData, token) => {
  try {
    const response = await fetch(`${API_URL}/tolerancias/${toleranciaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(toleranciaData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};







export const deleteTolerancia = async (toleranciaId, token) => {
  try {
    const response = await fetch(`${API_URL}/tolerancias/${toleranciaId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

export default {
  getTolerancias,
  getToleranciaById,
  getToleranciaEmpleado,
  getToleranciaEmpleadoPorUsuario,
  createTolerancia,
  updateTolerancia,
  deleteTolerancia,
  DEFAULT_TOLERANCIA
};