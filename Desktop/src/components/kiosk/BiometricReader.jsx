import { useState, useEffect, useRef } from "react";
import {
  Fingerprint,
  Wifi,
  WifiOff,
  Square,
  X,
  AlertCircle,
  UserPlus,
  Database,
  CheckCircle,
  LogIn,
} from "lucide-react";
import {
  identificarPorHuella,
  registrarHuella,
  guardarSesion,
} from "../../services/biometricAuthService";

export default function BiometricReader({
  isOpen = false,
  onClose,
  onEnrollmentSuccess,
  onAuthSuccess, // Nuevo: Callback cuando se autentica exitosamente
  idEmpleado = 1, // ID del empleado desde tu sistema
  mode = "auth", // "enroll" para registro, "auth" para autenticación
}) {
  if (!isOpen) return null;

  const [connected, setConnected] = useState(false);
  const [readerConnected, setReaderConnected] = useState(false);
  const [currentOperation, setCurrentOperation] = useState("None");
  const [status, setStatus] = useState("disconnected");
  const [statusMessage, setStatusMessage] = useState("");

  const [enrollProgress, setEnrollProgress] = useState({
    collected: 0,
    required: 4,
    percentage: 0,
  });

  const [newUserId, setNewUserId] = useState("");
  const [messages, setMessages] = useState([]);
  const [savingToDatabase, setSavingToDatabase] = useState(false);
  const [lastEnrollmentData, setLastEnrollmentData] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // DEBUG: Función para obtener la huella del empleado ID 1
  const debugObtenerHuellaEmpleado1 = async () => {
    try {
      console.log("\n🔍 DEBUG: Obteniendo huella del empleado ID 1 desde BD...");
      const API_URL = "https://9dm7dqf9-3001.usw3.devtunnels.ms/api";

      const response = await fetch(`${API_URL}/biometric/template/1`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("❌ Error al obtener template:", response.status);
        return;
      }

      const result = await response.json();
      console.log("\n📦 HUELLA DEL EMPLEADO ID 1 EN LA BD:");
      console.log("   - ID Empleado:", result.data.id_empleado);
      console.log("   - Tamaño:", result.data.size_bytes, "bytes");
      console.log("   - Template (Base64 - primeros 100 chars):", result.data.template_base64.substring(0, 100) + "...");
      console.log("   - Template completo (Base64):", result.data.template_base64);

      // Convertir a BYTEA para mostrar
      const binaryString = atob(result.data.template_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const hexString = Array.from(bytes.slice(0, 50))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      console.log("   - Primeros 50 bytes (BYTEA hex): \\\\x" + hexString);
      console.log("\n");
    } catch (error) {
      console.error("❌ Error en debug de huella empleado 1:", error);
    }
  };

  useEffect(() => {
    connectToServer();

    // DEBUG: Obtener y mostrar la huella del empleado ID 1
    if (mode === "auth") {
      debugObtenerHuellaEmpleado1();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectToServer = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      addMessage("🔌 Conectando al servidor...", "info");
      const ws = new WebSocket("ws://localhost:8787/");
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setStatus("connected");
        reconnectAttemptsRef.current = 0;
        addMessage("✅ Conectado al servidor biométrico", "success");
        sendCommand("getStatus");
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
          handleServerMessage(data);
        } catch (error) {
          console.error("Error parsing message:", error);
          addMessage("❌ Error al procesar mensaje del servidor", "error");
        }
      };
    } catch (error) {
      addMessage("❌ Error conectando al servidor", "error");
      console.error("Connection error:", error);
    }
  };

  const handleServerMessage = (data) => {
    console.log("📨 Mensaje recibido:", data);

    switch (data.type) {
      case "status":
        setStatus(data.status);
        setStatusMessage(data.message);

        if (data.status === "enrolling") {
          setCurrentOperation("Enrollment");
        } else if (data.status === "ready" || data.status === "connected") {
          setCurrentOperation("None");
        }

        addMessage(`ℹ️ ${data.message}`, "info");
        break;

      case "systemStatus":
        setReaderConnected(data.readerConnected);
        setCurrentOperation(data.currentOperation);

        if (data.readerConnected) {
          addMessage("✅ Lector de huellas conectado", "success");
        } else {
          addMessage("⚠️ Sin lector de huellas detectado", "warning");
        }
        break;

      case "enrollProgress":
        setEnrollProgress({
          collected: data.samplesCollected,
          required: data.samplesRequired,
          percentage: data.percentage,
        });
        addMessage(
          `📊 Progreso: ${data.samplesCollected}/${data.samplesRequired} (${data.percentage}%)`,
          "info"
        );
        break;

      case "captureComplete":
        if (data.result === "enrollmentSuccess") {
          addMessage(`✅ Captura completada: ${data.userId}`, "success");

          // Guardar datos del enrollment para enviarlos al backend
          setLastEnrollmentData({
            userId: data.userId,
            templateBase64: data.templateBase64, // El middleware debe enviar esto
            timestamp: data.timestamp,
          });

          // Si el middleware NO envió el template, solicitarlo vía IPC de Electron
          if (!data.templateBase64 && window.electronAPI) {
            addMessage("📄 Leyendo template desde archivo...", "info");

            // Solicitar a Electron que lea el archivo .fpt
            window.electronAPI.readFingerprintTemplate(data.userId).then((templateBase64) => {
              if (templateBase64) {
                addMessage("✅ Template cargado desde archivo", "success");
                guardarHuellaEnBaseDatos(data.userId, templateBase64);
              } else {
                addMessage("❌ No se pudo leer el template desde archivo", "error");
              }
            }).catch((error) => {
              console.error("Error leyendo template:", error);
              addMessage(`❌ Error leyendo template: ${error.message}`, "error");
            });
          } else if (data.templateBase64) {
            // Si el middleware SÍ envió el template directamente
            guardarHuellaEnBaseDatos(data.userId, data.templateBase64);
          } else {
            addMessage("⚠️ Template no disponible", "warning");
          }

          setEnrollProgress({ collected: 0, required: 4, percentage: 0 });
          setCurrentOperation("None");
          setStatus("ready");
        }
        break;

      case "error":
        addMessage(`❌ Error: ${data.message}`, "error");
        setCurrentOperation("None");
        setEnrollProgress({ collected: 0, required: 4, percentage: 0 });
        setStatus("error");
        break;

      default:
        console.log("Tipo de mensaje desconocido:", data.type);
    }
  };

  const guardarHuellaEnBaseDatos = async (userId, templateBase64) => {
    if (mode === "enroll") {
      // Modo Registro: Guardar huella para un empleado específico
      if (!idEmpleado) {
        addMessage("❌ No hay ID de empleado configurado", "error");
        return;
      }

      if (!templateBase64) {
        addMessage("❌ No se recibió el template de la huella", "error");
        return;
      }

      setSavingToDatabase(true);
      addMessage("💾 Guardando huella en base de datos...", "info");

      try {
        const result = await registrarHuella(
          idEmpleado,
          templateBase64,
          userId
        );

        if (result.success) {
          addMessage("✅ Huella guardada en PostgreSQL", "success");
          addMessage(`📊 Tamaño: ${result.data.template_size} bytes`, "info");

          if (onEnrollmentSuccess) {
            onEnrollmentSuccess({
              userId: userId,
              idEmpleado: idEmpleado,
              idCredencial: result.data.id_credencial,
              timestamp: result.data.timestamp,
            });
          }

          setNewUserId("");
        } else {
          addMessage(`❌ Error DB: ${result.error}`, "error");
        }
      } catch (error) {
        console.error("Error guardando en DB:", error);
        addMessage(
          `❌ Error conectando con backend: ${error.message}`,
          "error"
        );
      } finally {
        setSavingToDatabase(false);
      }
    } else if (mode === "auth") {
      // Modo Autenticación: Identificar usuario por huella
      if (!templateBase64) {
        addMessage("❌ No se recibió el template de la huella", "error");
        return;
      }

      // DEBUG: Mostrar el template capturado
      console.log("\n📸 TEMPLATE CAPTURADO DEL LECTOR:");
      console.log("   - Tamaño:", atob(templateBase64).length, "bytes");
      console.log("   - Template (Base64 - primeros 100 chars):", templateBase64.substring(0, 100) + "...");
      console.log("   - Template completo (Base64):", templateBase64);

      // Convertir a BYTEA para mostrar
      const binaryString = atob(templateBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const hexString = Array.from(bytes.slice(0, 50))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      console.log("   - Primeros 50 bytes (BYTEA hex): \\\\x" + hexString);
      console.log("\n");

      setSavingToDatabase(true);
      addMessage("🔍 Identificando usuario por huella...", "info");

      try {
        const result = await identificarPorHuella(templateBase64);

        if (result.success) {
          addMessage(
            `✅ Usuario identificado: ${result.usuario.nombre}`,
            "success"
          );
          addMessage(`🎯 Precisión: ${result.matchScore}%`, "info");

          // Guardar sesión
          guardarSesion(result.usuario);

          // Callback de autenticación exitosa
          if (onAuthSuccess) {
            onAuthSuccess(result.usuario);
          }

          // Cerrar el modal después de 1.5 segundos
          setTimeout(() => {
            if (onClose) onClose();
          }, 1500);
        } else {
          addMessage(`❌ ${result.error}`, "error");
        }
      } catch (error) {
        console.error("Error identificando usuario:", error);
        addMessage(`❌ Error de autenticación: ${error.message}`, "error");
      } finally {
        setSavingToDatabase(false);
      }
    }
  };

  const sendCommand = (command, params = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        command,
        ...params,
      };
      console.log("📤 Enviando comando:", payload);
      wsRef.current.send(JSON.stringify(payload));
    } else {
      addMessage("❌ No conectado al servidor", "error");
    }
  };

  const addMessage = (message, type = "info") => {
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
  };

  const startEnrollment = () => {
    if (mode === "enroll") {
      // Validaciones para modo registro
      if (!newUserId.trim()) {
        addMessage("⚠️ Ingrese un ID de usuario", "warning");
        return;
      }

      if (!idEmpleado) {
        addMessage("⚠️ No se ha configurado el ID del empleado", "warning");
        return;
      }
    }

    if (currentOperation !== "None") {
      addMessage("⚠️ Ya hay una operación en curso", "warning");
      return;
    }

    setLastEnrollmentData(null);
    setEnrollProgress({ collected: 0, required: 4, percentage: 0 });
    setCurrentOperation("Enrollment");

    // En modo auth, usar un ID temporal
    const userId = mode === "auth" ? `auth_${Date.now()}` : newUserId.trim();
    sendCommand("startEnrollment", { userId });
  };

  const cancelEnrollment = () => {
    sendCommand("cancelEnrollment");
    setEnrollProgress({ collected: 0, required: 4, percentage: 0 });
    setCurrentOperation("None");
    addMessage("⏹️ Enrollment cancelado", "warning");
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;
    setConnected(false);
    setReaderConnected(false);
    setCurrentOperation("None");
    addMessage("👋 Desconectado manualmente", "info");
  };

  const refreshStatus = () => {
    sendCommand("getStatus");
    addMessage("🔄 Refrescando estado...", "info");
  };

  const isProcessing = currentOperation !== "None" || savingToDatabase;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500 p-3 rounded-xl">
                  <Fingerprint className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {mode === "auth"
                      ? "Autenticación por Huella"
                      : "Registro de Huella Digital"}
                  </h1>
                  <p className="text-blue-200 text-sm">
                    BiometricMiddleware v1.0 + PostgreSQL
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center gap-2 ${
                    connected ? "text-green-500" : "text-gray-400"
                  }`}
                >
                  {connected ? (
                    <Wifi className="w-5 h-5" />
                  ) : (
                    <WifiOff className="w-5 h-5" />
                  )}
                  <span className="text-sm font-medium capitalize text-white">
                    {connected ? "Conectado" : "Desconectado"}
                  </span>
                </div>

                {connected && (
                  <button
                    onClick={refreshStatus}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Refrescar
                  </button>
                )}

                {connected ? (
                  <button
                    onClick={disconnect}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Desconectar
                  </button>
                ) : (
                  <button
                    onClick={connectToServer}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Conectar
                  </button>
                )}

                {onClose && (
                  <button
                    onClick={onClose}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ID Empleado Info / Auth Mode Info */}
          {mode === "enroll" && idEmpleado && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-white font-medium">
                    Empleado ID: <strong>{idEmpleado}</strong>
                  </p>
                  <p className="text-green-200 text-sm">
                    La huella se guardará automáticamente en PostgreSQL
                  </p>
                </div>
              </div>
            </div>
          )}

          {mode === "auth" && (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <LogIn className="w-6 h-6 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Modo Autenticación</p>
                  <p className="text-blue-200 text-sm">
                    Coloca tu dedo en el lector para iniciar sesión
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Banner */}
          {statusMessage && (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-blue-400" />
                <p className="text-white font-medium">{statusMessage}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Reader Status */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">
                  📡 Estado del Sistema
                </h2>

                <div className="grid grid-cols-3 gap-4">
                  <div
                    className={`rounded-lg p-4 ${
                      readerConnected
                        ? "bg-green-500/20 border border-green-500/50"
                        : "bg-yellow-500/20 border border-yellow-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Fingerprint
                        className={`w-6 h-6 ${
                          readerConnected ? "text-green-400" : "text-yellow-400"
                        }`}
                      />
                      <div>
                        <p className="text-white font-medium text-sm">Lector</p>
                        <p className="text-white/70 text-xs">
                          {readerConnected ? "Conectado" : "Desconectado"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 flex items-center justify-center text-blue-400 font-bold text-lg`}
                      >
                        {isProcessing ? "⚡" : "⏸"}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Estado</p>
                        <p className="text-white/70 text-xs">
                          {isProcessing ? "Procesando" : "Esperando"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`rounded-lg p-4 ${
                      savingToDatabase
                        ? "bg-purple-500/20 border border-purple-500/50"
                        : "bg-gray-500/20 border border-gray-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Database
                        className={`w-6 h-6 ${
                          savingToDatabase ? "text-purple-400" : "text-gray-400"
                        }`}
                      />
                      <div>
                        <p className="text-white font-medium text-sm">
                          Base Datos
                        </p>
                        <p className="text-white/70 text-xs">
                          {savingToDatabase ? "Guardando..." : "Esperando"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enrollment / Auth Section */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {mode === "auth"
                    ? "🔐 Iniciar Sesión con Huella"
                    : "📝 Registrar Nueva Huella"}
                </h2>

                <div className="space-y-4">
                  {mode === "enroll" && (
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        User ID (para el middleware):
                      </label>
                      <input
                        type="text"
                        value={newUserId}
                        onChange={(e) => setNewUserId(e.target.value)}
                        placeholder={
                          idEmpleado ? `emp_${idEmpleado}` : "Ej: empleado001"
                        }
                        disabled={isProcessing}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      />
                      <p className="text-white/60 text-xs mt-1">
                        Este ID se usa internamente en el middleware biométrico
                      </p>
                    </div>
                  )}

                  {mode === "auth" && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                      <Fingerprint className="w-16 h-16 mx-auto mb-3 text-blue-400" />
                      <p className="text-white font-medium mb-1">
                        Coloca tu dedo en el lector
                      </p>
                      <p className="text-white/70 text-sm">
                        El sistema te identificará automáticamente
                      </p>
                    </div>
                  )}

                  {currentOperation === "Enrollment" && (
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                      <div className="mb-3">
                        <div className="flex justify-between text-white text-sm mb-2">
                          <span>
                            Muestras: {enrollProgress.collected}/
                            {enrollProgress.required}
                          </span>
                          <span>{enrollProgress.percentage}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${enrollProgress.percentage}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-white text-center">
                        <span className="inline-block mr-2">👆</span>
                        Coloque el mismo dedo en el lector
                      </p>
                    </div>
                  )}

                  {savingToDatabase && (
                    <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-4">
                      <p className="text-white text-center">
                        <Database className="w-5 h-5 inline mr-2" />
                        Guardando en PostgreSQL...
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {currentOperation !== "Enrollment" ? (
                      <button
                        onClick={startEnrollment}
                        disabled={
                          !connected ||
                          !readerConnected ||
                          isProcessing ||
                          (mode === "enroll" && !idEmpleado)
                        }
                        className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {mode === "auth" ? (
                          <>
                            <LogIn className="w-5 h-5" />
                            Iniciar Autenticación
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-5 h-5" />
                            Iniciar Registro
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={cancelEnrollment}
                        className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Square className="w-5 h-5" />
                        Cancelar
                      </button>
                    )}
                  </div>

                  {mode === "enroll" && !idEmpleado && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                      <p className="text-red-200 text-sm text-center">
                        ⚠️ Falta configurar el ID del empleado en el componente
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Last Enrollment Result */}
              {lastEnrollmentData && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    ✅ Resultado del Registro
                  </h2>
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                      <div className="flex-1">
                        <p className="text-green-300 font-bold text-lg">
                          Huella Registrada
                        </p>
                        <p className="text-white text-sm mt-1">
                          User ID: <strong>{lastEnrollmentData.userId}</strong>
                        </p>
                        <p className="text-white/70 text-sm">
                          Empleado: <strong>{idEmpleado}</strong>
                        </p>
                        <p className="text-white/70 text-xs mt-1">
                          {new Date(
                            lastEnrollmentData.timestamp
                          ).toLocaleString("es-MX")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Logs Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">
                    📋 Eventos
                  </h2>
                  <button
                    onClick={() => setMessages([])}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Limpiar
                  </button>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">
                      Sin eventos registrados
                    </p>
                  ) : (
                    messages.map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-lg text-sm ${
                          log.type === "success"
                            ? "bg-green-500/20 border border-green-500/50"
                            : log.type === "error"
                            ? "bg-red-500/20 border border-red-500/50"
                            : log.type === "warning"
                            ? "bg-yellow-500/20 border border-yellow-500/50"
                            : "bg-blue-500/20 border border-blue-500/50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-gray-300 text-xs">
                            {log.timestamp}
                          </span>
                        </div>
                        <p className="text-white mt-1">{log.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
