import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRealTime } from '../hooks/useRealTime';
import { API_CONFIG } from '../config/Apiconfig';
import { useAuth } from './AuthContext';

const CompanyContext = createContext();

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
};

export const CompanyProvider = ({ children }) => {
    const [empresa, setEmpresa] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth(); // Importamos el auth context

    const API_URL = API_CONFIG.BASE_URL;

    const fetchEmpresa = async () => {
        try {
            setLoading(true);

            // Usar el token directamente desde localStorage (no depender del objeto user)
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setEmpresa(null);
                return;
            }

            // Si es el Dueño del Sistema, usamos el ID 'MASTER' para cargar su perfil
            if (user?.esPropietarioSaaS || token.startsWith('saas_')) {
                // No retornamos aquí, dejamos que siga para que el fetch intente cargar 'MASTER'
                // pero nos aseguramos que si falla, tenga un default
            }

            const response = await fetch(`${API_URL}/api/empresas/mi-empresa`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setEmpresa(result.success ? result.data : null);
            } else {
                setEmpresa(null);
            }
        } catch (err) {
            console.error('Error al cargar empresa:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // Cargar empresa al montar y cuando cambie el usuario
    useEffect(() => {
        fetchEmpresa();
    }, [user]);  // Se re-ejecuta cuando el objeto user cambia (ej. al loguear)

    // Escuchar cambios en tiempo real
    useRealTime({
        'empresa-actualizada': (data) => {
            if (data && data.es_activo) {
                setEmpresa(prev => ({ ...prev, ...data }));
            } else if (data && !data.es_activo) {
                // Si la empresa activa se desactiva, podríamos querer recargar
                fetchEmpresa();
            }
        }
    });

    return (
        <CompanyContext.Provider value={{ empresa, loading, error, refreshCompany: fetchEmpresa }}>
            {children}
        </CompanyContext.Provider>
    );
};
