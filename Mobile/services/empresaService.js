// services/empresaService.js
import getApiEndpoint from '../config/api.js';

/**
 * Servicio para gestionar empresas
 */

// Obtener todas las empresas
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

// Obtener una empresa por ID
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

// Crear una nueva empresa
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

// Actualizar una empresa
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

// Desactivar una empresa
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