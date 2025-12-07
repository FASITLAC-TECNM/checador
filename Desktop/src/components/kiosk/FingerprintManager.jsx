import React, { useState, useEffect } from "react";
import {
  Fingerprint,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  User,
  X,
} from "lucide-react";

const FingerprintManager = ({ isOpen, onClose }) => {
  const [readerStatus, setReaderStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null); // 'enroll' | 'verify'
  const [templateData, setTemplateData] = useState(null);
  const [fingerprintImage, setFingerprintImage] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info"); // 'success' | 'error' | 'info'
  const [verificationResult, setVerificationResult] = useState(null);

  const API_BASE_URL = "http://localhost:8080/api/fingerprint";

  // Verificar estado del lector al montar
  useEffect(() => {
    if (isOpen) {
      checkReaderStatus();
      const interval = setInterval(checkReaderStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const checkReaderStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      const data = await response.json();
      setReaderStatus(data);
    } catch (error) {
      console.error("Error checking reader status:", error);
      setReaderStatus({ connected: false, readerInfo: "Error de conexión" });
    }
  };

  const startEnrollment = async () => {
    setLoading(true);
    setMode("enroll");
    setMessage("Coloca tu dedo en el lector...");
    setMessageType("info");
    setFingerprintImage(null);
    setVerificationResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        setTemplateData(data.templateData);
        setFingerprintImage(data.imageData);
        setMessage("¡Huella registrada exitosamente!");
        setMessageType("success");

        // Guardar en localStorage para persistencia
        localStorage.setItem("fingerprintTemplate", data.templateData);
      } else {
        setMessage(`Error: ${data.message}`);
        setMessageType("error");
      }
    } catch (error) {
      setMessage(`Error de conexión: ${error.message}`);
      setMessageType("error");
    } finally {
      setLoading(false);
      setMode(null);
    }
  };

  const startVerification = async () => {
    const storedTemplate =
      templateData || localStorage.getItem("fingerprintTemplate");

    if (!storedTemplate) {
      setMessage(
        "No hay huella registrada. Por favor, registra una huella primero."
      );
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMode("verify");
    setMessage("Coloca tu dedo en el lector para verificar...");
    setMessageType("info");
    setFingerprintImage(null);
    setVerificationResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateData: storedTemplate }),
      });

      const data = await response.json();

      if (data.status === "VERIFIED") {
        setMessage("¡Huella VERIFICADA! ✓");
        setMessageType("success");
        setVerificationResult(true);
      } else if (data.status === "NOT_VERIFIED") {
        setMessage("Huella NO verificada. Intenta de nuevo.");
        setMessageType("error");
        setVerificationResult(false);
      } else {
        setMessage(`Error: ${data.message}`);
        setMessageType("error");
      }

      if (data.imageData) {
        setFingerprintImage(data.imageData);
      }
    } catch (error) {
      setMessage(`Error de conexión: ${error.message}`);
      setMessageType("error");
    } finally {
      setLoading(false);
      setMode(null);
    }
  };

  const stopCapture = async () => {
    try {
      await fetch(`${API_BASE_URL}/stop`, { method: "POST" });
      setLoading(false);
      setMode(null);
      setMessage("Captura cancelada");
      setMessageType("info");
    } catch (error) {
      console.error("Error stopping capture:", error);
    }
  };

  const clearTemplate = () => {
    setTemplateData(null);
    setFingerprintImage(null);
    setMessage("Huella eliminada");
    setMessageType("info");
    setVerificationResult(null);
    localStorage.removeItem("fingerprintTemplate");
  };

  const handleClose = async () => {
    if (loading) {
      await stopCapture();
    }
    onClose();
  };

  const hasStoredTemplate =
    templateData || localStorage.getItem("fingerprintTemplate");

  // No renderizar nada si el modal está cerrado
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-full">
                <Fingerprint className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Gestor de Huella Digital
                </h1>
                <p className="text-indigo-100 text-sm mt-1">
                  Sistema de registro y verificación
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              disabled={loading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Estado del Lector */}
          <div
            className={`p-4 rounded-lg mb-6 ${
              readerStatus?.connected
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  readerStatus?.connected ? "bg-green-500" : "bg-red-500"
                } animate-pulse`}
              ></div>
              <span className="font-semibold text-gray-700">
                {readerStatus?.connected
                  ? "Lector Conectado"
                  : "Lector Desconectado"}
              </span>
            </div>
            {readerStatus?.readerInfo && (
              <p className="text-sm text-gray-600 mt-1 ml-5">
                {readerStatus.readerInfo}
              </p>
            )}
          </div>

          {/* Controles Principales */}
          <div className="bg-bg-secondary rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={startEnrollment}
                disabled={loading || !readerStatus?.connected}
                className={`flex items-center justify-center gap-3 p-6 rounded-xl font-semibold text-lg transition-all ${
                  loading || !readerStatus?.connected
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                }`}
              >
                <User className="w-6 h-6" />
                Registrar Huella
              </button>

              <button
                onClick={startVerification}
                disabled={
                  loading || !readerStatus?.connected || !hasStoredTemplate
                }
                className={`flex items-center justify-center gap-3 p-6 rounded-xl font-semibold text-lg transition-all ${
                  loading || !readerStatus?.connected || !hasStoredTemplate
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                }`}
              >
                <CheckCircle className="w-6 h-6" />
                Verificar Huella
              </button>
            </div>

            {loading && (
              <button
                onClick={stopCapture}
                className="w-full flex items-center justify-center gap-2 p-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold"
              >
                <XCircle className="w-5 h-5" />
                Cancelar
              </button>
            )}

            {hasStoredTemplate && !loading && (
              <button
                onClick={clearTemplate}
                className="w-full mt-4 flex items-center justify-center gap-2 p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Eliminar Huella Guardada
              </button>
            )}
          </div>

          {/* Mensajes de Estado */}
          {message && (
            <div
              className={`rounded-xl p-6 mb-6 ${
                messageType === "success"
                  ? "bg-green-50 border-2 border-green-200"
                  : messageType === "error"
                  ? "bg-red-50 border-2 border-red-200"
                  : "bg-blue-50 border-2 border-blue-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {loading ? (
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0" />
                ) : messageType === "success" ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : messageType === "error" ? (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      messageType === "success"
                        ? "text-green-800"
                        : messageType === "error"
                        ? "text-red-800"
                        : "text-blue-800"
                    }`}
                  >
                    {message}
                  </p>
                  {mode === "enroll" && loading && (
                    <p className="text-sm text-gray-600 mt-2">
                      Se necesitan múltiples lecturas para completar el
                      registro...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resultado de Verificación */}
          {verificationResult !== null && (
            <div
              className={`rounded-xl p-8 mb-6 ${
                verificationResult
                  ? "bg-gradient-to-br from-green-500 to-emerald-600"
                  : "bg-gradient-to-br from-red-500 to-pink-600"
              }`}
            >
              <div className="flex items-center justify-center gap-4 text-white">
                {verificationResult ? (
                  <>
                    <CheckCircle className="w-16 h-16" />
                    <div>
                      <h2 className="text-3xl font-bold">¡VERIFICADO!</h2>
                      <p className="text-green-100">La huella coincide</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16" />
                    <div>
                      <h2 className="text-3xl font-bold">NO VERIFICADO</h2>
                      <p className="text-red-100">La huella no coincide</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Imagen de Huella */}
          {fingerprintImage && (
            <div className="bg-bg-secondary rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-text-primary mb-4 text-center">
                Imagen Capturada
              </h3>
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${fingerprintImage}`}
                  alt="Fingerprint"
                  className="border-4 border-indigo-200 rounded-xl shadow-lg max-w-md"
                />
              </div>
            </div>
          )}

          {/* Info de Template */}
          {hasStoredTemplate && (
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
              <p className="text-sm text-indigo-800 text-center">
                ✓ Huella registrada y lista para verificación
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FingerprintManager;
