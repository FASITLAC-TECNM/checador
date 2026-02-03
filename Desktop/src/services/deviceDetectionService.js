// services/deviceDetectionService.js

const VIRTUAL_CAMERA_PATTERNS = [
  "obs",
  "virtual",
  "manycam",
  "xsplit",
  "snap camera",
  "snapcamera",
  "droidcam",
  "iriun",
  "epoccam",
  "ndi",
  "newtek",
  "camtwist",
  "sparkocam",
  "splitcam",
  "youcam",
  "cyberlink",
  "avatarify",
  "chromacam",
  "vcam",
  "fake",
  "screen capture",
  "game capture",
];

export const deviceDetectionService = {
  /**
   * Verificar si es una cámara virtual
   */
  isVirtualCamera(name) {
    const nameLower = name.toLowerCase();
    return VIRTUAL_CAMERA_PATTERNS.some((pattern) =>
      nameLower.includes(pattern),
    );
  },

  /**
   * Determinar el tipo de dispositivo basado en su nombre
   */
  getDeviceType(name) {
    const nameLower = name.toLowerCase();
    if (
      nameLower.includes("fingerprint") ||
      nameLower.includes("huella") ||
      nameLower.includes("dactilar") ||
      nameLower.includes("u.are.u")
    ) {
      return "dactilar";
    }
    return "facial";
  },

  /**
   * Normalizar nombre para comparación (quitar IDs y paréntesis)
   */
  normalizeNameForComparison(name) {
    return name
      .toLowerCase()
      .replace(/\s*\([^)]*\)\s*/g, "")
      .trim();
  },

  /**
   * Detectar cámaras web usando la API del navegador
   */
  async detectWebcams() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }

      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = mediaDevices
        .filter((device) => device.kind === "videoinput")
        .filter((device) => !this.isVirtualCamera(device.label || ""))
        .map((device, index) => ({
          id: Date.now() + index,
          name: device.label || `Cámara ${index + 1}`,
          type: this.getDeviceType(device.label || ""),
          connection: "USB",
          ip: "",
          port: "",
          deviceId: device.deviceId,
          detected: true,
        }));

      return cameras;
    } catch (error) {
      console.error("Error detectando cámaras web:", error);
      return [];
    }
  },

  /**
   * Detectar dispositivos USB vía Electron API
   */
  async detectUSBDevices() {
    try {
      if (window.electronAPI && window.electronAPI.detectUSBDevices) {
        const result = await window.electronAPI.detectUSBDevices();
        if (result.success && result.devices.length > 0) {
          return result.devices.map((d) => ({
            ...d,
            type: this.getDeviceType(d.name || ""),
          }));
        }
      }
      return [];
    } catch (error) {
      console.error("Error detectando dispositivos USB:", error);
      return [];
    }
  },

  /**
   * Verificar si un dispositivo ya existe en la lista
   */
  deviceExists(device, existingDevices) {
    const deviceNormalized = this.normalizeNameForComparison(device.name);

    return existingDevices.some((d) => {
      const existingNormalized = this.normalizeNameForComparison(d.name);
      return (
        existingNormalized === deviceNormalized ||
        existingNormalized.includes(deviceNormalized) ||
        deviceNormalized.includes(existingNormalized)
      );
    });
  },

  /**
   * Filtrar dispositivos nuevos que no existan en la lista actual
   */
  filterNewDevices(detectedDevices, currentDevices) {
    const existingNames = currentDevices.map((d) => d.name.toLowerCase());
    return detectedDevices.filter(
      (d) => d.name && !existingNames.includes(d.name.toLowerCase()),
    );
  },

  /**
   * Combinar dispositivos detectados evitando duplicados
   */
  mergeDetectedDevices(usbDevices, webcams) {
    const combined = [...usbDevices];

    for (const webcam of webcams) {
      if (!this.deviceExists(webcam, combined) && webcam.name) {
        combined.push(webcam);
      }
    }

    return combined;
  },

  /**
   * Asignar IDs únicos a los dispositivos
   */
  assignUniqueIds(devices, startingId) {
    return devices.map((d, index) => ({
      ...d,
      id: startingId + index,
    }));
  },

  /**
   * Determinar el mensaje de estado apropiado
   */
  getDetectionStatusMessage(
    detectedDevices,
    newDevices,
    hasElectronAPI,
    webcamsCount,
  ) {
    if (newDevices.length > 0) {
      return {
        type: "success",
        message: `Se detectaron ${newDevices.length} dispositivo(s) nuevo(s)`,
      };
    }

    if (detectedDevices.length > 0) {
      return {
        type: "info",
        message: "Los dispositivos detectados ya están en la lista",
      };
    }

    // Si no se detectó nada
    if (!hasElectronAPI) {
      return {
        type: "info",
        message:
          webcamsCount === 0
            ? "No se detectaron cámaras. Conecte un dispositivo o agregue uno manualmente."
            : "Detección limitada en modo web. Para detectar todos los dispositivos, use la aplicación de escritorio.",
      };
    }

    return {
      type: "info",
      message: "No se detectaron dispositivos conectados",
    };
  },
};
