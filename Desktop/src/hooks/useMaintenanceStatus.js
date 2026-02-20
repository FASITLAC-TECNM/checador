import { useState, useEffect } from "react";
import { API_CONFIG } from "../config/apiEndPoint";

export const useMaintenanceStatus = () => {
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [isCheckingMaintenance, setIsCheckingMaintenance] = useState(false);

    useEffect(() => {
        const checkMaintenance = async () => {
            try {
                setIsCheckingMaintenance(true);
                const response = await fetch(`${API_CONFIG.BASE_URL}/api/configuracion/public/status`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.maintenance !== undefined) {
                        setIsMaintenance(data.maintenance);
                    }
                }
            } catch (error) {
                console.warn("No se pudo verificar el estado de mantenimiento:", error);
            } finally {
                setIsCheckingMaintenance(false);
            }
        };

        checkMaintenance();
        const interval = setInterval(checkMaintenance, 60000);

        return () => clearInterval(interval);
    }, []);

    return { isMaintenance, isCheckingMaintenance };
};
