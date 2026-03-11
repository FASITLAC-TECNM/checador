// hooks/useCameraStatus.js
// Verifica si hay un dispositivo de cámara REGISTRADO en el sistema
// y si está CONECTADO. Combina info del backend con detección local
// como fallback robusto.
import { useState, useEffect, useRef, useCallback } from "react";
import { API_CONFIG, fetchApi } from "../config/apiEndPoint";

const POLL_INTERVAL = 15000; // 15 segundos

import { deviceDetectionService } from "../services/deviceDetectionService";

/**
 * Detección local pura combinada (USB y Webcams).
 * Devuelve un array con strings estabilizados basados en deviceId o instanceId.
 */
async function detectLocalCamera() {
  try {
    const [usbDevices, webcams] = await Promise.all([
      deviceDetectionService.detectUSBDevices(),
      deviceDetectionService.detectWebcams(),
    ]);

    const allDetected = deviceDetectionService.mergeDetectedDevices(usbDevices, webcams);
    
    // Extraer solo los IDs físicos para sincronización
    const localIds = new Set();
    for (const d of allDetected) {
      if (d.type === "facial") {
        const id = d.device_id || d.deviceId || d.instanceId;
        if (id) localIds.add(id);
      }
    }

    return Array.from(localIds);
  } catch (error) {
    console.error("[detectLocalCamera] Error leyendo dispositivos:", error);
    return [];
  }
}

export const useCameraStatus = (enabled = true) => {
  const [isCameraConnected, setIsCameraConnected] = useState(false);
  const [hasCameraRegistered, setHasCameraRegistered] = useState(false);
  const isMountedRef = useRef(true);
  const intervalRef = useRef(null);
  const initialCheckDoneRef = useRef(false);

  const getAuthToken = useCallback(() => localStorage.getItem("auth_token"), []);
  const getEscritorioId = useCallback(() => localStorage.getItem("escritorio_id"), []);

  /**
   * Consulta la BD enviando los IDs físicos locales para sincronizar su estado.
   * Flujo automático:
   * 1. Consulta cámaras registradas.
   * 2. Si hay cámara física, y hay cámara registrada SIN device_id -> Le asigna este hardware ID para anclarla.
   * 3. Sincroniza estado validando el match exacto del hardware ID (bloquea si conectas otra).
   */
  const checkRegisteredCameras = useCallback(async () => {
    try {
      const escritorioId = getEscritorioId();
      const token = getAuthToken();

      if (!escritorioId) {
        if (isMountedRef.current) {
          setHasCameraRegistered(false);
          setIsCameraConnected(false);
        }
        return;
      }

      // 1. Obtener cámaras registradas en la BD para este escritorio
      const responseReg = await fetchApi(
        `${API_CONFIG.ENDPOINTS.BIOMETRICO}/escritorio/${escritorioId}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
      const devicesReg = Array.isArray(responseReg.data || responseReg) ? responseReg.data || responseReg : [];
      let registeredCamera = devicesReg.find(d => d.tipo === "facial" && d.es_activo);

      // Si no hay ninguna cámara configurada en BD, no se puede usar.
      if (!registeredCamera) {
          if (isMountedRef.current) {
             setHasCameraRegistered(false);
             setIsCameraConnected(false);
             localStorage.setItem("cached_camera_registered", "false");
          }
          return;
      }

      // 2. Obtener los IDs de hardware conectados localmente en este momento
      const localDeviceIds = await detectLocalCamera();
      
      // FALLBACK OFFLINE o SIN CÁMARAS LOCALES (fisicamente no hay ninguna enchufada)
      if (localDeviceIds.length === 0) {
        if (isMountedRef.current) {
          setHasCameraRegistered(true);
          setIsCameraConnected(false);
          localStorage.setItem("cached_camera_registered", "true");
        }
        // Avisamos al backend que limpie estados
        await fetchApi(`${API_CONFIG.ENDPOINTS.BIOMETRICO}/sync-status`, {
            method: 'POST',
            headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
            body: JSON.stringify({ escritorio_id: escritorioId, device_ids: [] })
        }).catch(() => {});
        return;
      }

      // 3. Auto-Vinculación (Primer uso o reseteo del admin).
      // Si la BD dice que hay cámara registrada PERO no tiene anclado ningún device_id de hardware
      // entonces asumimos que "la que está conectada" ahorita es la oficial y se la anclamos para el futuro.
      // Solo tomamos el primer dispositivo de video válido.
      if (!registeredCamera.device_id && localDeviceIds.length > 0) {
          const idToAssign = localDeviceIds[0];
          try {
             await fetchApi(`${API_CONFIG.ENDPOINTS.BIOMETRICO}/${registeredCamera.id}`, {
                 method: 'PUT',
                 headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
                 body: JSON.stringify({ device_id: idToAssign })
             });
             console.log(`[useCameraStatus] Cámara vinculada automáticamente al hardware ID: ${idToAssign}`);
             registeredCamera.device_id = idToAssign; // Actualizamos localmente
          } catch (e) {
             console.error("[useCameraStatus] Error vinculando cámara al primer uso:", e);
          }
      }

      // 4. Enviar los IDs locales al backend para sincronizar el estado
      // La API marcará automáticamente "desconectado" todo, y "conectado" a los IDs que enviemos
      // si y solo si, esos IDs pertenecen a cámaras previamente registradas/vinculadas.
      const responseSync = await fetchApi(
        `${API_CONFIG.ENDPOINTS.BIOMETRICO}/sync-status`,
        {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            escritorio_id: escritorioId,
            device_ids: localDeviceIds
          })
        }
      );

      // El backend nos devuelve la lista de cámaras que entraron como "conectadas"
      const syncedDevices = Array.isArray(responseSync.data || responseSync)
        ? responseSync.data || responseSync
        : [];

      const approvedCameraDevices = syncedDevices.filter(d => d.tipo === "facial" && d.es_activo);
      const hasApproved = approvedCameraDevices.length > 0;
      
      localStorage.setItem("cached_camera_registered", JSON.stringify(hasApproved));

      if (isMountedRef.current) {
        setHasCameraRegistered(hasApproved);
        setIsCameraConnected(hasApproved);
      }

    } catch (error) {
      console.error("[useCameraStatus] Error verificando/sincronizando cámaras:", error);
      
      // FALLBACK DE RED (El backend falló o no hay internet)
      const localDeviceIds = await detectLocalCamera();
      const locallyDetected = localDeviceIds.length > 0;
      
      // RECUPERAR registro del caché
      const cachedRegisteredItem = localStorage.getItem("cached_camera_registered");
      let cachedRegistered = false;
      if (cachedRegisteredItem) {
        try {
           cachedRegistered = JSON.parse(cachedRegisteredItem);
        } catch {
           cachedRegistered = false;
        }
      }

      if (isMountedRef.current) {
        setHasCameraRegistered(cachedRegistered); 
        // En offline, si sabíamos que estaba registrada y ahorita hay _alguna_ física
        // dejamos prender la UI, asumiendo buena fe (no podemos validar ID criptográfico sin backend).
        setIsCameraConnected(cachedRegistered && locallyDetected);
      }
    }
  }, [getAuthToken, getEscritorioId]);

  // Verificación inicial (una sola vez con delay para dejar que el componente monte)
  useEffect(() => {
    if (!enabled) return;
    if (!initialCheckDoneRef.current) {
      initialCheckDoneRef.current = true;
      const timeout = setTimeout(checkRegisteredCameras, 2000);
      return () => clearTimeout(timeout);
    }
  }, [enabled, checkRegisteredCameras]);

  // Polling periódico
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!intervalRef.current) {
      intervalRef.current = setInterval(checkRegisteredCameras, POLL_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, checkRegisteredCameras]);

  // Cleanup al desmontar
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Escuchar cambios de hardware en tiempo real (hot-plug USB nativo)
  useEffect(() => {
    if (!enabled || !window?.electronAPI?.onUSBDeviceChange) return;

    const cleanup = window.electronAPI.onUSBDeviceChange((data) => {
      console.log(`[useCameraStatus] Cambio USB detectado (Activo=${data.active})`);
      checkRegisteredCameras();
    });

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [enabled, checkRegisteredCameras]);

  return { isCameraConnected, hasCameraRegistered };
};
