/**
 * Hook para monitorear conectividad a Internet y Base de Datos
 * Implementa estrategia híbrida reactiva:
 * 1. Detección instantánea nativa (offline/online events)
 * 2. Verificación agresiva con Electron cuando se reconecta
 * 3. Latido de fondo para detectar caídas silenciosas
 */

import { useState, useEffect, useRef } from "react";
import API_CONFIG from "../config/apiEndPoint";

const HEARTBEAT_INTERVAL = 3000; // 3 segundos (latido de fondo)
const ELECTRON_VERIFY_TIMEOUT = 5000; // Timeout para verificación Electron

/**
 * Verifica conectividad a Internet haciendo ping a un servidor confiable
 */
const verifyInternetConnectivity = async () => {
  try {
    // Si estamos en Electron, usar la API nativa para verificar
    if (window.electronAPI && window.electronAPI.isElectron) {
      // Intentar verificar con Electron
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        ELECTRON_VERIFY_TIMEOUT,
      );

      try {
        const response = await fetch("https://www.google.com/favicon.ico", {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-cache",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return true;
      } catch (error) {
        clearTimeout(timeoutId);
        return false;
      }
    } else {
      // En navegador, usar múltiples endpoints
      const endpoints = [
        "https://www.google.com/favicon.ico",
        "https://www.cloudflare.com/favicon.ico",
      ];

      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          await fetch(endpoint, {
            method: "HEAD",
            mode: "no-cors",
            cache: "no-cache",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return true;
        } catch (error) {
          // Continuar con el siguiente endpoint
          continue;
        }
      }

      return false;
    }
  } catch (error) {
    console.error("Error verificando conectividad:", error);
    return false;
  }
};

/**
 * Verifica conectividad a la base de datos mediante el servidor
 */
const verifyDatabaseConnectivity = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Ir directo a la raíz ya que /api/health no existe
    const response = await fetch(`${API_CONFIG.BASE_URL}`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    // Intentar parsear JSON si la respuesta lo contiene
    try {
      const data = await response.json();
      return (
        data.status === "OK" ||
        data.success === true ||
        data.database === "connected"
      );
    } catch {
      // Si no es JSON válido pero response.ok es true, asumir que está conectado
      return true;
    }
  } catch (error) {
    console.error("Error verificando base de datos:", error);
    return false;
  }
};

/**
 * Hook principal de conectividad
 */
export const useConnectivity = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInternetConnected, setIsInternetConnected] = useState(
    navigator.onLine,
  );
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());

  const heartbeatRef = useRef(null);
  const isVerifyingRef = useRef(false);

  /**
   * Verificar conectividad completa (Internet + DB)
   */
  const checkConnectivity = async () => {
    if (isVerifyingRef.current) return;

    isVerifyingRef.current = true;

    try {
      // 1. Verificar Internet
      const internetStatus = await verifyInternetConnectivity();
      setIsInternetConnected(internetStatus);

      // 2. Si hay internet, verificar DB
      if (internetStatus) {
        const dbStatus = await verifyDatabaseConnectivity();
        setIsDatabaseConnected(dbStatus);
      } else {
        // Sin internet, asumir que DB tampoco está disponible
        setIsDatabaseConnected(false);
      }

      setLastChecked(new Date());
    } catch (error) {
      console.error("Error en verificación de conectividad:", error);
      setIsInternetConnected(false);
      setIsDatabaseConnected(false);
    } finally {
      isVerifyingRef.current = false;
    }
  };

  useEffect(() => {
    // 1. DETECCIÓN INSTANTÁNEA NATIVA
    const handleOnline = () => {
      console.log("🟢 Evento ONLINE detectado");
      setIsOnline(true);

      // 2. VERIFICACIÓN AGRESIVA cuando se reconecta
      // No esperar al heartbeat, verificar inmediatamente
      checkConnectivity();
    };

    const handleOffline = () => {
      console.log("🔴 Evento OFFLINE detectado");
      setIsOnline(false);
      setIsInternetConnected(false);
      setIsDatabaseConnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 3. LATIDO DE FONDO (heartbeat)
    // Mantener intervalo corto para detectar caídas silenciosas
    checkConnectivity(); // Verificar inmediatamente al montar

    heartbeatRef.current = setInterval(() => {
      checkConnectivity();
    }, HEARTBEAT_INTERVAL);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  return {
    isOnline, // Estado nativo del navegador
    isInternetConnected, // Conectividad real verificada
    isDatabaseConnected, // Estado de la base de datos
    lastChecked, // Última vez que se verificó
    refresh: checkConnectivity, // Función para forzar verificación manual
  };
};

export default useConnectivity;
