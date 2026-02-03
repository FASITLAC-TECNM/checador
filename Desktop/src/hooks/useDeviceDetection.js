// hooks/useDeviceDetection.js
import { useState, useEffect, useRef } from "react";
import { deviceDetectionService } from "../services/deviceDetectionService";

export const useDeviceDetection = (devices, setDevices) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState(null);
  const hasDetectedOnMount = useRef(false);

  /**
   * Función principal para detectar todos los dispositivos disponibles
   */
  const detectAllDevices = async (showStatus = true) => {
    setIsDetecting(true);
    if (showStatus) {
      setDetectionStatus(null);
    }

    try {
      // 1. Detectar dispositivos USB vía Electron API
      const usbDevices = await deviceDetectionService.detectUSBDevices();

      // 2. Detectar cámaras web usando la API del navegador
      const webcams = await deviceDetectionService.detectWebcams();

      // 3. Combinar dispositivos evitando duplicados
      const detectedDevices = deviceDetectionService.mergeDetectedDevices(
        usbDevices,
        webcams,
      );

      // 4. Filtrar dispositivos que ya existen en la lista actual
      const newDevices = deviceDetectionService.filterNewDevices(
        detectedDevices,
        devices,
      );

      // 5. Agregar nuevos dispositivos a la lista
      if (newDevices.length > 0) {
        const devicesWithIds = deviceDetectionService.assignUniqueIds(
          newDevices,
          devices.length + 1,
        );
        setDevices([...devices, ...devicesWithIds]);
      }

      // 6. Mostrar mensaje de estado si corresponde
      if (showStatus) {
        const hasElectronAPI = !!(
          window.electronAPI && window.electronAPI.detectUSBDevices
        );
        const statusMessage = deviceDetectionService.getDetectionStatusMessage(
          detectedDevices,
          newDevices,
          hasElectronAPI,
          webcams.length,
        );
        setDetectionStatus(statusMessage);
      }

      return detectedDevices;
    } catch (error) {
      console.error("Error detectando dispositivos:", error);
      if (showStatus) {
        setDetectionStatus({
          type: "error",
          message: "Error al detectar dispositivos: " + error.message,
        });
      }
      return [];
    } finally {
      setIsDetecting(false);
    }
  };

  /**
   * Detectar dispositivos automáticamente al montar el componente
   */
  useEffect(() => {
    if (!hasDetectedOnMount.current) {
      hasDetectedOnMount.current = true;

      // Pequeño delay para que el componente se renderice primero
      const timer = setTimeout(() => {
        detectAllDevices(false).then((detected) => {
          if (detected.length > 0) {
            setDetectionStatus({
              type: "success",
              message: `Se detectaron automáticamente ${detected.length} dispositivo(s)`,
            });
          }
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isDetecting,
    detectionStatus,
    setDetectionStatus,
    detectAllDevices,
  };
};
