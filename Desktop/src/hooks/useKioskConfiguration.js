import { useState, useEffect } from "react";
import { obtenerOrdenCredenciales } from "../services/configuracionService";

export const useKioskConfiguration = (isLoggedIn) => {
    const [ordenCredenciales, setOrdenCredenciales] = useState(null);
    const [loadingCredenciales, setLoadingCredenciales] = useState(true);

    // Obtener métodos activos ordenados desde backend
    const getActiveMethods = () => {
        if (!ordenCredenciales) return [];
        return Object.entries(ordenCredenciales)
            .filter(([, config]) => config.activo)
            .sort(([, a], [, b]) => a.prioridad - b.prioridad)
            .map(([key]) => key);
    };

    const activeMethods = getActiveMethods();

    // Cargar orden de credenciales desde el backend
    const cargarCredenciales = async () => {
        try {
            setLoadingCredenciales(true);
            const { ordenCredenciales: orden } = await obtenerOrdenCredenciales();
            setOrdenCredenciales(orden);
        } catch (err) {
            console.error("Error al cargar orden de credenciales:", err);
            // Fallback por defecto si falla el backend
            setOrdenCredenciales({
                facial: { prioridad: 1, activo: true },
                dactilar: { prioridad: 2, activo: true },
                pin: { prioridad: 3, activo: true },
            });
        } finally {
            setLoadingCredenciales(false);
        }
    };

    // Cargar al montar el componente
    useEffect(() => {
        cargarCredenciales();
    }, []);

    // Recargar credenciales cuando el usuario cierra o abre sesión
    useEffect(() => {
        if (!isLoggedIn) {
            cargarCredenciales();
        }
    }, [isLoggedIn]);

    return { ordenCredenciales, setOrdenCredenciales, loadingCredenciales, activeMethods, cargarCredenciales };
};
