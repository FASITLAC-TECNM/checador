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
      // Cancelar cualquier operación en curso antes de cerrar (usar stopCapture que cancela todo)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ command: "stopCapture" }));
        } catch (e) {
          console.warn("Error enviando cancelación:", e);
        }
      }
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

  // Procesar login biométrico después de identificación exitosa
  const procesarLoginBiometrico = async (empleadoId, matchScore) => {
    setSavingToDatabase(true);
    addMessage("🔐 Procesando inicio de sesión...", "info");

    try {
      // Usar la misma URL que el servicio de autenticación
      const API_BASE = "https://9dm7dqf9-3002.usw3.devtunnels.ms/api";

      // Usar endpoint de autenticación biométrica (devuelve token + datos)
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

      const result = await authResponse.json();

      if (!result.success) {
        throw new Error(result.message || "Error en autenticación");
      }

      // Extraer datos correctamente de la respuesta
      const { usuario, roles, permisos, esAdmin, token } = result.data;
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
        matchScore: matchScore,
        metodoAutenticacion: "HUELLA",
      };

      // Guardar sesión
      guardarSesion(usuarioCompleto);

      // Cerrar modal inmediatamente
      if (onClose) onClose();

      // Callback de autenticación exitosa
      if (onAuthSuccess) {
        onAuthSuccess(usuarioCompleto);
      }
    } catch (error) {
      console.error("Error procesando login biométrico:", error);
      addMessage(`❌ Error: ${error.message}`, "error");
    } finally {
      setSavingToDatabase(false);
      setCurrentOperation("None");
      setStatus("ready");
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
          // En modo auth, iniciar identificación automáticamente cuando el lector esté listo
          if (mode === "auth" && data.currentOperation === "None") {
            setTimeout(() => {
              const API_URL = "https://9dm7dqf9-3002.usw3.devtunnels.ms/api";
              sendCommand("startIdentification", { apiUrl: API_URL });
              setCurrentOperation("Identifying");
              addMessage("🔍 Esperando huella...", "info");
            }, 500);
          }
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
        console.log("📨 captureComplete recibido:", data);

        if (data.result === "enrollmentSuccess") {
          // MODO REGISTRO: Guardar huella en BD
          addMessage(`✅ Captura completada: ${data.userId}`, "success");

          setLastEnrollmentData({
            userId: data.userId,
            templateBase64: data.templateBase64,
            timestamp: data.timestamp,
          });

          if (!data.templateBase64 && window.electronAPI) {
            addMessage("📄 Leyendo template desde archivo...", "info");
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
            guardarHuellaEnBaseDatos(data.userId, data.templateBase64);
          } else {
            addMessage("⚠️ Template no disponible", "warning");
          }

          setEnrollProgress({ collected: 0, required: 4, percentage: 0 });
          setCurrentOperation("None");
          setStatus("ready");

        } else if (data.result === "identificationSuccess") {
          // MODO AUTENTICACIÓN: Usuario identificado por el SDK de DigitalPersona
          addMessage(`✅ Huella reconocida: ${data.userId}`, "success");
          addMessage(`🎯 Precisión: ${data.matchScore || 100}%`, "info");

          // Extraer el ID del empleado del userId (formato: emp_EMP00003)
          // El ID es CHAR(8) como "EMP00003"
          const idEmpleadoMatch = data.userId?.match(/emp_([A-Z0-9]+)/i);
          if (idEmpleadoMatch) {
            const empleadoId = idEmpleadoMatch[1]; // String como "EMP00003"
            procesarLoginBiometrico(empleadoId, data.matchScore || 100);
          } else {
            addMessage("❌ No se pudo extraer el ID del empleado", "error");
            setCurrentOperation("None");
            setStatus("ready");
          }

        } else if (data.result === "identificationFailed") {
          // MODO AUTENTICACIÓN: Huella no reconocida
          addMessage("❌ Huella no reconocida en el sistema", "error");
          setCurrentOperation("None");
          setStatus("ready");

          // En modo auth, reiniciar identificación automáticamente para seguir esperando
          if (mode === "auth") {
            setTimeout(() => {
              const API_URL = "https://9dm7dqf9-3002.usw3.devtunnels.ms/api";
              sendCommand("startIdentification", { apiUrl: API_URL });
              setCurrentOperation("Identifying");
              addMessage("🔍 Esperando huella...", "info");
            }, 1000);
          }
        }
        break;

      case "cacheReloaded":
        addMessage(`✅ Caché actualizado: ${data.templatesCount} huellas`, "success");
        console.log("[CACHE] Caché de templates recargado:", data);
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
      // El empleado_id puede ser string (CHAR(8) como "EMP00003") o número
      const empleadoId = idEmpleado || inputValue;

      // DEBUG: Log de valores
      console.log("🔍 DEBUG guardarHuellaEnBaseDatos:");
      console.log("   - idEmpleado (prop):", idEmpleado);
      console.log("   - inputIdEmpleadoRef.current:", inputValue);
      console.log("   - empleadoId (calculado):", empleadoId);
      console.log("   - templateBase64 existe:", !!templateBase64);
      console.log("   - templateBase64 length:", templateBase64?.length);

      if (!empleadoId) {
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

          // Recargar el caché de templates para incluir la nueva huella
          const API_URL = "https://9dm7dqf9-3002.usw3.devtunnels.ms/api";
          sendCommand("reloadTemplates", { apiUrl: API_URL });
          addMessage("🔄 Actualizando caché de huellas...", "info");

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
      // El ID ahora es CHAR(8) como "EMP00003", ya no es un número
      const empleadoId = idEmpleado || inputIdEmpleado?.trim();

      if (!empleadoId || empleadoId.length === 0) {
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

    if (mode === "auth") {
      // MODO AUTENTICACIÓN: Usar identificación 1:N con SDK de DigitalPersona
      setCurrentOperation("Identifying");
      addMessage("🔍 Cargando huellas registradas...", "info");

      // Obtener la URL del API (puerto 3002)
      const API_URL = "https://9dm7dqf9-3002.usw3.devtunnels.ms/api";

      // Enviar comando de identificación con la URL del API
      sendCommand("startIdentification", { apiUrl: API_URL });
    } else {
      // MODO REGISTRO: Usar enrollment normal
      setCurrentOperation("Enrollment");
      const empleadoId = idEmpleado || inputIdEmpleado?.trim();
      const userId = `emp_${empleadoId}`;
      sendCommand("startEnrollment", { userId });
    }
  };

  const cancelEnrollment = () => {
    sendCommand("stopCapture"); // Usar stopCapture para cancelar cualquier operación
    setEnrollProgress({ collected: 0, required: 4, percentage: 0 });
    setCurrentOperation("None");
    addMessage("⏹️ Operación cancelada", "warning");
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

  // Manejador para cerrar el modal, cancela operaciones activas primero
  const handleClose = () => {
    // Cancelar cualquier operación en curso antes de cerrar (usar stopCapture que cancela todo)
    if (currentOperation !== "None" && wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ command: "stopCapture" }));
        console.log("⏹️ Operación cancelada al cerrar modal");
      } catch (e) {
        console.warn("Error enviando cancelación:", e);
      }
    }
    setCurrentOperation("None");
    setEnrollProgress({ collected: 0, required: 4, percentage: 0 });
    if (onClose) onClose();
  };

  const isProcessing = currentOperation !== "None" || savingToDatabase;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Cerrar solo si se hace clic en el backdrop, no en el contenido
        if (e.target === e.currentTarget) handleClose();
      }}
    >
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
                  onClick={handleClose}
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
                          type="text"
                          value={inputIdEmpleado}
                          onChange={(e) => setInputIdEmpleado(e.target.value.toUpperCase())}
                          placeholder="Ej: EMP00001, EMP00002..."
                          maxLength={8}
                          disabled={isProcessing}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                          autoFocus
                        />
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                          ID de 8 caracteres (CHAR8)
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

                {/* Solo mostrar botones en modo enroll o cuando hay operación en curso */}
                {(mode === "enroll" || currentOperation === "Enrollment") && (
                  <div className="flex gap-3">
                    {currentOperation !== "Enrollment" ? (
                      <button
                        onClick={startEnrollment}
                        disabled={
                          !connected ||
                          !readerConnected ||
                          isProcessing ||
                          !idEmpleado && !inputIdEmpleado
                        }
                        className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-5 h-5" />
                        Iniciar Registro
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
                )}

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

          </div>
        </div>
      </div>
    </div>
  );
}
