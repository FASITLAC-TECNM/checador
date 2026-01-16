import { useState, useEffect, useRef } from "react";
import {
  Fingerprint,
  Wifi,
  WifiOff,
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
  idEmpleado = null, // ID del empleado desde tu sistema (null para modo manual)
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

  const [inputIdEmpleado, setInputIdEmpleado] = useState(""); // ID del empleado manual
  const [messages, setMessages] = useState([]);
  const [savingToDatabase, setSavingToDatabase] = useState(false);
  const [lastEnrollmentData, setLastEnrollmentData] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const inputIdEmpleadoRef = useRef(""); // Ref para mantener el valor actualizado
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Mantener la ref sincronizada con el state
  useEffect(() => {
    inputIdEmpleadoRef.current = inputIdEmpleado;
  }, [inputIdEmpleado]);

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

          // DEBUG: Ver qué recibimos del middleware
          console.log("📨 DEBUG captureComplete recibido:");
          console.log("   - data.userId:", data.userId);
          console.log("   - data.templateBase64 existe:", !!data.templateBase64);
          console.log("   - data.templateBase64 length:", data.templateBase64?.length);
          console.log("   - data completo:", data);

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
      // Usar la ref para obtener el valor actualizado (evita problemas de closure)
      const inputValue = inputIdEmpleadoRef.current;
      const empleadoId = idEmpleado || parseInt(inputValue);

      // DEBUG: Log de valores
      console.log("🔍 DEBUG guardarHuellaEnBaseDatos:");
      console.log("   - idEmpleado (prop):", idEmpleado);
      console.log("   - inputIdEmpleadoRef.current:", inputValue);
      console.log("   - empleadoId (calculado):", empleadoId);
      console.log("   - templateBase64 existe:", !!templateBase64);
      console.log("   - templateBase64 length:", templateBase64?.length);

      if (!empleadoId || isNaN(empleadoId)) {
        addMessage("❌ No hay ID de empleado configurado", "error");
        console.error("❌ Error: ID de empleado inválido", {
          empleadoId,
          idEmpleado,
          inputValue
        });
        return;
      }

      if (!templateBase64) {
        addMessage("❌ No se recibió el template de la huella", "error");
        console.error("❌ Error: Template no recibido");
        return;
      }

      setSavingToDatabase(true);
      addMessage("💾 Guardando huella en base de datos...", "info");

      try {
        const result = await registrarHuella(
          empleadoId,
          templateBase64,
          userId
        );

        if (result.success) {
          addMessage("✅ Huella guardada en PostgreSQL", "success");
          addMessage(`📊 Tamaño: ${result.data.template_size} bytes`, "info");

          if (onEnrollmentSuccess) {
            onEnrollmentSuccess({
              userId: userId,
              idEmpleado: empleadoId,
              idCredencial: result.data.id_credencial,
              timestamp: result.data.timestamp,
            });
          }

          setInputIdEmpleado("");
          inputIdEmpleadoRef.current = ""; // Limpiar también la ref
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
      const empleadoId = idEmpleado || parseInt(inputIdEmpleado);

      if (!empleadoId || isNaN(empleadoId)) {
        addMessage("⚠️ Ingrese un ID de empleado válido", "warning");
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

    // Generar automáticamente el User ID basado en el ID del empleado
    let userId;
    if (mode === "auth") {
      userId = `auth_${Date.now()}`;
    } else {
      const empleadoId = idEmpleado || parseInt(inputIdEmpleado);
      userId = `emp_${empleadoId}`;
    }

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 p-2 rounded-lg">
                <Fingerprint className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {mode === "auth"
                    ? "Autenticación por Huella"
                    : "Registrar Huella Digital"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                  connected
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {connected ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                <span>{connected ? "Conectado" : "Desconectado"}</span>
              </div>

              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Reader Status */}
            <div
              className={`flex items-center justify-between p-4 rounded-xl ${
                readerConnected
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <Fingerprint
                  className={`w-6 h-6 ${
                    readerConnected
                      ? "text-green-600 dark:text-green-400"
                      : "text-yellow-600 dark:text-yellow-400"
                  }`}
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Lector de Huellas
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {readerConnected ? "Conectado y listo" : "Desconectado"}
                  </p>
                </div>
              </div>
              {!connected && (
                <button
                  onClick={connectToServer}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Conectar
                </button>
              )}
            </div>

            {/* Enrollment / Auth Section */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {mode === "auth"
                  ? "Iniciar Sesión con Huella"
                  : "Registrar Nueva Huella"}
              </h2>

              <div className="space-y-4">
                {mode === "enroll" && (
                  <>
                    {!idEmpleado && (
                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                          ID del Empleado <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={inputIdEmpleado}
                          onChange={(e) => setInputIdEmpleado(e.target.value)}
                          placeholder="Ej: 1, 2, 3..."
                          disabled={isProcessing}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                          autoFocus
                        />
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                          La huella se guardará para este empleado
                        </p>
                      </div>
                    )}

                    {idEmpleado && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                        <p className="text-gray-900 dark:text-white font-medium">
                          Empleado: <strong className="text-blue-600 dark:text-blue-400">#{idEmpleado}</strong>
                        </p>
                      </div>
                    )}
                  </>
                )}

                {mode === "auth" && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
                    <Fingerprint className="w-16 h-16 mx-auto mb-3 text-blue-600 dark:text-blue-400" />
                    <p className="text-gray-900 dark:text-white font-medium mb-1">
                      Coloca tu dedo en el lector
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      El sistema te identificará automáticamente
                    </p>
                  </div>
                )}

                {currentOperation === "Enrollment" && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="mb-3">
                      <div className="flex justify-between text-gray-900 dark:text-white text-sm mb-2">
                        <span>
                          Muestras: {enrollProgress.collected}/{enrollProgress.required}
                        </span>
                        <span>{enrollProgress.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${enrollProgress.percentage}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-center text-sm">
                      Coloque el mismo dedo en el lector
                    </p>
                  </div>
                )}

                {savingToDatabase && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                    <p className="text-gray-900 dark:text-white text-center text-sm flex items-center justify-center gap-2">
                      <Database className="w-4 h-4" />
                      Guardando en base de datos...
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
                        (mode === "enroll" && !idEmpleado && !inputIdEmpleado)
                      }
                      className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
                      className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Cancelar
                    </button>
                  )}
                </div>

                {mode === "enroll" && !idEmpleado && !inputIdEmpleado && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm text-center">
                      Ingrese el ID del empleado para continuar
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Last Enrollment Result */}
            {lastEnrollmentData && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <p className="text-green-800 dark:text-green-300 font-bold">
                      Huella Registrada Exitosamente
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">
                      Empleado ID: <strong>{idEmpleado || inputIdEmpleado}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Logs Panel - Minimalist */}
            {messages.length > 0 && (
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Registro de Eventos
                  </h3>
                  <button
                    onClick={() => setMessages([])}
                    className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Limpiar
                  </button>
                </div>

                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {messages.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="text-xs text-gray-600 dark:text-gray-400 flex gap-2"
                    >
                      <span className="text-gray-400">{log.timestamp}</span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
