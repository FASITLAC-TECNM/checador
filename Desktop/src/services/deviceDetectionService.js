// services/deviceDetectionService.js - OPTIMIZADO

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

// MEJORA 1: Cache para evitar procesamiento repetitivo
const normalizationCache = new Map();
const virtualCameraCache = new Map();

export const deviceDetectionService = {
  /**
   * MEJORA 2: Verificar si es una cámara virtual (con cache)
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
   * MEJORA 3: Determinar el tipo de dispositivo (optimizado)
   */
  getDeviceType(name) {
    const nameLower = name.toLowerCase();

    // Verificación más eficiente con early return
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
   * MEJORA 4: Normalizar nombre con cache para evitar reprocesamiento
   */
  normalizeNameForComparison(name) {
    if (normalizationCache.has(name)) {
      return normalizationCache.get(name);
    }

    const normalized = name
      .toLowerCase()
      .replace(/\s*\([^)]*\)\s*/g, "")           // Remove parentheses content
      .replace(/[-_]/g, " ")                      // Hyphens and underscores to spaces
      .replace(/\s+/g, " ")                       // Multiple spaces to single
      .replace(/\b(hd|camera|webcam|usb|web|integrated|built-in|truevision|general)\b/gi, "")  // Remove common words
      .trim();

    normalizationCache.set(name, normalized);
    return normalized;
  },

  /**
   * MEJORA 5: Detectar cámaras web con mejor manejo de permisos
   */
  async detectWebcams() {
    try {
      // Skip browser detection if Electron API is available - it provides better device info
      if (window.electronAPI?.detectUSBDevices) {
        console.log("[DeviceDetection] Skipping browser webcam detection - using Electron API");
        return [];
      }

      if (!navigator.mediaDevices?.enumerateDevices) {
        return [];
      }

      // Verificar permisos antes de intentar
      const permissionStatus = await this.checkCameraPermission();

      const mediaDevices = await navigator.mediaDevices.enumerateDevices();

      // MEJORA 6: Procesamiento más eficiente con reduce
      const cameras = mediaDevices.reduce((acc, device, index) => {
        if (device.kind !== "videoinput") return acc;

        const label = device.label || `Cámara ${index + 1}`;

        // Filtrar cámaras virtuales
        if (this.isVirtualCamera(label)) return acc;

        acc.push({
          id: Date.now() + index,
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
   * MEJORA 7: Verificar permisos de cámara
   */
  async checkCameraPermission() {
    try {
      if (!navigator.permissions) return "prompt";

      const result = await navigator.permissions.query({ name: "camera" });
      return result.state;
    } catch (error) {
      // Algunos navegadores no soportan permissions API
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
        type: this.getDeviceType(d.name || ""),
      }));
    } catch (error) {
      console.error("Error detectando dispositivos USB:", error);
      return [];
    }
  },

  /**
   * MEJORA 8: Verificar si un dispositivo ya existe (optimizado)
   */
  deviceExists(device, existingDevices) {
    // Priority 1: Compare by instanceId (Electron provides this)
    if (device.instanceId) {
      const hasInstanceMatch = existingDevices.some(
        (d) => d.instanceId && d.instanceId === device.instanceId
      );
      if (hasInstanceMatch) return true;
    }

    // Priority 2: Compare by deviceId (browser provides this)
    if (device.deviceId) {
      const hasDeviceIdMatch = existingDevices.some(
        (d) => d.deviceId && d.deviceId === device.deviceId
      );
      if (hasDeviceIdMatch) return true;
    }

    // Priority 3: Compare by normalized name (fallback with exact match only)
    const deviceNormalized = this.normalizeNameForComparison(device.name);

    return existingDevices.some((d) => {
      const existingNormalized = this.normalizeNameForComparison(d.name);
      return existingNormalized === deviceNormalized;
    });
  },

  /**
   * MEJORA 9: Filtrar dispositivos nuevos con Set para mejor rendimiento
   */
  filterNewDevices(detectedDevices, currentDevices) {
    // Create Sets for O(1) lookup using multiple identifiers
    const existingInstanceIds = new Set(
      currentDevices.filter((d) => d.instanceId).map((d) => d.instanceId)
    );
    const existingDeviceIds = new Set(
      currentDevices.filter((d) => d.deviceId).map((d) => d.deviceId)
    );
    const existingNames = new Set(
      currentDevices.map((d) => this.normalizeNameForComparison(d.name))
    );

    return detectedDevices.filter((d) => {
      if (!d.name) return false;

      // Check instanceId first
      if (d.instanceId && existingInstanceIds.has(d.instanceId)) return false;

      // Check deviceId second
      if (d.deviceId && existingDeviceIds.has(d.deviceId)) return false;

      // Check normalized name last
      const normalized = this.normalizeNameForComparison(d.name);
      return !existingNames.has(normalized);
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

  /**
   * MEJORA 10: Limpiar cache periódicamente para evitar memory leaks
   */
  clearCache() {
    normalizationCache.clear();
    virtualCameraCache.clear();
  },

  /**
   * MEJORA 11: Limpiar cache con límite de tamaño
   */
  maintainCache(cache, maxSize = 100) {
    if (cache.size > maxSize) {
      const keysToDelete = Array.from(cache.keys()).slice(
        0,
        cache.size - maxSize,
      );
      keysToDelete.forEach((key) => cache.delete(key));
    }
  },
};
