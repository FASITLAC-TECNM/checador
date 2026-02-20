import { useState, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { SoundProvider } from "./context/SoundContext";
import { AuthProvider } from "./context/AuthContext";
import { CameraProvider } from "./context/CameraContext";
import AffiliationRequest from "./pages/AffiliationRequest";
import KioskScreen from "./pages/KioskScreen";
import SessionScreen from "./pages/SessionScreen";
import MaintenanceScreen from "./components/maintenance/MaintenanceScreen";
import storage from "./utils/storage";

import { deviceMonitorService } from "./services/deviceMonitorService";
import { API_CONFIG } from "./config/apiEndPoint";

function App() {
  // Estado de la página actual
  const [currentPage, setCurrentPage] = useState("loading");
  const [isLoading, setIsLoading] = useState(true);

  // Verificar si es la primera vez que se abre la aplicación
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

  // Cuando se complete la afiliación, marcar la app como configurada
  const handleAffiliationComplete = async () => {
    await storage.setItem("appConfigured", "true");
    setCurrentPage("kiosk");
  };

  // Estado para Mantenimiento
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isCheckingMaintenance, setIsCheckingMaintenance] = useState(false);

  // Verificar estado de mantenimiento periódicamente
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        setIsCheckingMaintenance(true);
        // Usar API_CONFIG para consistencia
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

    // Verificar inmediatamente al cargar
    checkMaintenance();

    // Luego verificar cada 60 segundos
    const interval = setInterval(checkMaintenance, 60000);

    return () => clearInterval(interval);
  }, []);

  // Mostrar pantalla de carga mientras se verifica la configuración inicial
  if (isLoading) {
    return (
      <ThemeProvider>
        <div className="App h-screen w-screen flex items-center justify-center bg-bg-primary">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-text-secondary">Cargando...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Si está en mantenimiento, mostrar la pantalla de mantenimiento por encima de todo
  if (isMaintenance) {
    return (
      <ThemeProvider>
        <MaintenanceScreen
          isChecking={isCheckingMaintenance}
          onRetry={() => {
            // Fuerza una recarga completa para asegurar que todo el estado se limpie
            window.location.reload();
          }}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SoundProvider>
        <AuthProvider>
          <CameraProvider>
            <div className="App">
              {currentPage === "affiliation" && (
                <AffiliationRequest onComplete={handleAffiliationComplete} />
              )}
              {currentPage === "kiosk" && <KioskScreen />}
              {currentPage === "session" && (
                <SessionScreen onLogout={() => setCurrentPage("kiosk")} />
              )}
            </div>
          </CameraProvider>
        </AuthProvider>
      </SoundProvider>
    </ThemeProvider>
  );
}

export default App;
