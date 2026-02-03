import { useState, useRef, useEffect, useCallback } from "react";

const MAX_RECONNECT_ATTEMPTS = 5;

export default function useBiometricWebSocket(onMessage) {
  const [connected, setConnected] = useState(false);
  const [readerConnected, setReaderConnected] = useState(false);
  const [currentOperation, setCurrentOperation] = useState("None");
  const [status, setStatus] = useState("disconnected");
  const [messages, setMessages] = useState([]);
  const [savingToDatabase, setSavingToDatabase] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const addMessage = useCallback((message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString("es-MX");
    setMessages((prev) =>
      [
        {
          id: Date.now() + Math.random(),
          type,
          message,
          timestamp,
        },
        ...prev,
      ].slice(0, 50)
    );
  }, []);

  const sendCommand = useCallback((command, params = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = { command, ...params };
      console.log("📤 Enviando comando:", payload);
      wsRef.current.send(JSON.stringify(payload));
    } else {
      addMessage("❌ No conectado al servidor", "error");
    }
  }, [addMessage]);

  const connectToServer = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      addMessage("🔌 Conectando al servidor...", "info");
      const ws = new WebSocket("ws://localhost:8787/");
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setStatus("connected");
        reconnectAttemptsRef.current = 0;
        addMessage("✅ Conectado al servidor biométrico", "success");
        ws.send(JSON.stringify({ command: "getStatus" }));
      };

      ws.onclose = () => {
        setConnected(false);
        setReaderConnected(false);
        setStatus("disconnected");
        setCurrentOperation("None");
        addMessage("❌ Desconectado del servidor", "warning");

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            10000
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            addMessage(
              `🔄 Reintentando conexión (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`,
              "info"
            );
            connectToServer();
          }, delay);
        } else {
          addMessage("❌ Máximo de reintentos alcanzado", "error");
        }
      };

      ws.onerror = (error) => {
        addMessage("❌ Error de conexión WebSocket", "error");
        console.error("WebSocket error:", error);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 Mensaje recibido:", data);

          // Manejar mensajes comunes
          if (data.type === "status") {
            setStatus(data.status);
            if (data.status === "enrolling") {
              setCurrentOperation("Enrollment");
            } else if (data.status === "ready" || data.status === "connected") {
              setCurrentOperation("None");
            }
            addMessage(`ℹ️ ${data.message}`, "info");
          } else if (data.type === "systemStatus") {
            setReaderConnected(data.readerConnected);
            setCurrentOperation(data.currentOperation);
            if (data.readerConnected) {
              addMessage("✅ Lector de huellas conectado", "success");
            } else {
              addMessage("⚠️ Sin lector de huellas detectado", "warning");
            }
          } else if (data.type === "error") {
            addMessage(`❌ Error: ${data.message}`, "error");
            setCurrentOperation("None");
            setStatus("error");
          } else if (data.type === "cacheReloaded") {
            addMessage(`✅ Caché actualizado: ${data.templatesCount} huellas`, "success");
          }

          // Delegar al componente especifico
          if (onMessageRef.current) {
            onMessageRef.current(data);
          }
        } catch (error) {
          console.error("Error parsing message:", error);
          addMessage("❌ Error al procesar mensaje del servidor", "error");
        }
      };
    } catch (error) {
      addMessage("❌ Error conectando al servidor", "error");
      console.error("Connection error:", error);
    }
  }, [addMessage]);

  const stopCapture = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ command: "stopCapture" }));
      } catch (e) {
        console.warn("Error enviando cancelación:", e);
      }
    }
  }, []);

  // Conectar al montar, limpiar al desmontar
  useEffect(() => {
    connectToServer();

    return () => {
      stopCapture();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    connected,
    readerConnected,
    currentOperation,
    setCurrentOperation,
    status,
    setStatus,
    messages,
    savingToDatabase,
    setSavingToDatabase,
    sendCommand,
    addMessage,
    connectToServer,
    stopCapture,
  };
}
