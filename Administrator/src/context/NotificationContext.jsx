import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSolicitudesSSE } from '../hooks/useSolicitudesSSE';
import { API_CONFIG } from '../config/Apiconfig';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const API_URL = API_CONFIG.BASE_URL;

    // Función para cargar notificaciones iniciales (solicitudes pendientes)
    const fetchNotifications = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            // Obtenemos solicitudes pendientes de ambos tipos
            // Nota: Asumimos que el backend puede filtrar por estado 'pendiente' si no se envía tipo,
            // o hacemos dos llamadas. Por seguridad y consistencia con Dispositivos.jsx, haremos dos llamadas.

            const headers = { 'Authorization': `Bearer ${token}` };

            const [resMovil, resEscritorio] = await Promise.all([
                fetch(`${API_URL}/api/solicitudes?tipo=movil&estado=pendiente`, { headers }),
                fetch(`${API_URL}/api/solicitudes?tipo=escritorio&estado=pendiente`, { headers })
            ]);

            const dataMovil = await resMovil.json();
            const dataEscritorio = await resEscritorio.json();

            let allSolicitudes = [];
            if (dataMovil.success) allSolicitudes = [...allSolicitudes, ...dataMovil.data];
            if (dataEscritorio.success) allSolicitudes = [...allSolicitudes, ...dataEscritorio.data];

            // Filtramos solo pendientes por si acaso el backend no filtra bien
            const pendientes = allSolicitudes.filter(s => s.estado === 'pendiente');

            // Ordenamos por fecha más reciente
            pendientes.sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro));

            setNotifications(pendientes);
            setUnreadCount(pendientes.length);
            setError(null);

        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError('Error al cargar notificaciones');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [API_URL]);

    // Cargar al inicio
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Escuchar eventos SSE
    useSolicitudesSSE({
        onNuevaSolicitud: (data) => {
            // Añadir nueva solicitud a la lista
            // Podríamos hacer fetch completo para estar seguros, o añadirla manualmente
            // Hacemos fetch para garantizar consistencia
            fetchNotifications(true);

            // Aquí podríamos disparar un Toast si quisiéramos
            // toast.info(`Nueva solicitud de ${data.nombre}`);
        },
        onSolicitudActualizada: (data) => {
            // Si una solicitud cambia de estado (se acepta/rechaza), refrescamos
            fetchNotifications(true);
        }
    });

    const value = {
        notifications,
        unreadCount,
        loading,
        error,
        refreshNotifications: () => fetchNotifications(true)
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
