import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getApiEndpoint } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [empleado, setEmpleado] = useState(null);
    const [rol, setRol] = useState(null);
    const [permisos, setPermisos] = useState([]);
    const [departamento, setDepartamento] = useState(null);
    const [loading, setLoading] = useState(true);
    const pingIntervalRef = useRef(null);

    // Verificar si hay una sesión guardada al cargar
    useEffect(() => {
        const verificarSesion = async () => {
            const usuarioGuardado = localStorage.getItem('usuario');
            if (usuarioGuardado) {
                try {
                    const usuarioData = JSON.parse(usuarioGuardado);
                    // Verificar con el backend que la sesión sigue válida
                    const response = await fetch(
                        getApiEndpoint(`/api/session/check?userId=${usuarioData.id_usuario || usuarioData.id}`)
                    );

                    if (response.ok) {
                        const data = await response.json();
                        setUsuario(data.usuario);
                        setEmpleado(data.empleado);
                        setRol(data.rol);
                        setPermisos(data.permisos || []);
                        setDepartamento(data.departamento);
                    } else {
                        // Sesión inválida, limpiar
                        localStorage.removeItem('usuario');
                        localStorage.removeItem('empleado');
                        localStorage.removeItem('rol');
                        localStorage.removeItem('permisos');
                        localStorage.removeItem('departamento');
                        setUsuario(null);
                        setEmpleado(null);
                        setRol(null);
                        setPermisos([]);
                        setDepartamento(null);
                    }
                } catch (error) {
                    console.error('Error verificando sesión:', error);
                    localStorage.removeItem('usuario');
                    localStorage.removeItem('empleado');
                    localStorage.removeItem('rol');
                    localStorage.removeItem('permisos');
                    localStorage.removeItem('departamento');
                    setUsuario(null);
                    setEmpleado(null);
                    setRol(null);
                    setPermisos([]);
                    setDepartamento(null);
                }
            }
            setLoading(false);
        };

        verificarSesion();
    }, []);

    // Enviar ping cada 30 segundos cuando hay un usuario autenticado
    useEffect(() => {
        if (usuario) {
            // Iniciar el intervalo de ping
            pingIntervalRef.current = setInterval(() => {
                fetch(getApiEndpoint('/api/usuarios/ping'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: usuario.id_usuario || usuario.id })
                }).catch(error => {
                    console.error('Error en ping:', error);
                });
            }, 30000); // cada 30 segundos

            return () => {
                // Limpiar el intervalo cuando el usuario cierra sesión
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }
            };
        }
    }, [usuario]);

    // Detectar cierre de pestaña o navegador
    useEffect(() => {
        const handleBeforeUnload = async (e) => {
            if (usuario) {
                // Usar sendBeacon para asegurar que la petición se envíe antes de cerrar
                const data = JSON.stringify({ userId: usuario.id_usuario || usuario.id });
                const blob = new Blob([data], { type: 'application/json' });
                navigator.sendBeacon(getApiEndpoint('/api/session/close'), blob);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [usuario]);

    const login = async (username, password) => {
        try {
            const response = await fetch(getApiEndpoint('/api/session/validate'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Guardar toda la información del usuario
                setUsuario(data.usuario);
                setEmpleado(data.empleado);
                setRol(data.rol);
                setPermisos(data.permisos || []);
                setDepartamento(data.departamento);

                // Guardar en localStorage
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                localStorage.setItem('empleado', JSON.stringify(data.empleado));
                localStorage.setItem('rol', JSON.stringify(data.rol));
                localStorage.setItem('permisos', JSON.stringify(data.permisos || []));
                localStorage.setItem('departamento', JSON.stringify(data.departamento));

                return { success: true, mensaje: data.message };
            } else {
                return { success: false, mensaje: data.error || 'Error al iniciar sesión' };
            }
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, mensaje: 'Error de conexión con el servidor' };
        }
    };

    const logout = async () => {
        try {
            if (usuario) {
                await fetch(getApiEndpoint('/api/session/close'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId: usuario.id_usuario || usuario.id }),
                });
            }
        } catch (error) {
            console.error('Error en logout:', error);
        } finally {
            setUsuario(null);
            setEmpleado(null);
            setRol(null);
            setPermisos([]);
            setDepartamento(null);
            localStorage.removeItem('usuario');
            localStorage.removeItem('empleado');
            localStorage.removeItem('rol');
            localStorage.removeItem('permisos');
            localStorage.removeItem('departamento');
        }
    };

    const value = {
        usuario,
        empleado,
        rol,
        permisos,
        departamento,
        login,
        logout,
        loading,
        isAuthenticated: !!usuario,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
};
