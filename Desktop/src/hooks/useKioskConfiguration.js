import { useState, useEffect } from "react";
import { obtenerConfiguracionEscritorio } from "../services/configuracionEscritorioService";
import { obtenerEscritorioIdGuardado } from "../services/escritorioService";

export const useKioskConfiguration = (isLoggedIn) => {
    // Mantendremos la estructura original de 'ordenCredenciales' por compatibilidad con el resto del código
    const [ordenCredenciales, setOrdenCredenciales] = useState(null);
    const [loadingCredenciales, setLoadingCredenciales] = useState(true);

    // Obtener métodos activos (sin importar su orden por ahora, ya que el nuevo API no maneja orden)
    const getActiveMethods = () => {
        if (!ordenCredenciales) return [];
        return Object.entries(ordenCredenciales)
            .filter(([, config]) => config.activo)
            .map(([key]) => key);
    };

    const activeMethods = getActiveMethods();

    // Cargar credenciales desde el backend
    const cargarCredenciales = async (silent = false) => {
        try {
            if (!silent) setLoadingCredenciales(true);
            const escritorioId = obtenerEscritorioIdGuardado();
            if (!escritorioId) throw new Error("No hay ID de escritorio");

            const configuracion = await obtenerConfiguracionEscritorio(escritorioId);

            let metodos = configuracion.metodos_autenticacion;
            if (typeof metodos === 'string') {
                metodos = JSON.parse(metodos);
            }

            let prioridad = configuracion.prioridad_biometrico;
            if (typeof prioridad === 'string') {
                prioridad = JSON.parse(prioridad);
            }

            // Mapeo de backend a frontend
            const keyMap = { huella: 'dactilar', rostro: 'facial', codigo: 'pin' };
            const orden = {};

            if (Array.isArray(prioridad) && prioridad.length > 0) {
                // Ordenar por nivel
                prioridad.sort((a, b) => a.nivel - b.nivel);

                prioridad.forEach(item => {
                    const frontKey = keyMap[item.metodo];
                    if (frontKey) {
                        orden[frontKey] = { activo: item.activo };
                    }
                });
            } else {
                // Fallback a metodos_autenticacion si prioridad no existe
                orden.facial = { activo: metodos?.rostro ?? true };
                orden.dactilar = { activo: metodos?.huella ?? true };
                orden.pin = { activo: metodos?.codigo ?? true };
            }

            setOrdenCredenciales(orden);
        } catch (err) {
            console.error("Error al cargar orden de credenciales:", err);
            // Fallback por defecto si falla el backend o no está autenticado
            if (!silent) {
                setOrdenCredenciales({
                    facial: { activo: true },
                    dactilar: { activo: true },
                    pin: { activo: true },
                });
            }
        } finally {
            if (!silent) setLoadingCredenciales(false);
        }
    };

    // Cargar al montar el componente y establecer polling
    useEffect(() => {
        cargarCredenciales();

        const handleConfigUpdate = () => {
            console.log("Evento 'configuracion-actualizada' detectado, recargando...");
            cargarCredenciales(true);
        };

        window.addEventListener('configuracion-actualizada', handleConfigUpdate);

        // Polling silencioso cada 15 segundos
        const timer = setInterval(() => {
            console.log("Polling configuración de escritorio...");
            cargarCredenciales(true);
        }, 15000);

        return () => {
            clearInterval(timer);
            window.removeEventListener('configuracion-actualizada', handleConfigUpdate);
        };
    }, []);

    // Recargar credenciales cuando el usuario cierra o abre sesión
    useEffect(() => {
        if (!isLoggedIn) {
            cargarCredenciales();
        }
    }, [isLoggedIn]);

    return { ordenCredenciales, setOrdenCredenciales, loadingCredenciales, activeMethods, cargarCredenciales };
};
