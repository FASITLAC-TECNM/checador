import { createContext, useContext, useState, useEffect } from 'react';
import { API_CONFIG } from '../config/apiEndPoint';
import { loginUsuario } from '../services/authService';
import { getEmpleadoConHorario } from '../services/empleadoService';

const API_URL = API_CONFIG.BASE_URL;

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

    // Login por PIN (para empleados)
    const loginByPin = async (username, pin) => {
        try {
            setLoading(true);
            setError(null);

            const result = await loginUsuario(username, pin);

            if (!result.success) {
                throw new Error(result.error || 'Error al iniciar sesión');
            }

            const usuario = result.usuario;

            // Obtener datos completos del empleado con horario (si es empleado)
            let empleadoCompleto = usuario;
            try {
                if (usuario.es_empleado && usuario.empleado_id) {
                    // Pasar el objeto completo para que use empleado_id y horario_id
                    const datosCompletos = await getEmpleadoConHorario(usuario);
                    if (datosCompletos) {
                        empleadoCompleto = { ...usuario, ...datosCompletos };
                    }
                }
            } catch (err) {
                console.warn('⚠️ No se pudieron obtener datos completos del empleado:', err);
            }

            localStorage.setItem('user_data', JSON.stringify(empleadoCompleto));

            setUser(empleadoCompleto);
            return { success: true, usuario: empleadoCompleto };
        } catch (error) {
            console.error('Error en loginByPin:', error);
            setError(error.message);
            return {
                success: false,
                message: error.message,
            };
        } finally {
            setLoading(false);
        }
    };

    // Actualizar datos del empleado en el contexto
    const updateEmpleadoData = async (empleadoId) => {
        try {
            const datosCompletos = await getEmpleadoConHorario(empleadoId);
            const updatedUser = { ...user, ...datosCompletos };
            setUser(updatedUser);
            localStorage.setItem('user_data', JSON.stringify(updatedUser));
            return updatedUser;
        } catch (error) {
            console.error('Error actualizando datos del empleado:', error);
            throw error;
        }
    };

    // Login por huella dactilar (para empleados)
    const loginByFingerprint = async (empleadoData) => {
        try {
            setLoading(true);
            setError(null);

            // empleadoData viene del BiometricReader con los datos del empleado
            const usuario = {
                ...empleadoData,
                metodoAutenticacion: 'HUELLA',
            };

            // Obtener datos completos del empleado con horario
            let empleadoCompleto = usuario;
            try {
                if (usuario.empleado_id || usuario.id) {
                    const datosCompletos = await getEmpleadoConHorario(usuario.empleado_id || usuario.id);
                    if (datosCompletos) {
                        empleadoCompleto = { ...usuario, ...datosCompletos };
                    }
                }
            } catch (err) {
                console.warn('⚠️ No se pudieron obtener datos completos del empleado:', err);
            }

            // Guardar en localStorage (sin token ya que es autenticación biométrica)
            localStorage.setItem('user_data', JSON.stringify(empleadoCompleto));

            setUser(empleadoCompleto);
            return { success: true, usuario: empleadoCompleto };
        } catch (error) {
            console.error('Error en loginByFingerprint:', error);
            setError(error.message);
            return {
                success: false,
                message: error.message,
            };
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        loading,
        error,
        login,
        loginByPin,
        loginByFingerprint,
        logout,
        isAuthenticated: !!user,
        hasPermission,
        isAdmin,
        checkAuth,
        updateEmpleadoData,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
