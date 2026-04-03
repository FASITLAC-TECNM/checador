import { useEffect, useRef } from 'react';
import { API_CONFIG } from '../config/Apiconfig';

const API_URL = API_CONFIG.BASE_URL;

/**
 * Generic hook for global real-time events
 * @param {Object} handlers - Map of event names to callback functions
 * @example
 * useRealTime({
 *   'nueva-asistencia': (data) => refreshDashboard(data),
 *   'empleado-actualizado': (data) => updateList(data)
 * })
 */
export function useRealTime(handlers = {}) {
    const eventSourceRef = useRef(null);
    const handlersRef = useRef(handlers);

    // Actualizar el ref cada vez que los handlers cambien para evitar clausuras obsoletas
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    // Usar una versión serializada de las llaves como dependencia para solo reconectar
    // si el SET de eventos cambia realmente.
    const eventKeys = JSON.stringify(Object.keys(handlers));

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const url = `${API_URL}/api/stream?token=${encodeURIComponent(token)}`;
        const es = new EventSource(url);
        eventSourceRef.current = es;

        // Registrar handlers usando el ref actual para evitar reconexiones innecesarias
        Object.keys(handlers).forEach((event) => {
            es.addEventListener(event, (e) => {
                try {
                    const data = JSON.parse(e.data);
                    // Llamar al handler más reciente desde el ref
                    handlersRef.current[event]?.(data);
                } catch (err) {
                    console.error(`Error parsing SSE event ${event}:`, err);
                }
            });
        });

        es.onerror = () => {
            // EventSource se reconecta automáticamente
            // console.warn('SSE conexión perdida, reconectando...');
        };

        return () => {
            es.close();
            eventSourceRef.current = null;
        };
    }, [eventKeys]); // Re-conectar SOLO si los nombres de los eventos cambian
}
