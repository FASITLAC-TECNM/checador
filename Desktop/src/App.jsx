import React, { useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { SoundProvider } from "./context/SoundContext";
import { AuthProvider } from "./context/AuthContext";
import { CameraProvider } from "./context/CameraContext";
import AffiliationRequest from "./pages/AffiliationRequest";
import KioskScreen from "./pages/KioskScreen";
import SessionScreen from "./pages/SessionScreen";
import MaintenanceScreen from "./components/maintenance/MaintenanceScreen";
import NodeDisabledScreen from "./components/maintenance/NodeDisabledScreen";

// Hooks
import { useAppConfiguration } from "./hooks/useAppConfiguration";
import { useMaintenanceStatus } from "./hooks/useMaintenanceStatus";
import { useNodeStatus } from "./hooks/useNodeStatus";

function App() {
  const {
    currentPage,
    setCurrentPage,
    isLoading,
    handleAffiliationComplete,
    handleNewAffiliation: resetConfiguration,
  } = useAppConfiguration();

  const { isMaintenance, isCheckingMaintenance } = useMaintenanceStatus();

  const {
    isNodeDisabled,
    setIsNodeDisabled,
    nodeInfo,
    setNodeInfo,
    isCheckingNode,
    checkNodeStatus
  } = useNodeStatus();

  const handleNewAffiliation = async () => {
    await resetConfiguration();
    setIsNodeDisabled(false);
    setNodeInfo(null);
  };

  // Atajo de teclado para reiniciar afiliación (Ctrl + Shift + A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (window.confirm("¿Estás seguro de que deseas reiniciar el sistema a la pantalla de afiliación?")) {
          handleNewAffiliation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });


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
          onRetry={window.location.reload}
        />
      </ThemeProvider>
    );
  }

  // Si el nodo está deshabilitado, mostrar la pantalla correspondiente
  if (isNodeDisabled && nodeInfo) {
    return (
      <ThemeProvider>
        <NodeDisabledScreen
          nodeName={nodeInfo.nombre}
          isChecking={isCheckingNode}
          onRetry={checkNodeStatus}
          onNewAffiliation={handleNewAffiliation}
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
