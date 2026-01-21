export const API_CONFIG = {
  BASE_URL: "https://9dm7dqf9-3002.usw3.devtunnels.ms",
  ENDPOINTS: {
    MODULOS: "/api/modulos",
    USUARIOS: "/api/usuarios",
    EMPLEADOS: "/api/empleados",
    ROLES: "/api/roles",
    ASISTENCIAS: "/api/asistencias",
    INCIDENCIAS: "/api/incidencias",
    HORARIOS: "/api/horarios",
    TOLERANCIAS: "/api/tolerancias",
    EMPRESAS: "/api/empresas",
    DEPARTAMENTOS: "/api/departamentos",
    CREDENCIALES: "/api/credenciales",
    CONFIGURACION: "/api/configuracion",
    AUTH: "/api/auth",
    ESCRITORIO: "/api/escritorio",
    MOVIL: "/api/movil",
    BIOMETRICO: "/api/biometrico",
    SOLICITUDES: "/api/solicitudes",
    EVENTOS: "/api/eventos",
  },
  TIMEOUT: 30000,
};

export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const getApiEndpoint = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const fetchApi = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  const token = localStorage.getItem("auth_token");

  const defaultOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error en ${endpoint}:`, error);
    throw error;
  }
};

export const postApi = async (endpoint, data, options = {}) => {
  return fetchApi(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
    ...options,
  });
};

export const putApi = async (endpoint, data, options = {}) => {
  return fetchApi(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
    ...options,
  });
};

export const deleteApi = async (endpoint, options = {}) => {
  return fetchApi(endpoint, {
    method: "DELETE",
    ...options,
  });
};

export default API_CONFIG;
