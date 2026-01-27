import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

export const registrarAsistencia = async (empleadoId, ubicacion, token, departamentoId = null) => {
    try {
        const payload = {
            empleado_id: empleadoId,
            dispositivo_origen: 'movil',
            ubicacion: [ubicacion.lat, ubicacion.lng]
        };

        console.log('📤 Servicio - Enviando asistencia:', payload);
        console.log('📍 Servicio - URL:', `${API_URL}/asistencias/registrar`);
        console.log('🔑 Servicio - Token:', token ? 'Presente ✅' : 'Ausente ❌');

        const response = await fetch(`${API_URL}/asistencias/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        console.log('📊 Servicio - Status:', response.status);

        const responseText = await response.text();
        console.log('📥 Servicio - Respuesta:', responseText);

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
        console.log('✅ Servicio - Datos parseados:', data);
        
        if (departamentoId) {
            data.departamento_id = departamentoId;
        }

        return data;
    } catch (error) {
        console.error('❌ Servicio - Error:', error);
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
        return null;
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
    getAsistenciasEmpleado,
    getUltimoRegistroHoy,
    getAsistenciasHoy
};