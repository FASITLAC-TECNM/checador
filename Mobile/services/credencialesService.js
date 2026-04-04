
import getApiEndpoint from '../config/api.js';
export const getCredencialesByEmpleado = async (empleadoId, token) => {
  try {
    const response = await fetch(
      getApiEndpoint(`/api/credenciales/empleado/${empleadoId}`),
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
      if (response.status === 404 || data.message?.includes('no encontradas')) {
        return {
          success: false,
          message: 'Sin credenciales registradas',
          data: {
            tiene_dactilar: false,
            tiene_facial: false,
            tiene_pin: false
          }
        };
      }
      throw new Error(data.message || 'Error al obtener credenciales');
    }
    return data;
  } catch (error) {
    if (!error.message?.includes('no encontradas')) {
    }
    throw error;
  }
};

export const guardarDactilar = async (empleadoId, dactilarBase64, token) => {
  try {
    const response = await fetch(
      getApiEndpoint('/api/credenciales/dactilar'),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          empleado_id: empleadoId,
          dactilar: dactilarBase64
        })
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error al guardar huella dactilar');
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const guardarFacial = async (empleadoId, facialBase64, token) => {
  try {
    const response = await fetch(
      getApiEndpoint('/api/credenciales/facial'),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          empleado_id: empleadoId,
          facial: facialBase64
        })
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error al guardar reconocimiento facial');
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const guardarPin = async (empleadoId, pin, token) => {
  try {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      throw new Error('El PIN debe ser de exactamente 6 dígitos');
    }
    const response = await fetch(
      getApiEndpoint('/api/credenciales/pin'),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          empleado_id: empleadoId,
          pin: pin
        })
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error al guardar PIN');
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const verificarPin = async (empleadoId, pin, token) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(
      getApiEndpoint('/api/credenciales/verificar-pin'),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          empleado_id: empleadoId,
          pin: pin
        }),
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      throw new Error('Servidor inactivo o respuesta no válida (Server Down)');
    }
    if (!response.ok) {
      throw new Error(data.message || 'Error al verificar PIN');
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const eliminarCredencial = async (empleadoId, tipo, token) => {
  try {
    const response = await fetch(
      getApiEndpoint(`/api/credenciales/empleado/${empleadoId}?tipo=${tipo}`),
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
      throw new Error(data.message || 'Error al eliminar credencial');
    }
    return data;
  } catch (error) {
    throw error;
  }
};