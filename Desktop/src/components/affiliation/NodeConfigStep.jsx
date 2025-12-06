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
      console.log('Información del sistema detectada:', systemInfo);
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

  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
      {/* Barra de progreso fija */}
      <div className="bg-bg-secondary border-b border-border-subtle py-4 px-8">
        <StepIndicator currentStep={1} totalSteps={4} />
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          <button
            onClick={onShowWelcome}
            className="absolute top-20 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-10"
            title="Ver información de bienvenida"
          >
            <Info className="w-6 h-6" />
          </button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Paso 1: Configurar Nodo
          </h1>
          <p className="text-text-secondary text-sm">
            Complete la información del nodo de control de acceso
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-bg-secondary border-2 border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <HardDrive className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-text-primary mb-3">
                  Información del Nodo
                </h3>
                <div className="space-y-4">
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
                      placeholder="ej. Entrada Principal"
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
                      rows="2"
                      className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-text-secondary">
                        Información del Sistema
                      </label>
                      <button
                        type="button"
                        onClick={detectSystemInfo}
                        disabled={isDetecting}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`w-3 h-3 ${isDetecting ? 'animate-spin' : ''}`} />
                        {isDetecting ? 'Detectando...' : 'Redetectar'}
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Dirección IP *
                        </label>
                        <input
                          type="text"
                          value={nodeConfig.ipAddress || ''}
                          disabled
                          placeholder="192.168.1.100"
                          className="w-full px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg font-mono text-sm text-text-secondary cursor-not-allowed"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Dirección MAC *
                          </label>
                          <input
                            type="text"
                            value={nodeConfig.macAddress}
                            disabled
                            placeholder="00:1A:2B:3C:4D:5E"
                            className="w-full px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg font-mono text-sm text-text-secondary cursor-not-allowed"
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
                            placeholder="ej. Linux Debian 11"
                            className="w-full px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-secondary cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-bg-secondary border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <svg
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
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
            <p className="text-sm text-text-secondary">
              Todos los campos marcados con * son obligatorios. La información
              debe ser exacta para el correcto funcionamiento del sistema.
            </p>
          </div>
        </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onNext}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
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
    </div>
  );
}
