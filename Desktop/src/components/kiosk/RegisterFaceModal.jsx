import { useState, useEffect } from "react";
import { X, UserPlus, CheckCircle, XCircle, Eye } from "lucide-react";
import { useFaceDetection } from "../../hooks/useFaceDetection";
import * as faceapi from 'face-api.js';

export default function RegisterFaceModal({ onClose }) {
  const [empleadoId, setEmpleadoId] = useState("");
  const [step, setStep] = useState("input"); // input, capturing, success, error
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [stream, setStream] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [skipLiveness, setSkipLiveness] = useState(true); // Modo rápido para pruebas

  const {
    modelsLoaded,
    faceDetected,
    livenessDetected,
    detectionProgress,
    detectionError,
    loadModels,
    startFaceDetection,
    stopFaceDetection,
  } = useFaceDetection();

  // Cargar modelos al montar
  useEffect(() => {
    console.log("📦 RegisterFaceModal montado");
    loadModels();
  }, [loadModels]);

  const handleStartCapture = () => {
    if (!empleadoId.trim()) {
      setErrorMessage("Por favor ingresa un ID de empleado");
      return;
    }

    console.log("🎥 Iniciando captura para empleado:", empleadoId);
    setErrorMessage("");
    setStep("capturing");

    // Iniciar cámara
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((mediaStream) => {
        console.log("✅ Cámara iniciada");
        setStream(mediaStream);
        const video = document.getElementById("registerVideo");
        if (video) {
          video.srcObject = mediaStream;
        }
      })
      .catch((err) => {
        console.error("❌ Error al acceder a la cámara:", err);
        setErrorMessage("No se pudo acceder a la cámara");
        setStep("input");
      });
  };

  // Iniciar detección cuando el video esté listo
  useEffect(() => {
    if (step !== "capturing" || !modelsLoaded) return;

    const video = document.getElementById("registerVideo");
    if (!video) return;

    const handleVideoReady = () => {
      console.log("📹 Video listo para registro facial...");

      // Si skipLiveness está activado, capturar directamente sin parpadeo
      if (skipLiveness) {
        console.log("⚡ Modo rápido activado - Capturando sin liveness...");
        let capturado = false;

        const captureInterval = setInterval(async () => {
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
              const descriptor = Array.from(detections.descriptor);
              console.log("✅ Rostro capturado directamente");

              // Guardar directamente
              try {
                if (!window.electronAPI) {
                  throw new Error("Esta funcionalidad requiere Electron");
                }

                const response = await window.electronAPI.registrarDescriptorFacial(
                  empleadoId,
                  descriptor
                );

                if (response.success) {
                  setSuccessMessage(`Descriptor facial registrado para empleado ${empleadoId}`);
                  setStep("success");
                  setTimeout(() => {
                    handleClose();
                  }, 3000);
                } else {
                  setErrorMessage(response.message || "Error al registrar descriptor");
                  setStep("error");
                }
              } catch (error) {
                console.error("❌ Error registrando descriptor:", error);
                setErrorMessage(error.message);
                setStep("error");
              }
            }
          } catch (error) {
            console.error("❌ Error en detección:", error);
          }
        }, 500);

        // Timeout de 10 segundos
        setTimeout(() => {
          if (!capturado) {
            clearInterval(captureInterval);
          }
        }, 10000);
        return;
      }

      // Modo normal con liveness
      startFaceDetection(
        video,
        async (result) => {
          console.log("✅ Rostro capturado para registro:", result);

          // Registrar el descriptor en la base de datos
          try {
            if (!window.electronAPI) {
              throw new Error("Esta funcionalidad requiere Electron");
            }

            const response = await window.electronAPI.registrarDescriptorFacial(
              empleadoId,
              result.descriptor
            );

            if (response.success) {
              setSuccessMessage(`Descriptor facial registrado para empleado ${empleadoId}`);
              setStep("success");

              // Cerrar después de 3 segundos
              setTimeout(() => {
                handleClose();
              }, 3000);
            } else {
              setErrorMessage(response.message || "Error al registrar descriptor");
              setStep("error");
            }
          } catch (error) {
            console.error("❌ Error registrando descriptor:", error);
            setErrorMessage(error.message);
            setStep("error");
          }
        },
        (error) => {
          console.error("❌ Error en detección:", error);
          setErrorMessage("Error al detectar rostro");
          setStep("error");
        }
      );
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
      stopFaceDetection();
    };
  }, [step, modelsLoaded, empleadoId, startFaceDetection, stopFaceDetection]);

  // Limpiar stream al cerrar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleClose = () => {
    console.log("🚪 Cerrando modal de registro");
    setIsClosing(true);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setTimeout(() => {
      onClose();
    }, 300);
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
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Registro Facial - Pruebas</h3>
              <p className="text-xs text-purple-100 mt-0.5">Agregar descriptor a la base de datos</p>
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
          {/* Paso 1: Ingresar ID */}
          {step === "input" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ID del Empleado
                </label>
                <input
                  type="text"
                  value={empleadoId}
                  onChange={(e) => setEmpleadoId(e.target.value)}
                  placeholder="Ejemplo: 123"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleStartCapture();
                    }
                  }}
                />
              </div>

              {errorMessage && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                </div>
              )}

              <button
                onClick={handleStartCapture}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Capturar Rostro
              </button>

              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <input
                  type="checkbox"
                  id="skipLiveness"
                  checked={skipLiveness}
                  onChange={(e) => setSkipLiveness(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="skipLiveness" className="text-sm text-purple-700 dark:text-purple-400 cursor-pointer">
                  <strong>⚡ Modo Rápido</strong> - Capturar sin verificación de parpadeo (solo para pruebas)
                </label>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  ⚠️ <strong>Modo de pruebas:</strong> Este botón registra descriptores faciales directamente en la base de datos.
                  Asegúrate de que el empleado exista en la tabla de empleados.
                </p>
              </div>
            </div>
          )}

          {/* Paso 2: Capturando */}
          {step === "capturing" && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden w-full" style={{ aspectRatio: "4/3", minHeight: "300px" }}>
                <video
                  id="registerVideo"
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)", minHeight: "300px" }}
                />

                {/* Guías de captura */}
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
                  {skipLiveness && modelsLoaded && "⚡ Modo Rápido - Coloca tu rostro y mantén la posición..."}
                  {!skipLiveness && modelsLoaded && !faceDetected && "Coloca tu rostro frente a la cámara"}
                  {!skipLiveness && modelsLoaded && faceDetected && !livenessDetected && "Parpadea 1 vez para verificar"}
                  {!skipLiveness && modelsLoaded && livenessDetected && "¡Rostro validado! Guardando..."}
                </p>

                {modelsLoaded && (
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div className={`flex items-center gap-1.5 ${faceDetected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${faceDetected ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="font-medium">Rostro detectado</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${livenessDetected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <Eye className={`w-4 h-4 ${livenessDetected ? 'animate-pulse' : ''}`} />
                      <span className="font-medium">Liveness</span>
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

          {/* Paso 3: Éxito */}
          {step === "success" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                ¡Registro Exitoso!
              </h4>
              <p className="text-gray-600 dark:text-gray-400">{successMessage}</p>
            </div>
          )}

          {/* Paso 4: Error */}
          {step === "error" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{errorMessage}</p>
              <button
                onClick={() => {
                  setStep("input");
                  setErrorMessage("");
                  if (stream) {
                    stream.getTracks().forEach((track) => track.stop());
                    setStream(null);
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Intentar de Nuevo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
