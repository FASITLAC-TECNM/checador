import React, { useState, useEffect } from "react";
import { X, HardDrive, Save, RefreshCw } from "lucide-react";
import { getSystemInfoAdvanced, isElectron } from "../../utils/systemInfoAdvanced";

export default function GeneralNodoModal({ onClose, onBack, initialConfig = {} }) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [nodeConfig, setNodeConfig] = useState({
    nodeName: initialConfig.nodeName || "Entrada Principal",
    nodeDescription: initialConfig.nodeDescription || "Control de acceso principal del edificio A",
    ipAddress: initialConfig.ipAddress || "192.168.1.100",
    macAddress: initialConfig.macAddress || "00:1A:2B:3C:4D:5E",
    operatingSystem: initialConfig.operatingSystem || "Linux Debian 11",
  });

  // Detectar información del sistema al cargar el componente si no hay configuración inicial
  useEffect(() => {
    if (!initialConfig.ipAddress && !initialConfig.macAddress && !initialConfig.operatingSystem) {
      detectSystemInfo();
    }
  }, []);

  const detectSystemInfo = async () => {
    setIsDetecting(true);
    try {
      // Usar el sistema avanzado de detección
      const systemInfo = await getSystemInfoAdvanced();

      setNodeConfig(prev => ({
        ...prev,
        ipAddress: systemInfo.ipAddress || prev.ipAddress,
        macAddress: systemInfo.macAddress || prev.macAddress,
        operatingSystem: systemInfo.operatingSystem || prev.operatingSystem,
      }));

      console.log('✅ Información del sistema detectada:', {
        IP: systemInfo.ipAddress,
        MAC: systemInfo.macAddress,
        OS: systemInfo.operatingSystem,
        'IP Pública': systemInfo.publicIP,
        'Entorno': systemInfo.isElectron ? 'Electron' : 'Web',
        'Núcleos': systemInfo.cores,
        'RAM': systemInfo.memory,
      });
    } catch (error) {
      console.error("Error al detectar información del sistema:", error);
      alert("Error al detectar la información del sistema. Por favor, intenta de nuevo.");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSave = () => {
    console.log("Configuración del nodo guardada:", nodeConfig);
    alert("Configuración guardada exitosamente");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-bg-primary/20 rounded-xl flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">General del Nodo</h3>
                <p className="text-blue-100 text-xs">
                  Configuración general del sistema y nodo de trabajo
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-bg-primary/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3">
          <div className="bg-bg-secondary border-2 border-blue-200 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                <HardDrive className="w-4 h-4 text-blue-600" />
                Información del Nodo
              </h4>
              <button
                type="button"
                onClick={detectSystemInfo}
                disabled={isDetecting}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin' : ''}`} />
                {isDetecting ? 'Detectando...' : 'Autodetectar'}
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Nombre del Nodo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nodeConfig.nodeName}
                  onChange={(e) =>
                    setNodeConfig({ ...nodeConfig, nodeName: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm bg-bg-primary border border-border-subtle rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-text-primary placeholder:text-text-disabled"
                  placeholder="Ej: Entrada Principal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={nodeConfig.nodeDescription}
                  onChange={(e) =>
                    setNodeConfig({ ...nodeConfig, nodeDescription: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm bg-bg-primary border border-border-subtle rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-text-primary placeholder:text-text-disabled"
                  placeholder="Descripción del nodo de trabajo"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Dirección IP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nodeConfig.ipAddress}
                    disabled
                    className="w-full px-3 py-1.5 text-sm bg-bg-secondary border border-border-subtle rounded-lg text-text-secondary cursor-not-allowed"
                    placeholder="192.168.1.100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Dirección MAC <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nodeConfig.macAddress}
                    disabled
                    className="w-full px-3 py-1.5 text-sm bg-bg-secondary border border-border-subtle rounded-lg text-text-secondary cursor-not-allowed"
                    placeholder="00:1A:2B:3C:4D:5E"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Sistema Operativo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nodeConfig.operatingSystem}
                  disabled
                  className="w-full px-3 py-1.5 text-sm bg-bg-secondary border border-border-subtle rounded-lg text-text-secondary cursor-not-allowed"
                  placeholder="Linux Debian 11"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 mt-3">
            <button
              onClick={onBack || onClose}
              className="flex-1 px-4 py-2 text-sm bg-bg-primary border-2 border-border-subtle text-text-secondary rounded-2xl font-semibold hover:bg-bg-secondary transition-colors"
            >
              {onBack ? "Volver" : "Cancelar"}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
