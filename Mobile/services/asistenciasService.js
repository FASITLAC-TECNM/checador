import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

/**
 * Registrar asistencia en el backend.
 * @param {string} empleadoId
 * @param {{ lat: number, lng: number }} ubicacion
 * @param {string} token
 * @param {string|null} departamentoId
 * @param {string|null} tipo - 'entrada' | 'salida' | null (el backend infiere si no se envía)
 */
export const registrarAsistencia = async (empleadoId, ubicacion, token, departamentoId = null, tipo = null) => {
    try {
        const payload = {
            empleado_id: empleadoId,
            dispositivo_origen: 'movil',
            ubicacion: [ubicacion.lat, ubicacion.lng],
            departamento_id: departamentoId,
            // Enviar tipo solo si el caller lo conoce — el backend lo prioriza sobre inferencia
            ...(tipo ? { tipo } : {})
        };

        const response = await fetch(`${API_URL}/asistencias/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch {
                errorData = { message: responseText };
            }

            // Propagar el flag bloque_completado para que el caller pueda manejarlo
            const err = new Error(errorData.message || `Error del servidor (${response.status})`);
            err.bloque_completado = errorData.bloque_completado || false;
            err.es_festivo = errorData.es_festivo || false;
            throw err;
        }

        const data = JSON.parse(responseText);
        return data;
    } catch (error) {
        throw error;
    }
};

export const getAsistenciasEmpleado = async (empleadoId, token, filtros = {}) => {
    try {
        const params = new URLSearchParams();
        if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
        if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);

        const url = `${API_URL}/asistencias/empleado/${empleadoId}${params.toString() ? `?${params}` : ''}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
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

export const getUltimoRegistroHoy = async (empleadoId, token) => {
    try {
        const data = await getAsistenciasEmpleado(empleadoId, token);

        if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
            return null;
        }

        const hoy = new Date().toDateString();
        const registrosHoy = data.data.filter(a => {
            const fechaRegistro = new Date(a.fecha_registro);
            return fechaRegistro.toDateString() === hoy;
        });

        if (!registrosHoy.length) return null;

        const ultimaAsistencia = registrosHoy[0];
        const fechaRegistro = new Date(ultimaAsistencia.fecha_registro);

        return {
            tipo: ultimaAsistencia.tipo,
            hora: fechaRegistro.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            estado: ultimaAsistencia.estado,
            esEntrada: ultimaAsistencia.tipo === 'entrada',
            totalRegistrosHoy: registrosHoy.length
        };
    } catch (error) {
        return null;
    }
};

export const getAsistencias = async (token, filtros = {}) => {
    try {
        const params = new URLSearchParams();
        if (filtros.empleado_id) params.append('empleado_id', filtros.empleado_id);
        if (filtros.departamento_id) params.append('departamento_id', filtros.departamento_id);
        if (filtros.estado) params.append('estado', filtros.estado);
        if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
        if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
        if (filtros.limit) params.append('limit', filtros.limit);
        if (filtros.offset) params.append('offset', filtros.offset);

        const url = `${API_URL}/asistencias${params.toString() ? `?${params}` : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
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

export const getAsistenciasHoy = async (token, departamentoId = null) => {
    try {
        const params = departamentoId ? `?departamento_id=${departamentoId}` : '';
        const url = `${API_URL}/asistencias/hoy${params}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
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

export default {
    registrarAsistencia,
    getAsistencias,
    getAsistenciasEmpleado,
    getUltimoRegistroHoy,
    getAsistenciasHoy
};