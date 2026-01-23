import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

/**
 * Registra asistencia de un empleado
 * @param {string} empleadoId - ID del empleado
 * @param {Object} ubicacion - {lat, lng}
 * @param {string} token - Token de autenticación
 * @param {string} departamentoId - ID del departamento (opcional, solo para metadata)
 * @returns {Promise<Object>}
 */
export const registrarAsistencia = async (empleadoId, ubicacion, token, departamentoId = null) => {
    try {
        // Payload con los campos que espera el backend (registrar-facial)
        const payload = {
            id_empleado: empleadoId,
            tipo: 'Movil' // Tipo de dispositivo
        };

        console.log('📤 Enviando asistencia:', payload);

        // Usar registrar-facial ya que no requiere huella dactilar
        const response = await fetch(`${API_URL}/asistencia/registrar-facial`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log('📥 Respuesta del servidor:', responseText);

        if (!response.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch {
                errorData = { message: responseText };
            }

            throw new Error(errorData.message || `Error del servidor (${response.status})`);
        }

        const data = JSON.parse(responseText);
        
        // ✅ Si necesitas el departamento, lo agregamos aquí localmente
        if (departamentoId) {
            data.departamento_id = departamentoId;
        }

        return data;
    } catch (error) {
        console.error('❌ Error registrando asistencia:', error);
        throw error;
    }
};

export const getAsistenciasEmpleado = async (empleadoId, token, filtros = {}) => {
    try {
        const params = new URLSearchParams();
        if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
        if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);

        const url = `${API_URL}/asistencia/empleado/${empleadoId}${params.toString() ? `?${params}` : ''}`;

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
        console.error('❌ Error obteniendo asistencias:', error);
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
        const ultimaAsistencia = data.data.find(a => {
            const fechaRegistro = new Date(a.fecha_registro);
            return fechaRegistro.toDateString() === hoy;
        });

        if (!ultimaAsistencia) return null;

        const fechaRegistro = new Date(ultimaAsistencia.fecha_registro);
        return {
            tipo: ultimaAsistencia.tipo === 'entrada' ? 'Entrada' : 'Salida',
            hora: fechaRegistro.toLocaleTimeString('es-MX', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            estado: ultimaAsistencia.estado,
            esEntrada: ultimaAsistencia.tipo === 'entrada'
        };
    } catch (error) {
        console.error('❌ Error obteniendo último registro:', error);
        return null;
    }
};

export const getAsistenciasHoy = async (token, departamentoId = null) => {
    try {
        const params = departamentoId ? `?departamento_id=${departamentoId}` : '';
        const url = `${API_URL}/asistencia/hoy${params}`;

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
        console.error('❌ Error obteniendo asistencias de hoy:', error);
        throw error;
    }
};

export default {
    registrarAsistencia,
    getAsistenciasEmpleado,
    getUltimoRegistroHoy,
    getAsistenciasHoy
};