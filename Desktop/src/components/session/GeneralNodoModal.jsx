import React, { useState, useEffect } from "react";
import { X, HardDrive, Save, RefreshCw } from "lucide-react";
import { getSystemInfo } from "../../utils/systemInfo";

export default function GeneralNodoModal({ onClose, initialConfig = {} }) {
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
      const systemInfo = await getSystemInfo();
      setNodeConfig(prev => ({
        ...prev,
        ipAddress: systemInfo.ipAddress,
        macAddress: systemInfo.macAddress,
        operatingSystem: systemInfo.operatingSystem,
      }));
    } catch (error) {
      console.error("Error al detectar información del sistema:", error);
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
      <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-bg-primary/20 rounded-xl flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">General del Nodo</h3>
                <p className="text-blue-100 text-sm mt-1">
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
        <div className="p-6">
          <div className="bg-bg-secondary border-2 border-blue-200 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-text-primary flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-600" />
                Información del Nodo
              </h4>
              <button
                type="button"
                onClick={detectSystemInfo}
                disabled={isDetecting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
                {isDetecting ? 'Detectando...' : 'Autodetectar'}
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Nombre del Nodo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nodeConfig.nodeName}
                  onChange={(e) =>
                    setNodeConfig({ ...nodeConfig, nodeName: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-bg-primary border border-border-subtle rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-text-primary placeholder:text-text-disabled"
                  placeholder="Ej: Entrada Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Descripción
                </label>
                <textarea
                  value={nodeConfig.nodeDescription}
                  onChange={(e) =>
                    setNodeConfig({ ...nodeConfig, nodeDescription: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 bg-bg-primary border border-border-subtle rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-text-primary placeholder:text-text-disabled"
                  placeholder="Descripción del nodo de trabajo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Dirección IP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nodeConfig.ipAddress}
                    disabled
                    className="w-full px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-secondary cursor-not-allowed"
                    placeholder="192.168.1.100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Dirección MAC <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nodeConfig.macAddress}
                    disabled
                    className="w-full px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-secondary cursor-not-allowed"
                    placeholder="00:1A:2B:3C:4D:5E"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Sistema Operativo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nodeConfig.operatingSystem}
                  disabled
                  className="w-full px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-secondary cursor-not-allowed"
                  placeholder="Linux Debian 11"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-bg-primary border-2 border-border-subtle text-text-secondary rounded-xl font-bold hover:bg-bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
