import React, { useState } from "react";
import { X, HardDrive, Save } from "lucide-react";

export default function GeneralNodoModal({ onClose, initialConfig = {} }) {
  const [nodeConfig, setNodeConfig] = useState({
    nodeName: initialConfig.nodeName || "Entrada Principal",
    nodeDescription: initialConfig.nodeDescription || "Control de acceso principal del edificio A",
    ipAddress: initialConfig.ipAddress || "192.168.1.100",
    macAddress: initialConfig.macAddress || "00:1A:2B:3C:4D:5E",
    operatingSystem: initialConfig.operatingSystem || "Linux Debian 11",
  });

  const handleSave = () => {
    console.log("Configuración del nodo guardada:", nodeConfig);
    alert("Configuración guardada exitosamente");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
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
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-600" />
              Información del Nodo
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Nodo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nodeConfig.nodeName}
                  onChange={(e) =>
                    setNodeConfig({ ...nodeConfig, nodeName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Entrada Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={nodeConfig.nodeDescription}
                  onChange={(e) =>
                    setNodeConfig({ ...nodeConfig, nodeDescription: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Descripción del nodo de trabajo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección IP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nodeConfig.ipAddress}
                    onChange={(e) =>
                      setNodeConfig({ ...nodeConfig, ipAddress: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="192.168.1.100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección MAC <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nodeConfig.macAddress}
                    onChange={(e) =>
                      setNodeConfig({ ...nodeConfig, macAddress: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00:1A:2B:3C:4D:5E"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sistema Operativo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nodeConfig.operatingSystem}
                  onChange={(e) =>
                    setNodeConfig({ ...nodeConfig, operatingSystem: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Linux Debian 11"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
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
