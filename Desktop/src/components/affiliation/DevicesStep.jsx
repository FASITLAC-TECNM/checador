import { Wifi, Info } from "lucide-react";
import StepIndicator from "./StepIndicator";

export default function DevicesStep({
  devices,
  setDevices,
  onNext,
  onPrevious,
  onShowWelcome,
}) {
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

  const updateDevice = (id, field, value) => {
    setDevices(
      devices.map((dev) => (dev.id === id ? { ...dev, [field]: value } : dev))
    );
  };

  const removeDevice = (id) => {
    setDevices(devices.filter((dev) => dev.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <button
        onClick={onShowWelcome}
        className="fixed top-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-10"
        title="Ver información de bienvenida"
      >
        <Info className="w-6 h-6" />
      </button>

      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Paso 2: Configurar Dispositivos
          </h1>
          <p className="text-gray-600 text-sm">
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
                <h3 className="font-bold text-gray-800 mb-2">
                  Dispositivos Conectados
                </h3>
                <p className="text-sm text-gray-600">
                  Configure cámaras IP, lectores biométricos y otros
                  dispositivos de entrada
                </p>
              </div>
              <button
                onClick={addDevice}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="bg-white border-2 border-gray-200 rounded-lg p-4"
                >
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nombre del Dispositivo
                      </label>
                      <input
                        type="text"
                        value={device.name}
                        onChange={(e) =>
                          updateDevice(device.id, "name", e.target.value)
                        }
                        placeholder="ej. Cámara Principal"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tipo
                      </label>
                      <select
                        value={device.type}
                        onChange={(e) =>
                          updateDevice(device.id, "type", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="camera">Cámara</option>
                        <option value="fingerprint">Lector Huella</option>
                        <option value="rfid">Lector RFID</option>
                        <option value="scanner">Escáner</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Conexión
                      </label>
                      <select
                        value={device.connection}
                        onChange={(e) =>
                          updateDevice(device.id, "connection", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="IP">IP</option>
                        <option value="USB">USB</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => removeDevice(device.id)}
                        className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {device.connection === "IP" && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Dirección IP
                        </label>
                        <input
                          type="text"
                          value={device.ip}
                          onChange={(e) =>
                            updateDevice(device.id, "ip", e.target.value)
                          }
                          placeholder="192.168.1.100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Puerto
                        </label>
                        <input
                          type="text"
                          value={device.port}
                          onChange={(e) =>
                            updateDevice(device.id, "port", e.target.value)
                          }
                          placeholder="8080"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {devices.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No hay dispositivos configurados</p>
                  <p className="text-sm">
                    Haga clic en "Agregar" para añadir un dispositivo
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6 mb-6">
          <button
            onClick={onPrevious}
            className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors flex items-center gap-2"
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

        <StepIndicator currentStep={2} />
      </div>
    </div>
  );
}
