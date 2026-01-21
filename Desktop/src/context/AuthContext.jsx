import { createContext, useContext, useState, useEffect } from 'react';

const API_URL = 'https://9dm7dqf9-3002.usw3.devtunnels.ms';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const userData = localStorage.getItem('user_data');

            if (token && userData) {
                setUser(JSON.parse(userData));
            }
        } catch (error) {
            console.error('Error al verificar autenticacion:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (usuario, contrasena) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ usuario, contraseña: contrasena }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al iniciar sesion');
            }

            if (!data.success) {
                throw new Error(data.message || 'Credenciales invalidas');
            }

            localStorage.setItem('auth_token', data.data.token);
            localStorage.setItem('user_data', JSON.stringify(data.data));

            setUser(data.data);
            return { success: true };
        } catch (error) {
            console.error('Error en login:', error);
            setError(error.message);
            return {
                success: false,
                message: error.message,
            };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
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
            console.error('Error al cerrar sesion:', error);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            setUser(null);
            setError(null);
        }
    };

    const hasPermission = (permiso) => {
        if (!user) return false;
        if (user.esAdmin) return true;
        return true;
    };

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
