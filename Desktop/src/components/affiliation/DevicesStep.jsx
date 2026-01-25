import { useState, useEffect, useRef } from "react";
import { Wifi, Info, Search, Loader2, Usb, CheckCircle2, AlertCircle, Camera } from "lucide-react";
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
  const hasDetectedOnMount = useRef(false);

  // Lista de cámaras virtuales a filtrar
  const virtualCameraPatterns = [
    'obs', 'virtual', 'manycam', 'xsplit', 'snap camera', 'snapcamera',
    'droidcam', 'iriun', 'epoccam', 'ndi', 'newtek', 'camtwist',
    'sparkocam', 'splitcam', 'youcam', 'cyberlink', 'avatarify',
    'chromacam', 'vcam', 'fake', 'screen capture', 'game capture'
  ];

  // Verificar si es una cámara virtual
  const isVirtualCamera = (name) => {
    const nameLower = name.toLowerCase();
    return virtualCameraPatterns.some(pattern => nameLower.includes(pattern));
  };

  // Detectar cámaras web usando la API del navegador (funciona sin Electron)
  const detectWebcams = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }

      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = mediaDevices
        .filter(device => device.kind === 'videoinput')
        .filter(device => !isVirtualCamera(device.label || '')) // Filtrar cámaras virtuales
        .map((device, index) => ({
          id: Date.now() + index,
          name: device.label || `Cámara ${index + 1}`,
          type: 'camera',
          connection: 'USB',
          ip: '',
          port: '',
          deviceId: device.deviceId,
          detected: true,
        }));

      return cameras;
    } catch (error) {
      console.error('Error detectando cámaras web:', error);
      return [];
    }
  };

  // Función para detectar todos los dispositivos disponibles
  const detectAllDevices = async (showStatus = true) => {
    setIsDetecting(true);
    if (showStatus) {
      setDetectionStatus(null);
    }

    try {
      let detectedDevices = [];

      // 1. Detectar dispositivos USB vía Electron API
      if (window.electronAPI && window.electronAPI.detectUSBDevices) {
        const result = await window.electronAPI.detectUSBDevices();
        if (result.success && result.devices.length > 0) {
          detectedDevices = [...result.devices];
        }
      }

      // 2. Detectar cámaras web usando la API del navegador (complementa la detección de Electron)
      const webcams = await detectWebcams();

      // Agregar cámaras que no estén ya detectadas por Electron
      for (const webcam of webcams) {
        const alreadyExists = detectedDevices.some(d =>
          d.type === 'camera' &&
          (d.name.toLowerCase().includes(webcam.name.toLowerCase()) ||
           webcam.name.toLowerCase().includes(d.name.toLowerCase()))
        );

        if (!alreadyExists && webcam.name) {
          detectedDevices.push(webcam);
        }
      }

      // 3. Filtrar dispositivos que ya existen en la lista actual
      const existingNames = devices.map(d => d.name.toLowerCase());
      const newDevices = detectedDevices.filter(
        d => d.name && !existingNames.includes(d.name.toLowerCase())
      );

      if (newDevices.length > 0) {
        // Asignar IDs únicos
        const devicesWithIds = newDevices.map((d, index) => ({
          ...d,
          id: devices.length + index + 1,
        }));

        setDevices([...devices, ...devicesWithIds]);

        if (showStatus) {
          setDetectionStatus({
            type: 'success',
            message: `Se detectaron ${newDevices.length} dispositivo(s) nuevo(s)`
          });
        }
      } else if (detectedDevices.length > 0 && showStatus) {
        setDetectionStatus({
          type: 'info',
          message: 'Los dispositivos detectados ya están en la lista'
        });
      } else if (showStatus) {
        // Si no se detectó nada con Electron, mostrar mensaje apropiado
        if (!window.electronAPI || !window.electronAPI.detectUSBDevices) {
          setDetectionStatus({
            type: 'info',
            message: webcams.length === 0
              ? 'No se detectaron cámaras. Conecte un dispositivo o agregue uno manualmente.'
              : 'Detección limitada en modo web. Para detectar todos los dispositivos, use la aplicación de escritorio.'
          });
        } else {
          setDetectionStatus({
            type: 'info',
            message: 'No se detectaron dispositivos conectados'
          });
        }
      }

      return detectedDevices;
    } catch (error) {
      console.error('Error detectando dispositivos:', error);
      if (showStatus) {
        setDetectionStatus({
          type: 'error',
          message: 'Error al detectar dispositivos: ' + error.message
        });
      }
      return [];
    } finally {
      setIsDetecting(false);
    }
  };

  // Detectar dispositivos automáticamente al montar el componente
  useEffect(() => {
    if (!hasDetectedOnMount.current) {
      hasDetectedOnMount.current = true;

      // Pequeño delay para que el componente se renderice primero
      const timer = setTimeout(() => {
        detectAllDevices(false).then(detected => {
          if (detected.length > 0) {
            setDetectionStatus({
              type: 'success',
              message: `Se detectaron automáticamente ${detected.length} dispositivo(s)`
            });
          }
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

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
    <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
      {/* Barra de progreso fija */}
      <div className="bg-bg-secondary border-b border-border-subtle py-3 px-8 flex-shrink-0">
        <StepIndicator currentStep={2} totalSteps={4} />
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={onShowWelcome}
            className="absolute top-20 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-10"
            title="Ver información de bienvenida"
          >
            <Info className="w-6 h-6" />
          </button>
        <div className="mb-3">
          <h1 className="text-lg font-bold text-text-primary">
            Paso 2: Configurar Dispositivos
          </h1>
          <p className="text-text-secondary text-sm">
            Agregue los dispositivos que estarán conectados a este nodo
          </p>
        </div>

        <div className="flex-1">
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Wifi className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary text-sm">
                  Dispositivos Conectados
                </h3>
                <p className="text-xs text-text-secondary">
                  Configure cámaras IP, lectores biométricos y otros dispositivos de entrada
                </p>
              </div>
              {devices.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => detectAllDevices(true)}
                    disabled={isDetecting}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDetecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Detectar
                  </button>
                  <button
                    onClick={addDevice}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    + Agregar
                  </button>
                </div>
              )}
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
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <Camera className="w-8 h-8 text-indigo-600" />
                  </div>
                  <p className="text-base text-text-secondary font-medium mb-1">No hay dispositivos configurados</p>
                  <p className="text-sm text-text-tertiary mb-5 max-w-md text-center">
                    Detecte automáticamente las cámaras y dispositivos conectados a este equipo
                  </p>
                  <button
                    onClick={() => detectAllDevices(true)}
                    disabled={isDetecting}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all text-base font-medium flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDetecting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                    {isDetecting ? 'Detectando dispositivos...' : 'Detectar Dispositivos'}
                  </button>
                  <button
                    onClick={addDevice}
                    className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    O agregar dispositivo manualmente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Footer fijo con botones */}
      <div className="bg-bg-secondary border-t border-border-subtle px-6 py-3 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex justify-between">
          <button
            onClick={onPrevious}
            className="px-5 py-2 text-text-secondary hover:text-text-primary font-medium transition-colors flex items-center gap-2 text-sm"
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
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-sm"
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
