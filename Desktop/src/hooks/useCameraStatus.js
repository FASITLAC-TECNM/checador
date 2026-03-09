// hooks/useCameraStatus.js
// Verifica si hay un dispositivo de cámara REGISTRADO en el sistema
// y si está CONECTADO. Combina info del backend con detección local
// como fallback robusto.
import { useState, useEffect, useRef, useCallback } from "react";
import { API_CONFIG, fetchApi } from "../config/apiEndPoint";

const POLL_INTERVAL = 15000; // 15 segundos

/**
 * Detección local directa: intenta obtener video para forzar
 * permisos y luego enumera dispositivos. Devuelve true si hay
 * al menos una cámara de video disponible.
 */
async function detectLocalCamera() {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return false;

    // Solicitar permiso para obtener labels reales
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch {
      // Sin permiso, continuar de todas formas
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === "videoinput");

    // Liberar el stream de inmediato
    if (stream) stream.getTracks().forEach(t => t.stop());

    return videoDevices.length > 0;
  } catch {
    return false;
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
   * Consulta la BD y verifica el estado de cámaras registradas.
   * Si la BD dice "desconectado" pero hay camara fisica, usa la deteccion local
   * como fallback para no bloquear al usuario innecesariamente.
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

      const response = await fetchApi(
        `${API_CONFIG.ENDPOINTS.BIOMETRICO}/escritorio/${escritorioId}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const devices = Array.isArray(response.data || response)
        ? response.data || response
        : [];

      const cameraDevices = devices.filter(d => d.tipo === "facial");
      const hasRegistered = cameraDevices.length > 0;

      if (!isMountedRef.current) return;

      setHasCameraRegistered(hasRegistered);

      if (!hasRegistered) {
        // No hay cámara registrada en la BD → deshabilitar botón
        setIsCameraConnected(false);
        return;
      }

      // Verificar si la BD dice que está conectada
      const dbSaysConnected = cameraDevices.some(d => d.estado === "conectado");

      if (dbSaysConnected) {
        setIsCameraConnected(true);
        return;
      }

      // FALLBACK: La BD dice "desconectado" pero puede estar desactualizada.
      // Verificar directamente con mediaDevices (fuente de verdad real).
      console.log("[useCameraStatus] BD dice desconectado, verificando localmente...");
      const locallyDetected = await detectLocalCamera();
      console.log(`[useCameraStatus] Detección local: ${locallyDetected ? "✅ Conectada" : "❌ No detectada"}`);

      if (isMountedRef.current) {
        setIsCameraConnected(locallyDetected);
      }
    } catch (error) {
      console.error("[useCameraStatus] Error verificando cámaras:", error);
      // En caso de error de red, intentar detección local
      const locallyDetected = await detectLocalCamera();
      if (isMountedRef.current) {
        setHasCameraRegistered(locallyDetected); // Asumir registrada si hay cámara
        setIsCameraConnected(locallyDetected);
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

  // Escuchar cambios de hardware en tiempo real (hot-plug)
  useEffect(() => {
    if (!enabled || !navigator.mediaDevices) return;

    const handleDeviceChange = () => {
      console.log("[useCameraStatus] Cambio de dispositivo multimedia detectado (hot-plug)");
      checkRegisteredCameras();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [enabled, checkRegisteredCameras]);

  return { isCameraConnected, hasCameraRegistered };
};
