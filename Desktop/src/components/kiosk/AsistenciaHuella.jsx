import { useState, useEffect, useRef } from "react";
import {
  Fingerprint,
  Wifi,
  WifiOff,
  X,
  CheckCircle,
  XCircle,
  Clock,
  LogIn,
  Timer,
  Loader2,
} from "lucide-react";
import { guardarSesion } from "../../services/biometricAuthService";

export default function AsistenciaHuella({ isOpen = false, onClose, onSuccess, onLoginRequest }) {
  if (!isOpen) return null;

  const [connected, setConnected] = useState(false);
  const [readerConnected, setReaderConnected] = useState(false);
  const [currentOperation, setCurrentOperation] = useState("None");
  const [status, setStatus] = useState("disconnected");
  const [statusMessage, setStatusMessage] = useState("");
  const [processingAttendance, setProcessingAttendance] = useState(false);
  const [processingLogin, setProcessingLogin] = useState(false);
  const [result, setResult] = useState(null); // { success: boolean, message: string, empleado?: object }
  const [countdown, setCountdown] = useState(6); // Contador de 6 segundos

  const [messages, setMessages] = useState([]);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const hasStartedIdentification = useRef(false);
  const countdownIntervalRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Mantener la ref actualizada
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    connectToServer();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Countdown para cerrar automáticamente después de registro exitoso
  useEffect(() => {
    if (result?.success) {
      // Limpiar cualquier intervalo anterior
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      setCountdown(6);

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
            // Cerrar después de mostrar 0
            setTimeout(() => {
              if (onCloseRef.current) onCloseRef.current();
            }, 500);
            return 0;
          }
          return newValue;
        });
      }, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [result?.success]);

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

  // Registrar asistencia después de identificación exitosa (SIMULADO)
  const registrarAsistencia = async (empleadoId, matchScore) => {
    setProcessingAttendance(true);
    addMessage("📝 Registrando asistencia...", "info");

    try {
      // Simular delay de procesamiento
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Obtener hora actual
      const now = new Date();
      const horaActual = now.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Determinar si es entrada o salida basado en la hora
      const hora = now.getHours();
      const tipoMovimiento = hora < 14 ? "ENTRADA" : "SALIDA";

      // Datos simulados del empleado
      const empleadoSimulado = {
        id: empleadoId,
        nombre: `Empleado ${empleadoId}`,
        email: `${empleadoId.toLowerCase()}@empresa.com`,
      };

      addMessage("✅ Asistencia registrada correctamente", "success");

      setResult({
        success: true,
        message: "Asistencia registrada",
        empleado: empleadoSimulado,
        empleadoId: empleadoId, // Guardar el ID para usarlo en el login
        tipoMovimiento: tipoMovimiento,
        hora: horaActual,
      });

      // Callback de éxito
      if (onSuccess) {
        onSuccess({
          empleadoId,
          matchScore,
          empleado: empleadoSimulado,
          tipo_movimiento: tipoMovimiento,
          hora: horaActual,
        });
      }

      // El countdown se encarga de cerrar el modal automáticamente

    } catch (error) {
      console.error("Error registrando asistencia:", error);
      addMessage(`❌ Error: ${error.message}`, "error");

      setResult({
        success: false,
        message: error.message,
      });
    } finally {
      setProcessingAttendance(false);
      setCurrentOperation("None");
      setStatus("ready");
    }
  };

  // Procesar login biométrico para obtener datos completos del empleado
  const procesarLoginBiometrico = async (empleadoId) => {
    setProcessingLogin(true);

    // Detener el countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    try {
      const API_BASE = "https://9dm7dqf9-3002.usw3.devtunnels.ms/api";

      // Llamar al endpoint de autenticación biométrica para obtener datos completos
      const authResponse = await fetch(`${API_BASE}/auth/biometric`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ empleado_id: empleadoId }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al autenticar");
      }

      const authResult = await authResponse.json();

      if (!authResult.success) {
        throw new Error(authResult.message || "Error en autenticación");
      }

      // Extraer datos completos de la respuesta
      const { usuario, roles, permisos, esAdmin, token } = authResult.data;
      console.log("👤 Usuario autenticado:", usuario);
      console.log("📋 Roles:", roles);

      // Guardar token en localStorage
      if (token) {
        localStorage.setItem('auth_token', token);
        console.log("🔑 Token guardado");
      }

      // Preparar datos completos del usuario para la sesión
      const usuarioCompleto = {
        ...usuario,
        roles,
        permisos,
        esAdmin,
        token,
        metodoAutenticacion: "HUELLA",
      };

      // Guardar sesión
      guardarSesion(usuarioCompleto);

      // Cerrar modal
      if (onClose) onClose();

      // Callback de login exitoso con datos completos
      if (onLoginRequest) {
        onLoginRequest(usuarioCompleto);
      }

    } catch (error) {
      console.error("Error procesando login biométrico:", error);
      addMessage(`❌ Error: ${error.message}`, "error");
      // Reiniciar countdown si hay error
      setCountdown(6);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
            setTimeout(() => {
              if (onCloseRef.current) onCloseRef.current();
            }, 500);
            return 0;
          }
          return newValue;
        });
      }, 1000);
    } finally {
      setProcessingLogin(false);
    }
  };

  const handleServerMessage = (data) => {
    console.log("📨 Mensaje recibido:", data);

    switch (data.type) {
      case "status":
        setStatus(data.status);
        setStatusMessage(data.message);

        if (data.status === "ready" || data.status === "connected") {
          setCurrentOperation("None");
        }

        addMessage(`ℹ️ ${data.message}`, "info");
        break;

      case "systemStatus":
        setReaderConnected(data.readerConnected);
        setCurrentOperation(data.currentOperation);

        if (data.readerConnected) {
          addMessage("✅ Lector de huellas conectado", "success");
          // Iniciar identificación automáticamente cuando el lector está listo
          if (!hasStartedIdentification.current && data.currentOperation === "None") {
            hasStartedIdentification.current = true;
            setTimeout(() => {
              startIdentification();
            }, 500);
          }
        } else {
          addMessage("⚠️ Sin lector de huellas detectado", "warning");
        }
        break;

      case "captureComplete":
        console.log("📨 captureComplete recibido:", data);

        if (data.result === "identificationSuccess") {
          // Huella identificada - registrar asistencia
          addMessage(`✅ Huella reconocida: ${data.userId}`, "success");
          addMessage(`🎯 Precisión: ${data.matchScore || 100}%`, "info");

          // Extraer el ID del empleado del userId (formato: emp_EMP00003)
          const idEmpleadoMatch = data.userId?.match(/emp_([A-Z0-9]+)/i);
          if (idEmpleadoMatch) {
            const empleadoId = idEmpleadoMatch[1];
            registrarAsistencia(empleadoId, data.matchScore || 100);
          } else {
            addMessage("❌ No se pudo extraer el ID del empleado", "error");
            setResult({
              success: false,
              message: "Error identificando empleado",
            });
            setCurrentOperation("None");
            setStatus("ready");
          }

        } else if (data.result === "identificationFailed") {
          // Huella no reconocida
          addMessage("❌ Huella no reconocida en el sistema", "error");
          setResult({
            success: false,
            message: "Huella no reconocida",
          });
          setCurrentOperation("None");
          setStatus("ready");
        }
        break;

      case "error":
        addMessage(`❌ Error: ${data.message}`, "error");
        setCurrentOperation("None");
        setStatus("error");
        break;

      default:
        console.log("Tipo de mensaje desconocido:", data.type);
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

  const startIdentification = () => {
    if (currentOperation !== "None") {
      addMessage("⚠️ Ya hay una operación en curso", "warning");
      return;
    }

    setResult(null);
    setCurrentOperation("Identifying");
    addMessage("🔍 Iniciando identificación...", "info");

    // Obtener la URL del API
    const API_URL = "https://9dm7dqf9-3002.usw3.devtunnels.ms/api";

    // Enviar comando de identificación
    sendCommand("startIdentification", { apiUrl: API_URL });
  };

  const cancelOperation = () => {
    sendCommand("cancelEnrollment");
    setCurrentOperation("None");
    hasStartedIdentification.current = false;
    addMessage("⏹️ Operación cancelada", "warning");
    // Reiniciar identificación después de cancelar
    if (connected && readerConnected) {
      setTimeout(() => startIdentification(), 500);
    }
  };

  const isProcessing = currentOperation !== "None" || processingAttendance;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 p-2 rounded-lg">
                <Fingerprint className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Registro de Asistencia
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Huella Digital
                </p>
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

            {/* Main Action Area */}
            {!result ? (
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center mb-4">
                  <Fingerprint
                    className={`w-20 h-20 mx-auto mb-3 text-blue-600 dark:text-blue-400 ${
                      connected && readerConnected ? "animate-pulse" : ""
                    }`}
                  />
                  <p className="text-gray-900 dark:text-white font-medium mb-1">
                    {!connected
                      ? "Conectando al servidor..."
                      : !readerConnected
                      ? "Esperando lector de huellas..."
                      : "Coloca tu dedo en el lector"}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {!connected
                      ? "Por favor espera"
                      : !readerConnected
                      ? "Asegúrate de que el lector esté conectado"
                      : "El sistema te identificará automáticamente"}
                  </p>
                </div>

                {processingAttendance && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-4">
                    <p className="text-gray-900 dark:text-white text-center text-sm flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      Registrando asistencia...
                    </p>
                  </div>
                )}

                {/* Solo mostrar botón cancelar cuando hay operación en curso */}
                {currentOperation !== "None" && (
                  <div className="flex gap-3">
                    <button
                      onClick={cancelOperation}
                      className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Result Display */
              <div
                className={`rounded-xl p-6 text-center ${
                  result.success
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                }`}
              >
                {result.success ? (
                  <>
                    <CheckCircle className="w-16 h-16 mx-auto mb-3 text-green-600 dark:text-green-400" />
                    <p className="text-green-800 dark:text-green-300 font-bold text-lg mb-1">
                      Asistencia Registrada
                    </p>
                    {result.empleado?.nombre && (
                      <p className="text-gray-700 dark:text-gray-300 text-lg">
                        {result.empleado.nombre}
                      </p>
                    )}
                    {result.tipoMovimiento && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                        {result.tipoMovimiento === "ENTRADA" ? "Entrada" : "Salida"}{" "}
                        registrada {result.hora && `a las ${result.hora}`}
                      </p>
                    )}

                    {/* Separador */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

                    {/* Opción de abrir sesión */}
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                      ¿Deseas abrir tu sesión?
                    </p>

                    <button
                      onClick={() => procesarLoginBiometrico(result.empleadoId)}
                      disabled={processingLogin}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-3"
                    >
                      {processingLogin ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Cargando datos...
                        </>
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          Abrir Sesión
                        </>
                      )}
                    </button>

                    {/* Contador de cierre automático */}
                    {!processingLogin && (
                      <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                        <Timer className="w-4 h-4" />
                        <span>
                          Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600 dark:text-red-400" />
                    <p className="text-red-800 dark:text-red-300 font-bold text-lg mb-1">
                      Error en el Registro
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {result.message}
                    </p>
                    <button
                      onClick={() => {
                        setResult(null);
                        hasStartedIdentification.current = false;
                        // Reiniciar identificación automáticamente
                        if (connected && readerConnected) {
                          setTimeout(() => startIdentification(), 300);
                        }
                      }}
                      className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Intentar de nuevo
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Logs Panel - Minimalist */}
            {messages.length > 0 && !result && (
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

                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {messages.slice(0, 4).map((log) => (
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
