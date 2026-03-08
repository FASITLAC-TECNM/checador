// hooks/useCameraStatus.js
// Hook que verifica si hay un dispositivo de cámara REGISTRADO en el sistema
// y si está CONECTADO. Solo habilita el botón facial si ambas condiciones se cumplen.
// Reutiliza el mismo patrón que isReaderConnected para huella dactilar.
import { useState, useEffect, useRef, useCallback } from "react";
import { API_CONFIG, fetchApi } from "../config/apiEndPoint";

const POLL_INTERVAL = 15000; // 15 segundos, igual que useDeviceStatus

export const useCameraStatus = (enabled = true) => {
  const [isCameraConnected, setIsCameraConnected] = useState(false);
  const [hasCameraRegistered, setHasCameraRegistered] = useState(false);
  const isMountedRef = useRef(true);
  const intervalRef = useRef(null);
  const initialCheckDoneRef = useRef(false);

  const getAuthToken = useCallback(() => {
    return localStorage.getItem("auth_token");
  }, []);

  const getEscritorioId = useCallback(() => {
    return localStorage.getItem("escritorio_id");
  }, []);

  /**
   * Consulta los dispositivos registrados en la BD para este escritorio
   * y verifica si hay alguna cámara (tipo "facial") registrada y conectada
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

      const response = await fetchApi(`${API_CONFIG.ENDPOINTS.BIOMETRICO}/escritorio/${escritorioId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const devices = Array.isArray(response.data || response) ? (response.data || response) : [];

      // Buscar dispositivos de tipo "facial" (cámara)
      const cameraDevices = devices.filter(d => d.tipo === "facial");

      if (isMountedRef.current) {
        setHasCameraRegistered(cameraDevices.length > 0);
        // Verificar si al menos una cámara registrada está conectada
        const anyConnected = cameraDevices.some(d => d.estado === "conectado");
        setIsCameraConnected(anyConnected);
      }
    } catch (error) {
      console.error("[useCameraStatus] Error verificando cámaras registradas:", error);
      if (isMountedRef.current) {
        setHasCameraRegistered(false);
        setIsCameraConnected(false);
      }
    }
  }, [getAuthToken, getEscritorioId]);

  // Verificación inicial (una sola vez con delay)
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

  // Cleanup
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

  // Evento nativo del navegador para hot-plug de cámaras web
  useEffect(() => {
    if (!enabled || !navigator.mediaDevices) return;

    const handleDeviceChange = () => {
      console.log("[useCameraStatus] Detectado cambio en dispositivos multimedia (Hot-Plug)");
      checkRegisteredCameras();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enabled, checkRegisteredCameras]);

  return { isCameraConnected, hasCameraRegistered };
};
