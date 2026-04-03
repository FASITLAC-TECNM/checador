import { createContext, useContext, useState, useEffect } from 'react';

import { API_CONFIG } from '../config/Apiconfig';
import { useRealTime } from '../hooks/useRealTime';
const API_URL = API_CONFIG.BASE_URL;

// Crear el contexto
const AuthContext = createContext(null);

/**
 * Hook para usar el contexto de autenticación
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
};

/**
 * Provider del contexto de autenticación
 * Maneja el estado global del usuario autenticado
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Verificar sesión al cargar la app
    useEffect(() => {
        checkAuth();
    }, []);

    // Escuchar cambios en el usuario en tiempo real
    useRealTime({
        'usuario-actualizado': (data) => {
            if (user && user.usuario && (data.id === user.usuario.id || data.id === user.id)) {
                // Actualizar estado local
                const updatedUser = {
                    ...user,
                    usuario: {
                        ...user.usuario,
                        ...data
                    }
                };
                setUser(updatedUser);

                // Actualizar localStorage para persistencia
                localStorage.setItem('user_data', JSON.stringify(updatedUser));
            }
        }
    });

    /**
     * Verificar si hay una sesión activa
     */
    /**
     * Verificar si hay una sesión activa y validarla con el servidor
     */
    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const userData = localStorage.getItem('user_data');

            if (token) {
                // Verificar con el servidor si el token es válido y obtener datos frescos
                try {
                    const response = await fetch(`${API_URL}/api/auth/verificar`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            // Actualizar con datos frescos del servidor
                            setUser(data.data);
                            localStorage.setItem('user_data', JSON.stringify(data.data));
                        } else {
                            logout();
                        }
                    } else {
                        // Si falla la verificación (401, 403), cerrar sesión de inmediato
                        if (response.status === 401 || response.status === 403) {
                            logout();
                            return;
                        }
                        // Si es otro error (500), usar datos locales si existen
                        if (userData) {
                            console.warn('Usando datos en caché debido a error del servidor');
                            setUser(JSON.parse(userData));
                        }
                    }
                } catch (networkError) {
                    console.error('Error de red al verificar auth:', networkError);
                    // Fallback a localStorage solo si hay error de red genuino
                    if (userData) {
                        setUser(JSON.parse(userData));
                    } else {
                        logout();
                    }
                }
            }
        } catch (error) {
            console.error('Error al verificar autenticación:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    /**
     * Iniciar sesión
     */
    /**
     * Iniciar sesión
     * @param {string} usuario 
     * @param {string} contraseña 
     * @param {boolean} deferUpdate - Si es true, no actualiza el estado inmediatamente (para animaciones)
     */
    const login = async (usuario, contraseña, deferUpdate = false, empresa_id = null) => {
        try {
            setError(null);

            const endpoint = usuario === 'admin_saas' ? '/api/auth/login-saas' : '/api/auth/login';
            const bodyPayload = { usuario, contraseña };
            if (empresa_id) bodyPayload.empresa_id = empresa_id;

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload),
            });

            const data = await response.json();

            // Multi-tenant: usuario existe en varias empresas → devolver lista
            if (response.status === 300 && data.empresas) {
                return {
                    success: false,
                    multiTenant: true,
                    empresas: data.empresas,
                    message: data.message
                };
            }

            if (!response.ok) {
                throw new Error(data.message || 'Error al iniciar sesión');
            }
            if (!data.success) {
                throw new Error(data.message || 'Credenciales inválidas');
            }

            const finalizeLogin = () => {
                localStorage.setItem('auth_token', data.data.token);
                localStorage.setItem('user_data', JSON.stringify(data.data));
                setUser(data.data);
            };

            if (deferUpdate) {
                return { success: true, confirmLogin: finalizeLogin };
            }

            finalizeLogin();
            return { success: true };
        } catch (error) {
            console.error('Error en login:', error);
            setError(error.message);
            return { success: false, message: error.message };
        }
    };

    /**
     * Cerrar sesión
     */
    const logout = async () => {
        try {
            // Llamar al endpoint de logout (opcional)
            const token = localStorage.getItem('auth_token');
            if (token) {
                await fetch(`${API_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        } finally {
            // Limpiar localStorage y estado
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            setUser(null);
            setError(null);
        }
    };

    /**
     * Verificar si el usuario tiene un permiso específico
     */
    const hasPermission = (permiso) => {
        if (!user) return false;
        if (user.esAdmin) return true;

        // Verificar permisos bitwise (implementar según tu lógica)
        // Por ahora retornamos true si está autenticado
        return true;
    };

    /**
     * Verificar si el usuario es admin
     */
    const isAdmin = () => {
        return user?.esAdmin || false;
    };

    const value = {
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated: !!user,
        hasPermission,
        isAdmin,
        checkAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;