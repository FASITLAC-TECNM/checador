


import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');








export const login = async (usuario, contraseña, empresaId = null) => {
  try {
    if (!usuario || !contraseña) {
      throw new Error('Usuario y contraseña son obligatorios');
    }

    const body = {
      usuario: usuario.trim(),
      contraseña: contraseña
    };

    if (empresaId) {
      body.empresa_id = empresaId;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
      response = await Promise.race([
        fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body),
          signal: controller.signal
        }),
        new Promise((_, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout de 5s')), 5000);
          controller.signal.addEventListener('abort', () => clearTimeout(timeout));
        })
      ]);
    } catch (e) {
      clearTimeout(timeoutId);
      throw new Error(`Error de red o timeout al contactar backend: ${e.message}`);
    }
    clearTimeout(timeoutId);

    const responseText = await response.text();
    let data;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      throw new Error(`Error del servidor: respuesta no válida (${response.status})`);
    }


    if (response.status === 300 && data.empresas) {
      return {
        success: true,
        isMultiCompany: true,
        empresas: data.empresas,
        message: data.message
      };
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `Error del servidor (${response.status})`);
    }

    if (!data.success || !data.data) {
      throw new Error('Respuesta del servidor inválida');
    }



    let empleadoInfo = null;

    if (data.data.usuario.es_empleado && data.data.usuario.empleado_id) {
      try {
        const empleadoId = data.data.usuario.empleado_id;
        const token = data.data.token;


        const empUrl = `${API_URL}/empleados/${empleadoId}`;

        const empResponse = await fetch(empUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });


        if (!empResponse.ok) {
          const errorText = await empResponse.text();
          throw new Error('No se pudo obtener info del empleado');
        }

        const empText = await empResponse.text();
        const empData = JSON.parse(empText);
        empleadoInfo = empData.data || empData;


        if (empleadoInfo.departamentos && empleadoInfo.departamentos.length > 0) {
          const deptoId = empleadoInfo.departamentos[0].id;

          const deptoUrl = `${API_URL}/departamentos/${deptoId}`;

          const deptoResponse = await fetch(deptoUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });


          if (!deptoResponse.ok) {
            const errorText = await deptoResponse.text();
          } else {
            const deptoText = await deptoResponse.text();

            const deptoData = JSON.parse(deptoText);
            const departamentoCompleto = deptoData.data || deptoData;


            empleadoInfo.departamento = departamentoCompleto;
            empleadoInfo.id_departamento = deptoId;
          }
        }

      } catch (empError) {
      }
    }

    return {
      success: true,
      usuario: {
        id: data.data.usuario.id,
        usuario: data.data.usuario.usuario,
        correo: data.data.usuario.correo,
        nombre: data.data.usuario.nombre,
        telefono: data.data.usuario.telefono,
        foto: data.data.usuario.foto,
        es_empleado: data.data.usuario.es_empleado,
        empleado_id: data.data.usuario.empleado_id,
        rfc: data.data.usuario.rfc,
        nss: data.data.usuario.nss
      },
      empleadoInfo: empleadoInfo,
      roles: data.data.roles || [],
      permisos: data.data.permisos || '0',
      esAdmin: data.data.esAdmin || false,
      token: data.data.token || null,
      message: data.message || 'Inicio de sesión exitoso'
    };

  } catch (error) {
    throw error;
  }
};





export const logout = async (token) => {
  try {

    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : {};

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Error al cerrar sesión');
    }

    return data;
  } catch (error) {
    throw error;
  }
};






export const verificarSesion = async (token) => {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/auth/verificar`, {
      method: 'GET',
      headers
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : {};

    if (!response.ok) {
      throw new Error(data.message || 'Sesión no válida');
    }

    return data;
  } catch (error) {
    throw error;
  }
};








export const cambiarPassword = async (contraseñaActual, contraseñaNueva, token) => {
  try {
    if (contraseñaNueva.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    }

    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/auth/cambiar-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contraseña_actual: contraseñaActual,
        contraseña_nueva: contraseñaNueva
      })
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : {};

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Error al cambiar contraseña');
    }

    return data;
  } catch (error) {
    throw error;
  }
};






export const loginBiometrico = async (biometricData) => {
  try {
    const response = await fetch(`${API_URL}/auth/biometric`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(biometricData)
    });

    const responseText = await response.text();
    let data;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      throw new Error(`Error del servidor: respuesta no válida (${response.status})`);
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `Error del servidor (${response.status})`);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export default {
  login,
  logout,
  verificarSesion,
  cambiarPassword,
  loginBiometrico
};