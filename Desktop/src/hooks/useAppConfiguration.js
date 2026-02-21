import { useState, useEffect } from "react";
import storage from "../utils/storage";
import { deviceMonitorService } from "../services/deviceMonitorService";

export const useAppConfiguration = () => {
    const [currentPage, setCurrentPage] = useState("loading");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkConfiguration = async () => {
            try {
                const isConfigured = await storage.getItem("appConfigured");
                setCurrentPage(isConfigured ? "kiosk" : "affiliation");

                // Iniciar monitoreo de dispositivos si ya está configurado
                if (isConfigured) {
                    deviceMonitorService.startMonitoring(60000); // Chequear cada minuto
                }
            } catch (error) {
                console.error("Error verificando configuración:", error);
                // En caso de error, asumir que no está configurado
                setCurrentPage("affiliation");
            } finally {
                setIsLoading(false);
            }
        };

        checkConfiguration();

        // Limpieza al desmontar
        return () => {
            deviceMonitorService.stopMonitoring();
        };
    }, []);

    const handleAffiliationComplete = async () => {
        await storage.setItem("appConfigured", "true");
        setCurrentPage("kiosk");
    };

    const handleNewAffiliation = async () => {
        // Limpiar todo el estado de configuración (usando storage para Electron)
        await storage.removeItem("appConfigured");
        await storage.removeItem("escritorio_id");
        await storage.removeItem("auth_token");
        await storage.removeItem("solicitud_id");
        await storage.removeItem("solicitud_token");
        setCurrentPage("affiliation");
    };

    return {
        currentPage,
        setCurrentPage,
        isLoading,
        handleAffiliationComplete,
        handleNewAffiliation,
    };
};
