import { useState, useEffect } from "react";
import { X, CheckCircle, XCircle, Camera, LogIn } from "lucide-react";
import { useFaceDetection } from "../../hooks/useFaceDetection";
import { identificarPorFacial } from "../../services/biometricAuthService";
import { guardarSesion } from "../../services/biometricAuthService";
import { API_CONFIG } from "../../config/apiEndPoint";
import { useCamera } from "../../context/CameraContext";
import * as faceapi from 'face-api.js';

export default function FacialAuthModal({ onClose, onAuthSuccess }) {
  const [step, setStep] = useState("capturing"); // capturing, success, error
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  // Hook de camara singleton
  const { initCamera, releaseCamera } = useCamera();

  const {
    modelsLoaded,
    faceDetected,
    detectionProgress,
    detectionError,
    loadModels,
    stopFaceDetection,
  } = useFaceDetection();

  // Cargar modelos e iniciar camara al montar
  useEffect(() => {
    loadModels();

    // Iniciar camara automaticamente
    initCamera()
      .then((mediaStream) => {
        const video = document.getElementById("authVideo");
        if (video) {
          video.srcObject = mediaStream;
        }
      })
      .catch((err) => {
        console.error("Error accediendo a la camara:", err);
        setErrorMessage("No se pudo acceder a la camara");
        setStep("error");
      });
  }, [loadModels, initCamera]);

  // Iniciar deteccion cuando el video este listo
  useEffect(() => {
    if (step !== "capturing" || !modelsLoaded) return;

    const video = document.getElementById("authVideo");
    if (!video) return;

    let capturado = false;
    let captureInterval = null;
    let timeoutId = null;

    const handleVideoReady = () => {
      console.log("📹 Video listo para autenticacion facial...");

      captureInterval = setInterval(async () => {
        if (capturado) return;

        try {
          const detections = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.4
            }))
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detections && detections.detection.score > 0.4 && !capturado) {
            capturado = true;
            clearInterval(captureInterval);
            if (timeoutId) clearTimeout(timeoutId);

            const descriptor = Array.from(detections.descriptor);
            console.log("✅ Rostro capturado para autenticacion");

            // Convertir descriptor a Base64
            const float32Array = new Float32Array(descriptor);
            const buffer = new Uint8Array(float32Array.buffer);
            let binary = '';
            for (let i = 0; i < buffer.length; i++) {
              binary += String.fromCharCode(buffer[i]);
            }
            const descriptorBase64 = btoa(binary);

            console.log(`📦 Descriptor convertido a Base64: ${descriptorBase64.length} caracteres`);

            // Identificar usuario por facial
            try {
              const response = await identificarPorFacial(descriptorBase64);

              if (response.success) {
                console.log("✅ Usuario identificado:", response.usuario);

                // Extraer empleado_id para autenticar via /api/auth/biometric
                const empleadoId = response.usuario.id_empleado || response.usuario.id;

                if (!empleadoId) {
                  setErrorMessage("No se pudo obtener el ID del empleado");
                  setStep("error");
                  return;
                }

                // Autenticar via /api/auth/biometric (mismo flujo que BiometricAuth)
                const authResponse = await fetch(`${API_CONFIG.BASE_URL}/api/auth/biometric`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ empleado_id: empleadoId }),
                });

                if (!authResponse.ok) {
                  const errorData = await authResponse.json().catch(() => ({}));
                  throw new Error(errorData.message || "Error al autenticar");
                }

                const authResult = await authResponse.json();

                if (!authResult.success) {
                  throw new Error(authResult.message || "Error en autenticacion");
                }

                const { usuario, roles, permisos, esAdmin, token } = authResult.data;

                if (token) {
                  localStorage.setItem("auth_token", token);
                }

                const usuarioCompleto = {
                  ...usuario,
                  roles,
                  permisos,
                  esAdmin,
                  token,
                  matchScore: response.matchScore,
                  metodoAutenticacion: "FACIAL",
                };

                guardarSesion(usuarioCompleto);

                setSuccessMessage(`Bienvenido, ${usuarioCompleto.nombre || usuarioCompleto.id}`);
                setStep("success");

                // Callback y cerrar despues de mostrar mensaje
                setTimeout(() => {
                  if (onAuthSuccess) {
                    onAuthSuccess(usuarioCompleto);
                  }
                  handleClose();
                }, 2000);
              } else {
                setErrorMessage(response.error || "Rostro no reconocido en el sistema");
                setStep("error");
              }
            } catch (error) {
              console.error("Error identificando usuario:", error);
              setErrorMessage(error.message || "Error al identificar rostro");
              setStep("error");
            }
          }
        } catch (error) {
          console.error("❌ Error en deteccion:", error);
        }
      }, 500);

      // Timeout de 15 segundos
      timeoutId = setTimeout(() => {
        if (!capturado) {
          clearInterval(captureInterval);
          setErrorMessage("Tiempo agotado. No se detecto un rostro valido.");
          setStep("error");
        }
      }, 15000);
    };

    const handleCanPlay = () => {
      if (video.readyState >= 2) {
        handleVideoReady();
      }
    };

    video.addEventListener("loadeddata", handleCanPlay);
    video.addEventListener("canplay", handleCanPlay);

    if (video.readyState >= 2) {
      handleVideoReady();
    }

    return () => {
      video.removeEventListener("loadeddata", handleCanPlay);
      video.removeEventListener("canplay", handleCanPlay);
      if (captureInterval) clearInterval(captureInterval);
      if (timeoutId) clearTimeout(timeoutId);
      stopFaceDetection();
    };
  }, [step, modelsLoaded, onAuthSuccess, stopFaceDetection]);

  // Limpiar camara al cerrar
  useEffect(() => {
    return () => {
      releaseCamera();
    };
  }, [releaseCamera]);

  const handleClose = () => {
    setIsClosing(true);
    releaseCamera();
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleRetry = () => {
    setStep("capturing");
    setErrorMessage("");

    // Reiniciar camara
    initCamera()
      .then((mediaStream) => {
        const video = document.getElementById("authVideo");
        if (video) {
          video.srcObject = mediaStream;
        }
      })
      .catch((err) => {
        setErrorMessage("No se pudo acceder a la camara");
        setStep("error");
      });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 transition-opacity duration-300"
      style={{
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        opacity: isClosing ? 0 : 1
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transition-all duration-300"
        style={{
          transform: isClosing ? 'scale(0.95)' : 'scale(1)',
          opacity: isClosing ? 0 : 1
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reconocimiento Facial</h3>
                <p className="text-xs text-white/80">Autenticacion biometrica</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {/* Capturando */}
          {step === "capturing" && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden w-full" style={{ aspectRatio: "4/3", minHeight: "300px" }}>
                <video
                  id="authVideo"
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)", minHeight: "300px" }}
                />

                {/* Guias de captura */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-48 h-64">
                    <div
                      className="absolute top-0 left-0 w-10 h-10 border-l-[3px] border-t-[3px] transition-all duration-300"
                      style={{
                        borderColor: faceDetected ? '#a855f7' : 'rgba(255,255,255,0.5)',
                        filter: faceDetected ? 'drop-shadow(0 0 8px rgba(168,85,247,0.8))' : 'none'
                      }}
                    />
                    <div
                      className="absolute top-0 right-0 w-10 h-10 border-r-[3px] border-t-[3px] transition-all duration-300"
                      style={{
                        borderColor: faceDetected ? '#a855f7' : 'rgba(255,255,255,0.5)',
                        filter: faceDetected ? 'drop-shadow(0 0 8px rgba(168,85,247,0.8))' : 'none'
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-0 w-10 h-10 border-l-[3px] border-b-[3px] transition-all duration-300"
                      style={{
                        borderColor: faceDetected ? '#a855f7' : 'rgba(255,255,255,0.5)',
                        filter: faceDetected ? 'drop-shadow(0 0 8px rgba(168,85,247,0.8))' : 'none'
                      }}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-10 h-10 border-r-[3px] border-b-[3px] transition-all duration-300"
                      style={{
                        borderColor: faceDetected ? '#a855f7' : 'rgba(255,255,255,0.5)',
                        filter: faceDetected ? 'drop-shadow(0 0 8px rgba(168,85,247,0.8))' : 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Indicadores */}
              <div className="space-y-2">
                <p className="text-center text-gray-700 dark:text-gray-300 text-sm font-medium">
                  {!modelsLoaded && "Cargando modelos de reconocimiento..."}
                  {modelsLoaded && "Coloca tu rostro frente a la camara"}
                </p>

                {modelsLoaded && (
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div className={`flex items-center gap-1.5 ${faceDetected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${faceDetected ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="font-medium">Rostro detectado</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <LogIn className="w-4 h-4" />
                      <span className="font-medium">Identificando...</span>
                    </div>
                  </div>
                )}

                {modelsLoaded && detectionProgress > 0 && (
                  <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${detectionProgress}%` }}
                    />
                  </div>
                )}

                {!modelsLoaded && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
                    <span className="text-gray-600 dark:text-gray-400 text-xs">Cargando modelos...</span>
                  </div>
                )}

                {detectionError && (
                  <p className="text-center text-red-500 dark:text-red-400 text-xs font-medium">{detectionError}</p>
                )}
              </div>
            </div>
          )}

          {/* Exito */}
          {step === "success" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Autenticacion Exitosa
              </h4>
              <p className="text-green-600 dark:text-green-400 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{errorMessage}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Intentar de Nuevo
                </button>
                <button
                  onClick={handleClose}
                  className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
