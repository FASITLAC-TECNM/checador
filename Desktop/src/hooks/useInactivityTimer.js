import { useEffect } from "react";
import { desactivarEscritorio, obtenerEscritorioIdGuardado } from "../services/escritorioService";

export const useInactivityTimer = () => {
    useEffect(() => {
        const handleKeyPress = async (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === "R") {
                e.preventDefault();
                const confirmReset = confirm(
                    "¿Está seguro que desea resetear la configuración de la aplicación? Esto eliminará todos los datos guardados y deberá volver a afiliar el equipo.",
                );
                if (confirmReset) {
                    try {
                        const escritorioId = obtenerEscritorioIdGuardado();
                        if (escritorioId) {
                            await desactivarEscritorio(escritorioId);
                        }
                    } catch (error) {
                        console.error("Error al desactivar el escritorio en el servidor:", error);
                        // Continuar con el reseteo local aunque falle el servidor
                    }

                    localStorage.clear();
                    if (window.electronAPI && window.electronAPI.configRemove) {
                        window.electronAPI.configRemove("appConfigured");
                    }
                    alert("Configuración reseteada. La aplicación se recargará.");
                    window.location.reload();
                }
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, []);
};
