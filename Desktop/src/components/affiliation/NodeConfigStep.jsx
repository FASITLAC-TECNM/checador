import { useEffect, useState } from "react";
import { HardDrive, Info, RefreshCw } from "lucide-react";
import StepIndicator from "./StepIndicator";
import { getSystemInfo } from "../../utils/systemInfo";

export default function NodeConfigStep({
  nodeConfig,
  setNodeConfig,
  onNext,
  onShowWelcome,
}) {
  const [isDetecting, setIsDetecting] = useState(false);

  // Detectar información del sistema al cargar el componente
  useEffect(() => {
    detectSystemInfo();
  }, []);

  const detectSystemInfo = async () => {
    setIsDetecting(true);
    try {
      const systemInfo = await getSystemInfo();
      console.log("Información del sistema detectada:", systemInfo);
      setNodeConfig({
        ...nodeConfig,
        ipAddress: systemInfo.ipAddress,
        macAddress: systemInfo.macAddress,
        operatingSystem: systemInfo.operatingSystem,
      });
    } catch (error) {
      console.error("Error al detectar información del sistema:", error);
    } finally {
      setIsDetecting(false);
    }
  };

  // Validar que los campos requeridos estén completos
  const isFormValid = () => {
    return (
      nodeConfig.nodeName.trim() !== "" &&
      nodeConfig.description.trim() !== "" &&
      nodeConfig.ipAddress &&
      nodeConfig.macAddress &&
      nodeConfig.operatingSystem
    );
  };

  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
      {/* Barra de progreso fija */}
      <div className="bg-bg-secondary border-b border-border-subtle py-4 px-8 flex-shrink-0">
        <StepIndicator currentStep={1} totalSteps={4} />
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={onShowWelcome}
            className="absolute top-20 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-10"
            title="Ver información de bienvenida"
          >
            <Info className="w-6 h-6" />
          </button>
          <div className="mb-4">
            <h1 className="text-xl font-bold text-text-primary mb-1">
              Paso 1: Configurar Nodo
            </h1>
            <p className="text-text-secondary text-sm">
              Complete la información del nodo de control de acceso
            </p>
          </div>

          <div className="space-y-3">
            <div className="bg-bg-secondary border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <HardDrive className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-text-primary mb-2">
                    Información del Nodo
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Nombre del Nodo *
                      </label>
                      <input
                        type="text"
                        value={nodeConfig.nodeName}
                        onChange={(e) =>
                          setNodeConfig({
                            ...nodeConfig,
                            nodeName: e.target.value,
                          })
                        }
                        placeholder="ej. Edificio M"
                        className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Descripción *
                      </label>
                      <textarea
                        value={nodeConfig.description}
                        onChange={(e) =>
                          setNodeConfig({
                            ...nodeConfig,
                            description: e.target.value,
                          })
                        }
                        placeholder="Describa la ubicación o función de este nodo"
                        rows="1"
                        className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-text-secondary">
                          Información del Sistema
                        </label>
                        <button
                          type="button"
                          onClick={detectSystemInfo}
                          disabled={isDetecting}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${isDetecting ? "animate-spin" : ""}`}
                          />
                          {isDetecting ? "Detectando..." : "Redetectar"}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Dirección IP *
                          </label>
                          <input
                            type="text"
                            value={nodeConfig.ipAddress || ""}
                            disabled
                            placeholder="192.168.1.100"
                            className="w-full px-2 py-1.5 bg-bg-secondary border border-border-subtle rounded-lg font-mono text-xs text-text-secondary cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Dirección MAC *
                          </label>
                          <input
                            type="text"
                            value={nodeConfig.macAddress}
                            disabled
                            placeholder="00:1A:2B:3C:4D:5E"
                            className="w-full px-2 py-1.5 bg-bg-secondary border border-border-subtle rounded-lg font-mono text-xs text-text-secondary cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Sistema Operativo *
                          </label>
                          <input
                            type="text"
                            value={nodeConfig.operatingSystem}
                            disabled
                            placeholder="Windows 10/11"
                            className="w-full px-2 py-1.5 bg-bg-secondary border border-border-subtle rounded-lg text-xs text-text-secondary cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-bg-secondary border border-amber-200 rounded-lg p-2 flex items-start gap-2">
              <svg
                className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-xs text-text-secondary">
                Todos los campos marcados con * son obligatorios. La información
                debe ser exacta para el correcto funcionamiento del sistema.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer fijo con botón */}
      <div className="bg-bg-secondary border-t border-border-subtle px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex justify-end">
          <button
            onClick={onNext}
            disabled={!isFormValid()}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2 ${
              isFormValid()
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-md cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Siguiente
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
