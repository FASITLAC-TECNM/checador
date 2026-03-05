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
    const cargarCredenciales = async () => {
        try {
            setLoadingCredenciales(true);
            const escritorioId = obtenerEscritorioIdGuardado();
            if (!escritorioId) throw new Error("No hay ID de escritorio");

            const configuracion = await obtenerConfiguracionEscritorio(escritorioId);

            let metodos = configuracion.metodos_autenticacion;
            if (typeof metodos === 'string') {
                metodos = JSON.parse(metodos);
            }

            // Mapear de la respuesta del nuevo backend {huella: true, rostro: true, codigo: true}
            // A la estructura antigua {dactilar: {activo: true}, facial: {activo: true}, pin: {activo: true}}
            const orden = {
                facial: { activo: metodos?.rostro ?? true },
                dactilar: { activo: metodos?.huella ?? true },
                pin: { activo: metodos?.codigo ?? true },
            };

            setOrdenCredenciales(orden);
        } catch (err) {
            console.error("Error al cargar orden de credenciales:", err);
            // Fallback por defecto si falla el backend o no está autenticado
            setOrdenCredenciales({
                facial: { activo: true },
                dactilar: { activo: true },
                pin: { activo: true },
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
