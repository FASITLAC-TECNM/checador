// hooks/useDeviceDetection.js - OPTIMIZADO
import { useState, useEffect, useRef, useCallback } from "react";
import { deviceDetectionService } from "../services/deviceDetectionService";

export const useDeviceDetection = (devices, setDevices) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState(null);
  const hasDetectedOnMount = useRef(false);
  const detectionTimeoutRef = useRef(null);

  // MEJORA 1: useCallback para evitar recrear la función en cada render
  const detectAllDevices = useCallback(
    async (showStatus = true) => {
      setIsDetecting(true);
      if (showStatus) {
        setDetectionStatus(null);
      }

      try {
        // 1. Detectar dispositivos en paralelo para mejor rendimiento
        const [usbDevices, webcams] = await Promise.all([
          deviceDetectionService.detectUSBDevices(),
          deviceDetectionService.detectWebcams(),
        ]);

        // 2. Combinar dispositivos evitando duplicados
        const detectedDevices = deviceDetectionService.mergeDetectedDevices(
          usbDevices,
          webcams,
        );

        // 3. Filtrar dispositivos que ya existen en la lista actual
        const newDevices = deviceDetectionService.filterNewDevices(
          detectedDevices,
          devices,
        );

        // 4. Agregar nuevos dispositivos a la lista
        if (newDevices.length > 0) {
          const devicesWithIds = deviceDetectionService.assignUniqueIds(
            newDevices,
            devices.length + 1,
          );
          setDevices([...devices, ...devicesWithIds]);
        }

        // 5. Mostrar mensaje de estado si corresponde
        if (showStatus) {
          const hasElectronAPI = !!(
            window.electronAPI && window.electronAPI.detectUSBDevices
          );
          const statusMessage =
            deviceDetectionService.getDetectionStatusMessage(
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
    },
    [devices, setDevices], // MEJORA 2: Dependencias correctas
  );

  /**
   * MEJORA 3: Detectar dispositivos automáticamente al montar el componente
   * con cleanup apropiado
   */
  useEffect(() => {
    if (!hasDetectedOnMount.current) {
      hasDetectedOnMount.current = true;

      // Pequeño delay para que el componente se renderice primero
      detectionTimeoutRef.current = setTimeout(() => {
        detectAllDevices(false).then((detected) => {
          if (detected.length > 0) {
            setDetectionStatus({
              type: "success",
              message: `Se detectaron automáticamente ${detected.length} dispositivo(s)`,
            });
          }
        });
      }, 500);
    }

    // MEJORA 4: Cleanup function para limpiar timeout y cache
    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
      // Limpiar cache al desmontar para evitar memory leaks
      deviceDetectionService.clearCache();
    };
  }, [detectAllDevices]);

  return {
    isDetecting,
    detectionStatus,
    setDetectionStatus,
    detectAllDevices,
  };
};
