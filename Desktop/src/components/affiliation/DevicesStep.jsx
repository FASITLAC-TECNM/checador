import { useState } from "react";
import { Wifi, Info, Search, Loader2, Usb, CheckCircle2, AlertCircle } from "lucide-react";
import StepIndicator from "./StepIndicator";

export default function DevicesStep({
  devices,
  setDevices,
  onNext,
  onPrevious,
  onShowWelcome,
}) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState(null);

  const addDevice = () => {
    setDevices([
      ...devices,
      {
        id: devices.length + 1,
        name: "",
        type: "camera",
        ip: "",
        port: "",
        connection: "USB",
      },
    ]);
  };

  const detectUSBDevices = async () => {
    setIsDetecting(true);
    setDetectionStatus(null);

    try {
      // Verificar si estamos en Electron
      if (!window.electronAPI || !window.electronAPI.detectUSBDevices) {
        setDetectionStatus({
          type: 'warning',
          message: 'La detección automática solo está disponible en la aplicación de escritorio'
        });
        setIsDetecting(false);
        return;
      }

      const result = await window.electronAPI.detectUSBDevices();

      if (result.success && result.devices.length > 0) {
        // Filtrar dispositivos que ya existen (por nombre)
        const existingNames = devices.map(d => d.name.toLowerCase());
        const newDevices = result.devices.filter(
          d => !existingNames.includes(d.name.toLowerCase())
        );

        if (newDevices.length > 0) {
          // Asignar IDs únicos a los nuevos dispositivos
          const devicesWithIds = newDevices.map((d, index) => ({
            ...d,
            id: devices.length + index + 1,
          }));

          setDevices([...devices, ...devicesWithIds]);
          setDetectionStatus({
            type: 'success',
            message: `Se detectaron ${newDevices.length} dispositivo(s) nuevo(s)`
          });
        } else {
          setDetectionStatus({
            type: 'info',
            message: 'No se encontraron dispositivos nuevos. Los detectados ya están en la lista.'
          });
        }
      } else if (result.success && result.devices.length === 0) {
        setDetectionStatus({
          type: 'info',
          message: 'No se detectaron lectores biométricos o cámaras USB conectados'
        });
      } else {
        setDetectionStatus({
          type: 'error',
          message: result.error || 'Error al detectar dispositivos'
        });
      }
    } catch (error) {
      console.error('Error detectando dispositivos:', error);
      setDetectionStatus({
        type: 'error',
        message: 'Error al detectar dispositivos: ' + error.message
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const updateDevice = (id, field, value) => {
    setDevices(
      devices.map((dev) => (dev.id === id ? { ...dev, [field]: value } : dev))
    );
  };

  const removeDevice = (id) => {
    setDevices(devices.filter((dev) => dev.id !== id));
  };

  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
      {/* Barra de progreso fija */}
      <div className="bg-bg-secondary border-b border-border-subtle py-4 px-8">
        <StepIndicator currentStep={2} totalSteps={4} />
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          <button
            onClick={onShowWelcome}
            className="absolute top-20 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-10"
            title="Ver información de bienvenida"
          >
            <Info className="w-6 h-6" />
          </button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Paso 2: Configurar Dispositivos
          </h1>
          <p className="text-text-secondary text-sm">
            Agregue los dispositivos que estarán conectados a este nodo
          </p>
        </div>

        <div className="mb-6">
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Wifi className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-text-primary mb-2">
                  Dispositivos Conectados
                </h3>
                <p className="text-sm text-text-secondary">
                  Configure cámaras IP, lectores biométricos y otros
                  dispositivos de entrada
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={detectUSBDevices}
                  disabled={isDetecting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Detectar dispositivos USB conectados"
                >
                  {isDetecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {isDetecting ? 'Detectando...' : 'Detectar USB'}
                </button>
                <button
                  onClick={addDevice}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  + Agregar
                </button>
              </div>
            </div>

            {/* Mensaje de estado de detección */}
            {detectionStatus && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                detectionStatus.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                detectionStatus.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                detectionStatus.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {detectionStatus.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {detectionStatus.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {detectionStatus.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                {detectionStatus.type === 'info' && <Usb className="w-5 h-5" />}
                <span className="text-sm">{detectionStatus.message}</span>
                <button
                  onClick={() => setDetectionStatus(null)}
                  className="ml-auto text-current opacity-60 hover:opacity-100"
                >
                  &times;
                </button>
              </div>
            )}

            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`bg-bg-primary border-2 rounded-lg p-4 ${
                    device.detected ? 'border-emerald-300 bg-emerald-50/30' : 'border-border-subtle'
                  }`}
                >
                  {device.detected && (
                    <div className="flex items-center gap-1 text-emerald-600 text-xs mb-2">
                      <Usb className="w-3 h-3" />
                      <span>Detectado automáticamente</span>
                    </div>
                  )}
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Nombre del Dispositivo
                      </label>
                      <input
                        type="text"
                        value={device.name}
                        onChange={(e) =>
                          updateDevice(device.id, "name", e.target.value)
                        }
                        placeholder="ej. Cámara Principal"
                        className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Tipo
                      </label>
                      <select
                        value={device.type}
                        onChange={(e) =>
                          updateDevice(device.id, "type", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="camera">Cámara</option>
                        <option value="fingerprint">Lector Huella</option>
                        <option value="rfid">Lector RFID</option>
                        <option value="scanner">Escáner</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Conexión
                      </label>
                      <select
                        value={device.connection}
                        onChange={(e) =>
                          updateDevice(device.id, "connection", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="IP">IP</option>
                        <option value="USB">USB</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => removeDevice(device.id)}
                        className="w-full px-3 py-2 bg-bg-secondary border border-red-500 text-red-500 rounded-lg hover:bg-bg-tertiary transition-colors text-sm font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {device.connection === "IP" && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Dirección IP
                        </label>
                        <input
                          type="text"
                          value={device.ip}
                          onChange={(e) =>
                            updateDevice(device.id, "ip", e.target.value)
                          }
                          placeholder="192.168.1.100"
                          className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Puerto
                        </label>
                        <input
                          type="text"
                          value={device.port}
                          onChange={(e) =>
                            updateDevice(device.id, "port", e.target.value)
                          }
                          placeholder="8080"
                          className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {devices.length === 0 && (
                <div className="text-center py-8 text-text-tertiary">
                  <Usb className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="mb-2">No hay dispositivos configurados</p>
                  <p className="text-sm">
                    Haga clic en "Detectar USB" para buscar dispositivos conectados o "Agregar" para añadir uno manualmente
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={onPrevious}
              className="px-6 py-2.5 text-text-secondary hover:text-text-primary font-medium transition-colors flex items-center gap-2"
            >
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Anterior
            </button>
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
