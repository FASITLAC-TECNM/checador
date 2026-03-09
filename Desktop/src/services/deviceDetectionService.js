// services/deviceDetectionService.js - ESTABLE

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

const normalizationCache = new Map();
const virtualCameraCache = new Map();

export const deviceDetectionService = {
  /**
   * Verificar si es una cámara virtual (con cache)
   */
  isVirtualCamera(name) {
    if (virtualCameraCache.has(name)) {
      return virtualCameraCache.get(name);
    }
    const nameLower = name.toLowerCase();
    const isVirtual = VIRTUAL_CAMERA_PATTERNS.some((pattern) =>
      nameLower.includes(pattern),
    );
    virtualCameraCache.set(name, isVirtual);
    return isVirtual;
  },

  /**
   * Determinar el tipo de dispositivo
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
   * Normalizar nombre con cache para evitar reprocesamiento
   */
  normalizeNameForComparison(name) {
    if (!name) return "";
    if (normalizationCache.has(name)) {
      return normalizationCache.get(name);
    }
    const normalized = name
      .toLowerCase()
      .replace(/\s*\([^)]*\)\s*/g, "")
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .replace(
        /\b(hd|camera|webcam|usb|web|integrated|built-in|truevision|general)\b/gi,
        "",
      )
      .trim();
    normalizationCache.set(name, normalized);
    return normalized;
  },

  /**
   * FIX 5: Detectar cámaras web con fallback: si Electron no devuelve nada,
   * también intentamos la detección por browser para mayor robustez.
   */
  async detectWebcams() {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return [];
      }

      // Si Electron API existe, la priorizamos pero no la usamos como única fuente:
      // el fallback al browser ocurre en detectUSBDevices cuando retorna vacío.
      // Aquí siempre enumeramos por browser para el caso de que Electron falle.
      if (window.electronAPI?.detectUSBDevices) {
        // Electron se encarga de USB; browser solo como respaldo de cámaras
        // que Electron no liste (ej. cámaras integradas no USB puras).
        // Seguimos enumerando pero luego mergeDetectedDevices deduplicará.
      }

      await this.checkCameraPermission();
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();

      const cameras = mediaDevices.reduce((acc, device, index) => {
        if (device.kind !== "videoinput") return acc;

        const label = device.label || `Cámara ${index + 1}`;
        if (this.isVirtualCamera(label)) return acc;

        acc.push({
          // FIX 6: ID estable basado en deviceId del browser (no Date.now())
          id: device.deviceId ? `browser-${device.deviceId}` : `browser-cam-${index}`,
          name: label,
          type: this.getDeviceType(label),
          connection: "USB",
          ip: "",
          port: "",
          deviceId: device.deviceId,
          detected: true,
        });
        return acc;
      }, []);

      return cameras;
    } catch (error) {
      console.error("Error detectando cámaras web:", error);
      return [];
    }
  },

  /**
   * Verificar permisos de cámara
   */
  async checkCameraPermission() {
    try {
      if (!navigator.permissions) return "prompt";
      const result = await navigator.permissions.query({ name: "camera" });
      return result.state;
    } catch {
      return "prompt";
    }
  },

  /**
   * Detectar dispositivos USB vía Electron API
   */
  async detectUSBDevices() {
    try {
      if (!window.electronAPI?.detectUSBDevices) {
        return [];
      }

      const result = await window.electronAPI.detectUSBDevices();

      if (!result?.success || !result?.devices?.length) {
        return [];
      }

      return result.devices.map((d) => ({
        ...d,
        // FIX 6: ID estable basado en instanceId si existe
        id: d.instanceId ? `usb-${d.instanceId}` : `usb-${d.name}`,
        type: this.getDeviceType(d.name || ""),
        detected: true,
      }));
    } catch (error) {
      console.error("Error detectando dispositivos USB:", error);
      return [];
    }
  },

  /**
   * FIX 7: Nuevo helper para saber si dos dispositivos son el mismo.
   * Usado por el hook para actualizar el estado detected (true/false).
   */
  isSameDevice(deviceA, deviceB) {
    // 1. Por instanceId (Electron)
    if (deviceA.instanceId && deviceB.instanceId) {
      return deviceA.instanceId === deviceB.instanceId;
    }
    // 2. Por deviceId (browser)
    if (deviceA.deviceId && deviceB.deviceId) {
      return deviceA.deviceId === deviceB.deviceId;
    }
    // 3. Por nombre normalizado (fallback)
    return (
      this.normalizeNameForComparison(deviceA.name) ===
      this.normalizeNameForComparison(deviceB.name)
    );
  },

  /**
   * Verificar si un dispositivo ya existe en la lista
   */
  deviceExists(device, existingDevices) {
    return existingDevices.some((d) => this.isSameDevice(device, d));
  },

  /**
   * Filtrar dispositivos nuevos (que no existen en la lista actual)
   */
  filterNewDevices(detectedDevices, currentDevices) {
    const existingInstanceIds = new Set(
      currentDevices.filter((d) => d.instanceId).map((d) => d.instanceId),
    );
    const existingDeviceIds = new Set(
      currentDevices.filter((d) => d.deviceId).map((d) => d.deviceId),
    );
    const existingNames = new Set(
      currentDevices.map((d) => this.normalizeNameForComparison(d.name)),
    );

    return detectedDevices.filter((d) => {
      if (!d.name) return false;
      if (d.instanceId && existingInstanceIds.has(d.instanceId)) return false;
      if (d.deviceId && existingDeviceIds.has(d.deviceId)) return false;
      return !existingNames.has(this.normalizeNameForComparison(d.name));
    });
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
   * Asignar IDs numéricos únicos a dispositivos que no tienen uno estable
   */
  assignUniqueIds(devices, startingId) {
    return devices.map((d, index) => ({
      ...d,
      id: d.id || startingId + index,
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

  /**
   * Limpiar cache periódicamente para evitar memory leaks
   */
  clearCache() {
    normalizationCache.clear();
    virtualCameraCache.clear();
  },

  /**
   * Detectar lectores biométricos vía WebSocket
   */
  async detectBiometricDevices() {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket("ws://localhost:8787/");
        const timeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.CLOSED) ws.close();
          resolve([]);
        }, 2000);

        ws.onopen = () => {
          ws.send(JSON.stringify({ command: "getStatus" }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (
              data.type === "systemStatus" ||
              data.type === "readerConnection"
            ) {
              if (data.readerConnected || data.connected) {
                clearTimeout(timeout);
                ws.close();
                resolve([
                  {
                    id: "biometric-reader-dp4500",
                    name: "Lector de Huella (DigitalPersona)",
                    type: "dactilar",
                    connection: "USB",
                    ip: "",
                    port: "",
                    detected: true,
                    instanceId: "dp-4500-default",
                  },
                ]);
              }
            }
          } catch (e) {
            console.error("Error parsing WS message:", e);
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve([]);
        };
      } catch (error) {
        console.error("Error en detección biométrica:", error);
        resolve([]);
      }
    });
  },
};
