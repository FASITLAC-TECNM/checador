import { useState, useEffect, useRef } from "react";
import {
  Fingerprint,
  Wifi,
  WifiOff,
  Square,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  AlertCircle,
  UserPlus,
  ShieldCheck,
  Search,
} from "lucide-react";

export default function BiometricReader({
  isOpen = false,
  onClose,
  onVerificationSuccess,
  onEnrollmentSuccess,
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

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [newUserId, setNewUserId] = useState("");

  const [lastResult, setLastResult] = useState(null);
  const [messages, setMessages] = useState([]);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  useEffect(() => {
    connectToServer();
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
        sendCommand("listUsers");
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

        // Actualizar currentOperation basado en el estado
        if (data.status === "enrolling") {
          setCurrentOperation("Enrollment");
        } else if (data.status === "verifying") {
          setCurrentOperation("Verification");
        } else if (data.status === "identifying") {
          setCurrentOperation("Identification");
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
        handleCaptureComplete(data);
        break;

      case "userList":
        setUsers(data.users || []);
        addMessage(`👥 Usuarios cargados: ${data.users?.length || 0}`, "info");
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

  const handleCaptureComplete = (data) => {
    setLastResult(data);
    setCurrentOperation("None");
    setStatus("ready");

    switch (data.result) {
      case "enrollmentSuccess":
        addMessage(`✅ Huella registrada: ${data.userId}`, "success");
        setEnrollProgress({ collected: 0, required: 4, percentage: 0 });
        setNewUserId("");

        sendCommand("listUsers");

        if (onEnrollmentSuccess) {
          onEnrollmentSuccess({
            userId: data.userId,
            timestamp: data.timestamp,
          });
        }
        break;

      case "verificationSuccess":
        addMessage(
          `✅ Verificación exitosa: ${data.userId} (Score: ${data.matchScore}%)`,
          "success"
        );

        if (onVerificationSuccess) {
          onVerificationSuccess({
            verified: true,
            userId: data.userId,
            matchScore: data.matchScore,
            timestamp: data.timestamp,
          });
        }
        break;

      case "verificationFailed":
        addMessage(
          `❌ Verificación fallida (Score: ${data.matchScore}%)`,
          "error"
        );
        break;

      case "identificationSuccess":
        addMessage(
          `✅ Usuario identificado: ${data.userId} (Score: ${data.matchScore}%)`,
          "success"
        );

        if (onVerificationSuccess) {
          onVerificationSuccess({
            verified: true,
            userId: data.userId,
            matchScore: data.matchScore,
            timestamp: data.timestamp,
          });
        }
        break;

      case "identificationFailed":
        addMessage("❌ Usuario no identificado", "error");
        break;

      default:
        console.log("Resultado desconocido:", data.result);
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
    if (!newUserId.trim()) {
      addMessage("⚠️ Ingrese un ID de usuario", "warning");
      return;
    }

    if (currentOperation !== "None") {
      addMessage("⚠️ Ya hay una operación en curso", "warning");
      return;
    }

    setLastResult(null);
    setEnrollProgress({ collected: 0, required: 4, percentage: 0 });
    setCurrentOperation("Enrollment");
    sendCommand("startEnrollment", { userId: newUserId.trim() });
  };

  const cancelEnrollment = () => {
    sendCommand("cancelEnrollment");
    setEnrollProgress({ collected: 0, required: 4, percentage: 0 });
    setCurrentOperation("None");
    addMessage("⏹️ Enrollment cancelado", "warning");
  };

  const startVerification = () => {
    if (!selectedUser) {
      addMessage("⚠️ Seleccione un usuario", "warning");
      return;
    }

    if (currentOperation !== "None") {
      addMessage("⚠️ Ya hay una operación en curso", "warning");
      return;
    }

    setLastResult(null);
    setCurrentOperation("Verification");
    sendCommand("startVerification", { userId: selectedUser });
  };

  const startIdentification = () => {
    if (users.length === 0) {
      addMessage("⚠️ No hay usuarios registrados", "warning");
      return;
    }

    if (currentOperation !== "None") {
      addMessage("⚠️ Ya hay una operación en curso", "warning");
      return;
    }

    setLastResult(null);
    setCurrentOperation("Identification");
    sendCommand("startIdentification");
  };

  const stopCapture = () => {
    sendCommand("stopCapture");
    setCurrentOperation("None");
    setEnrollProgress({ collected: 0, required: 4, percentage: 0 });
    setStatus("ready");
    addMessage("⏹️ Captura detenida", "info");
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
    sendCommand("listUsers");
    addMessage("🔄 Refrescando estado...", "info");
  };

  const isProcessing = currentOperation !== "None";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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
                    Sistema Biométrico
                  </h1>
                  <p className="text-blue-200 text-sm">
                    BiometricMiddleware v1.0
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

                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`rounded-lg p-4 ${
                      readerConnected
                        ? "bg-green-500/20 border border-green-500/50"
                        : "bg-yellow-500/20 border border-yellow-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {readerConnected ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-yellow-400" />
                      )}
                      <div>
                        <p className="text-white font-medium">Lector</p>
                        <p className="text-white/70 text-sm">
                          {readerConnected ? "Conectado" : "Desconectado"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Loader2
                        className={`w-6 h-6 text-blue-400 ${
                          isProcessing ? "animate-spin" : ""
                        }`}
                      />
                      <div>
                        <p className="text-white font-medium">Operación</p>
                        <p className="text-white/70 text-sm">
                          {currentOperation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enrollment Section */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">
                  📝 Registrar Nueva Huella
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      ID del Usuario:
                    </label>
                    <input
                      type="text"
                      value={newUserId}
                      onChange={(e) => setNewUserId(e.target.value)}
                      placeholder="Ej: empleado001"
                      disabled={isProcessing}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>

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
                        <Loader2 className="w-5 h-5 inline animate-spin mr-2" />
                        Coloque el mismo dedo en el lector
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {currentOperation !== "Enrollment" ? (
                      <button
                        onClick={startEnrollment}
                        disabled={
                          !connected || !readerConnected || isProcessing
                        }
                        className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-5 h-5" />
                        Iniciar Registro
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
                </div>
              </div>

              {/* Verification Section */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">
                  🔍 Verificar Identidad (1:1)
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Seleccionar Usuario:
                    </label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="">-- Seleccione un usuario --</option>
                      {users.map((user) => (
                        <option key={user} value={user}>
                          {user}
                        </option>
                      ))}
                    </select>
                  </div>

                  {users.length === 0 && (
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
                      <p className="text-yellow-200 text-sm text-center">
                        No hay usuarios registrados
                      </p>
                    </div>
                  )}

                  {currentOperation === "Verification" && (
                    <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-4">
                      <p className="text-white text-center">
                        <Loader2 className="w-5 h-5 inline animate-spin mr-2" />
                        Coloque su dedo para verificar
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {currentOperation !== "Verification" ? (
                      <button
                        onClick={startVerification}
                        disabled={
                          !connected ||
                          !readerConnected ||
                          !selectedUser ||
                          isProcessing
                        }
                        className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-5 h-5" />
                        Verificar
                      </button>
                    ) : (
                      <button
                        onClick={stopCapture}
                        className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Square className="w-5 h-5" />
                        Detener
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Identification Section */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">
                  🔎 Identificar Usuario (1:N)
                </h2>

                <div className="space-y-4">
                  <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
                    <p className="text-white text-sm">
                      👥 Base de datos: <strong>{users.length}</strong> usuario
                      {users.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {currentOperation === "Identification" && (
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                      <p className="text-white text-center">
                        <Loader2 className="w-5 h-5 inline animate-spin mr-2" />
                        Buscando en {users.length} usuario
                        {users.length !== 1 ? "s" : ""}...
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {currentOperation !== "Identification" ? (
                      <button
                        onClick={startIdentification}
                        disabled={
                          !connected ||
                          !readerConnected ||
                          users.length === 0 ||
                          isProcessing
                        }
                        className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Search className="w-5 h-5" />
                        Identificar
                      </button>
                    ) : (
                      <button
                        onClick={stopCapture}
                        className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Square className="w-5 h-5" />
                        Detener
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Result Display */}
              {lastResult && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    📊 Último Resultado
                  </h2>
                  <div
                    className={`rounded-lg p-4 ${
                      lastResult.result.includes("Success")
                        ? "bg-green-500/20 border border-green-500/50"
                        : "bg-red-500/20 border border-red-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {lastResult.result.includes("Success") ? (
                        <CheckCircle className="w-8 h-8 text-green-400" />
                      ) : (
                        <XCircle className="w-8 h-8 text-red-400" />
                      )}
                      <div className="flex-1">
                        <p
                          className={`font-bold text-lg ${
                            lastResult.result.includes("Success")
                              ? "text-green-300"
                              : "text-red-300"
                          }`}
                        >
                          {lastResult.result === "enrollmentSuccess" &&
                            "✓ Huella Registrada"}
                          {lastResult.result === "verificationSuccess" &&
                            "✓ Verificación Exitosa"}
                          {lastResult.result === "verificationFailed" &&
                            "✗ Verificación Fallida"}
                          {lastResult.result === "identificationSuccess" &&
                            "✓ Usuario Identificado"}
                          {lastResult.result === "identificationFailed" &&
                            "✗ No Identificado"}
                        </p>
                        {lastResult.userId && (
                          <p className="text-white text-sm mt-1">
                            Usuario: <strong>{lastResult.userId}</strong>
                          </p>
                        )}
                        {lastResult.matchScore !== null &&
                          lastResult.matchScore !== undefined && (
                            <p className="text-white/70 text-sm">
                              Score: {lastResult.matchScore}%
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Users List */}
              {users.length > 0 && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    👥 Usuarios Registrados ({users.length})
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {users.map((user) => (
                      <div
                        key={user}
                        className="bg-white/10 rounded-lg p-3 border border-white/20 hover:bg-white/15 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Fingerprint className="w-5 h-5 text-blue-400" />
                          <span className="text-white text-sm font-medium truncate">
                            {user}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Logs Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">
                    📋 Registro de Eventos
                  </h2>
                  <button
                    onClick={() => setMessages([])}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Limpiar
                  </button>
                </div>

                <div className="space-y-2 max-h-[700px] overflow-y-auto">
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
