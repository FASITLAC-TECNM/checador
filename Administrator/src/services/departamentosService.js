// services/departamentosService.js
// Servicio modular para gestión de departamentos

import { getApiEndpoint } from '../config/api';

// Usar la configuración centralizada
const API_URL = getApiEndpoint('/api');

console.log('🔗 Departamentos API URL:', API_URL);

/**
 * Obtener todos los departamentos
 */
export const getDepartamentos = async () => {
    try {
        console.log('📥 Obteniendo departamentos...');
        const response = await fetch(`${API_URL}/departamentos`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error al obtener departamentos');
        }

        const data = await response.json();
        console.log('✅ Departamentos obtenidos:', data.length);
        return data;
    } catch (error) {
        console.error('❌ Error al obtener departamentos:', error);
        throw error;
    }
};

/**
 * Obtener un departamento por ID
 */
export const getDepartamento = async (id) => {
    try {
        console.log(`📥 Obteniendo departamento ID: ${id}`);
        const response = await fetch(`${API_URL}/departamentos/${id}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error al obtener departamento');
        }

        const data = await response.json();
        console.log('✅ Departamento obtenido:', data);
        return data;
    } catch (error) {
        console.error(`❌ Error al obtener departamento ${id}:`, error);
        throw error;
    }
};

/**
 * Crear un nuevo departamento
 */
export const crearDepartamento = async (departamento) => {
    try {
        console.log('📤 Creando departamento:', departamento);

        const response = await fetch(`${API_URL}/departamentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(departamento),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Error del servidor:', errorData);
            throw new Error(errorData.error || 'Error al crear departamento');
        }

        const data = await response.json();
        console.log('✅ Departamento creado exitosamente:', data);
        return data;
    } catch (error) {
        console.error('❌ Error al crear departamento:', error);
        throw error;
    }
};

/**
 * Actualizar un departamento existente
 */
export const actualizarDepartamento = async (id, departamento) => {
    try {
        console.log(`📤 Actualizando departamento ID ${id}:`, departamento);
        console.log('📋 Estructura de jefes:', {
            tipo: typeof departamento.jefes,
            esArray: Array.isArray(departamento.jefes),
            valor: departamento.jefes,
            json: JSON.stringify(departamento.jefes)
        });

        const response = await fetch(`${API_URL}/departamentos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(departamento),
        });

        // Capturar respuesta antes de verificar si es OK
        const responseText = await response.text();
        console.log('📨 Respuesta del servidor (raw):', responseText);

        if (!response.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch {
                errorData = { error: responseText };
            }
            console.error('❌ Error del servidor:', errorData);
            throw new Error(errorData.error || `Error ${response.status}: ${responseText}`);
        }

        const data = JSON.parse(responseText);
        console.log('✅ Departamento actualizado exitosamente:', data);
        return data;
    } catch (error) {
        console.error(`❌ Error al actualizar departamento ${id}:`, error);
        throw error;
    }
};

/**
 * Eliminar un departamento
 */
export const eliminarDepartamento = async (id) => {
    try {
        console.log(`🗑️ Eliminando departamento ID: ${id}`);

        const response = await fetch(`${API_URL}/departamentos/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error al eliminar departamento');
        }

        const data = await response.json();
        console.log('✅ Departamento eliminado exitosamente');
        return data;
    } catch (error) {
        console.error(`❌ Error al eliminar departamento ${id}:`, error);
        throw error;
    }
};

// Exportar todo el servicio como default
export default {
    getDepartamentos,
    getDepartamento,
    crearDepartamento,
    actualizarDepartamento,
    eliminarDepartamento
};