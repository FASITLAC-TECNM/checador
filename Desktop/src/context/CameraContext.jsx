import { createContext, useContext, useState, useRef, useCallback } from "react";

const CameraContext = createContext(null);

export function CameraProvider({ children }) {
  const [stream, setStream] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);
  const usageCountRef = useRef(0);

  // Inicializar cámara (solo si no está activa)
  const initCamera = useCallback(async () => {
    usageCountRef.current++;

    // Si ya hay un stream activo, reutilizarlo
    if (streamRef.current && streamRef.current.active) {
      setIsActive(true);
      return streamRef.current;
    }

    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsActive(true);

      return mediaStream;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Liberar uso de cámara (solo detiene si nadie más la usa)
  const releaseCamera = useCallback(() => {
    usageCountRef.current = Math.max(0, usageCountRef.current - 1);

    // Solo detener si nadie más está usando la cámara
    if (usageCountRef.current === 0 && streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setIsActive(false);
    }
  }, []);

  // Forzar liberación de cámara (detiene sin importar uso)
  const forceRelease = useCallback(() => {
    usageCountRef.current = 0;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setIsActive(false);
    }
  }, []);

  // Obtener stream actual sin inicializar
  const getStream = useCallback(() => {
    return streamRef.current;
  }, []);

  // Asignar stream a un elemento de video
  const attachToVideo = useCallback((videoElement) => {
    if (videoElement && streamRef.current) {
      videoElement.srcObject = streamRef.current;
    }
  }, []);

  const value = {
    stream,
    isActive,
    error,
    initCamera,
    releaseCamera,
    forceRelease,
    getStream,
    attachToVideo,
  };

  return (
    <CameraContext.Provider value={value}>{children}</CameraContext.Provider>
  );
}

export function useCamera() {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error("useCamera debe usarse dentro de CameraProvider");
  }
  return context;
}
