import { useRef, useEffect } from "react";
import { Fingerprint, Wifi, WifiOff, X, Database } from "lucide-react";
import { guardarSesion } from "../../services/biometricAuthService";
import useBiometricWebSocket from "../../hooks/useBiometricWebSocket";
import { getApiEndpoint } from "../../config/apiEndPoint";

export default function BiometricAuth({ isOpen = false, onClose, onAuthSuccess }) {
  if (!isOpen) return null;

  const API_URL = getApiEndpoint("/api");
  const empresaId = localStorage.getItem("empresa_id");
  const messageHandlerRef = useRef(null);

  const {
    connected,
    readerConnected,
    currentOperation,
    setCurrentOperation,
    setStatus,
    savingToDatabase,
    setSavingToDatabase,
    sendCommand,
    addMessage,
    connectToServer,
    stopCapture,
  } = useBiometricWebSocket((data) => {
    if (messageHandlerRef.current) messageHandlerRef.current(data);
  });

  const iniciarIdentificacion = () => {
    sendCommand("startIdentification", { 
      apiUrl: API_URL,
      empresaId: empresaId
    });
    setCurrentOperation("Identifying");
    addMessage("🔍 Esperando huella...", "info");
  };

  const procesarLoginBiometrico = async (empleadoId, matchScore) => {
    setSavingToDatabase(true);
    addMessage("🔐 Procesando inicio de sesión...", "info");

    try {
      const authResponse = await fetch(`${API_URL}/auth/biometric`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          empleado_id: empleadoId,
          empresa_id: empresaId
        }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al autenticar");
      }

      const result = await authResponse.json();

      if (!result.success) {
        throw new Error(result.message || "Error en autenticación");
      }

      const { usuario, roles, permisos, esAdmin, token } = result.data;

      if (token) {
        localStorage.setItem("auth_token", token);
      }

      const usuarioCompleto = {
        ...usuario,
        roles,
        permisos,
        esAdmin,
        token,
        matchScore,
        metodoAutenticacion: "HUELLA",
      };

      guardarSesion(usuarioCompleto);
      if (onClose) onClose();
      if (onAuthSuccess) onAuthSuccess(usuarioCompleto);
    } catch (error) {
      console.error("Error procesando login biométrico:", error);
      addMessage(`❌ Error: ${error.message}`, "error");
    } finally {
      setSavingToDatabase(false);
      setCurrentOperation("None");
      setStatus("ready");
    }
  };

  // Registrar el handler de mensajes
  useEffect(() => {
    messageHandlerRef.current = (data) => {
      if (data.type === "systemStatus" && data.readerConnected) {
        if (data.currentOperation === "None") {
          setTimeout(() => iniciarIdentificacion(), 500);
        } else if (data.currentOperation !== "Identifying") {
          // Servidor en otro modo (ej: enrollment previo), forzar reset
          stopCapture();
          setTimeout(() => iniciarIdentificacion(), 800);
        }
      }

      if (data.type === "captureComplete") {
        if (data.result === "identificationSuccess") {
          addMessage(`✅ Huella reconocida: ${data.userId}`, "success");
          addMessage(`🎯 Precisión: ${data.matchScore || 100}%`, "info");

          const match = data.userId?.match(/emp_([A-Z0-9\-]+)/i);
          if (match) {
            procesarLoginBiometrico(match[1], data.matchScore || 100);
          } else {
            addMessage("❌ No se pudo extraer el ID del empleado", "error");
            setCurrentOperation("None");
            setStatus("ready");
          }
        } else if (data.result === "identificationFailed") {
          addMessage("❌ Huella no reconocida en el sistema", "error");
          setCurrentOperation("None");
          setStatus("ready");
          setTimeout(() => iniciarIdentificacion(), 1000);
        }
      }
    };
  });

  const handleClose = () => {
    if (currentOperation !== "None") stopCapture();
    setCurrentOperation("None");
    if (onClose) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#1976D2] p-2 rounded-lg">
                <Fingerprint className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Autenticación por Huella
              </h1>
            </div>

            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Reader Status */}
            <div
              className={`flex items-center justify-between p-4 rounded-xl ${readerConnected
                ? "bg-[#E3F2FD] dark:bg-[#1565C0]/20 border border-[#BBDEFB] dark:border-[#1565C0]/40"
                : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                }`}
            >
              <div className="flex items-center gap-3">
                <Fingerprint
                  className={`w-6 h-6 ${readerConnected
                    ? "text-[#1976D2] dark:text-[#42A5F5]"
                    : "text-yellow-600 dark:text-yellow-400"
                    }`}
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Lector de Huellas</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {readerConnected ? "Conectado y listo" : "Desconectado"}
                  </p>
                </div>
              </div>
            </div>

            {/* Auth Section */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Iniciar Sesión con Huella
              </h2>

              <div className="space-y-4">
                <div className="bg-[#E3F2FD] dark:bg-[#1565C0]/20 border border-[#BBDEFB] dark:border-[#1565C0]/40 rounded-lg p-6 text-center">
                  <Fingerprint className="w-16 h-16 mx-auto mb-3 text-[#1976D2] dark:text-[#42A5F5]" />
                  <p className="text-gray-900 dark:text-white font-medium mb-1">
                    Coloca tu dedo en el lector
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    El sistema te identificará automáticamente
                  </p>
                </div>

                {savingToDatabase && (
                  <div className="bg-[#E3F2FD] dark:bg-[#1565C0]/20 border border-[#BBDEFB] dark:border-[#1565C0]/40 rounded-lg p-3">
                    <p className="text-gray-900 dark:text-white text-center text-sm flex items-center justify-center gap-2">
                      <Database className="w-4 h-4 text-[#1976D2] dark:text-[#42A5F5]" />
                      Procesando...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
