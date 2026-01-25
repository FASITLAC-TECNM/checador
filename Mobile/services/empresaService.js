// services/empresaService.js
import getApiEndpoint from '../config/api.js';

/**
 * Servicio para gestionar empresas
 */

// Obtener todas las empresas
export const getEmpresas = async (token, esActivo = null) => {
    try {
        console.log('[Empresa Service] Obteniendo empresas...');
        
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
            console.error('[Empresa Service] ❌ Error obteniendo empresas:', data.message);
            throw new Error(data.message || 'Error al obtener empresas');
        }

        console.log('[Empresa Service] ✅ Empresas obtenidas exitosamente');
        return data;
        
    } catch (error) {
        console.error('[Empresa Service] ❌ Error al obtener empresas:', error);
        throw error;
    }
};

// Obtener una empresa por ID
export const getEmpresaById = async (empresaId, token) => {
    try {
        console.log('[Empresa Service] Obteniendo empresa:', empresaId);
        
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
            console.error('[Empresa Service] ❌ Error obteniendo empresa:', data.message);
            throw new Error(data.message || 'Error al obtener empresa');
        }

        console.log('[Empresa Service] ✅ Empresa obtenida exitosamente:', data.data?.nombre);
        return data;
        
    } catch (error) {
        console.error('[Empresa Service] ❌ Error al obtener empresa:', error);
        throw error;
    }
};

// Crear una nueva empresa
export const createEmpresa = async (empresaData, token) => {
    try {
        console.log('[Empresa Service] Creando empresa:', empresaData.nombre);
        
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
            console.error('[Empresa Service] ❌ Error creando empresa:', data.message);
            throw new Error(data.message || 'Error al crear empresa');
        }

        console.log('[Empresa Service] ✅ Empresa creada exitosamente');
        return data;
        
    } catch (error) {
        console.error('[Empresa Service] ❌ Error al crear empresa:', error);
        throw error;
    }
};

// Actualizar una empresa
export const updateEmpresa = async (empresaId, empresaData, token) => {
    try {
        console.log('[Empresa Service] Actualizando empresa:', empresaId);
        
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
            console.error('[Empresa Service] ❌ Error actualizando empresa:', data.message);
            throw new Error(data.message || 'Error al actualizar empresa');
        }

        console.log('[Empresa Service] ✅ Empresa actualizada exitosamente');
        return data;
        
    } catch (error) {
        console.error('[Empresa Service] ❌ Error al actualizar empresa:', error);
        throw error;
    }
};

// Desactivar una empresa
export const deleteEmpresa = async (empresaId, token) => {
    try {
        console.log('[Empresa Service] Desactivando empresa:', empresaId);
        
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
            console.error('[Empresa Service] ❌ Error desactivando empresa:', data.message);
            throw new Error(data.message || 'Error al desactivar empresa');
        }

        console.log('[Empresa Service] ✅ Empresa desactivada exitosamente');
        return data;
        
    } catch (error) {
        console.error('[Empresa Service] ❌ Error al desactivar empresa:', error);
        throw error;
    }
};