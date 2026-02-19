import { useState, useEffect } from "react";
import { X, UserPlus, CheckCircle, XCircle, Eye } from "lucide-react";
import { useFaceDetection } from "../../hooks/useFaceDetection";
import { registrarDescriptorFacial } from "../../services/biometricAuthService";
import { useCamera } from "../../context/CameraContext";
import * as faceapi from 'face-api.js';

export default function RegisterFaceModal({ onClose, empleadoId: propEmpleadoId = null }) {
  const [empleadoId, setEmpleadoId] = useState(propEmpleadoId || "");
  const [step, setStep] = useState(propEmpleadoId ? "capturing" : "input"); // input, capturing, success, error
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [skipLiveness, setSkipLiveness] = useState(true); // Modo rápido para pruebas

  // Hook de cámara singleton
  const { initCamera, releaseCamera } = useCamera();

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
    loadModels();

    // Si viene con empleadoId, iniciar cámara automáticamente
    if (propEmpleadoId && step === "capturing") {
      initCamera()
        .then((mediaStream) => {
          const video = document.getElementById("registerVideo");
          if (video) {
            video.srcObject = mediaStream;
          }
        })
        .catch((err) => {
          setErrorMessage("No se pudo acceder a la cámara");
          setStep("input");
        });
    }
  }, [loadModels, propEmpleadoId, initCamera]);

  const handleStartCapture = () => {
    const idTrimmed = empleadoId.trim();
    if (!idTrimmed) {
      setErrorMessage("Por favor ingresa un ID de empleado");
      return;
    }

    if (idTrimmed.length > 8) {
      setErrorMessage("El ID del empleado debe tener máximo 8 caracteres");
      return;
    }

    setErrorMessage("");
    setStep("capturing");

    // Iniciar cámara usando el contexto singleton
    initCamera()
      .then((mediaStream) => {
        const video = document.getElementById("registerVideo");
        if (video) {
          video.srcObject = mediaStream;
        }
      })
      .catch((err) => {
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
                // Convertir descriptor a Base64 (igual que las huellas)
                const float32Array = new Float32Array(descriptor);
                const buffer = new Uint8Array(float32Array.buffer);
                let binary = '';
                for (let i = 0; i < buffer.length; i++) {
                  binary += String.fromCharCode(buffer[i]);
                }
                const descriptorBase64 = btoa(binary);

                console.log(`📦 Descriptor convertido a Base64: ${descriptorBase64.length} caracteres`);

                // Intentar usar el servicio primero (sin Electron)
                const response = await registrarDescriptorFacial(
                  empleadoId,
                  descriptorBase64
                );

                if (response.success) {
                  setSuccessMessage(`Descriptor facial registrado para empleado ${empleadoId}`);
                  setStep("success");
                  setTimeout(() => {
                    handleClose();
                  }, 3000);
                } else {
                  setErrorMessage(response.error || "Error al registrar descriptor");
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
            // Convertir descriptor a Base64 (igual que las huellas)
            const descriptor = Array.isArray(result.descriptor)
              ? result.descriptor
              : Array.from(result.descriptor);

            const float32Array = new Float32Array(descriptor);
            const buffer = new Uint8Array(float32Array.buffer);
            let binary = '';
            for (let i = 0; i < buffer.length; i++) {
              binary += String.fromCharCode(buffer[i]);
            }
            const descriptorBase64 = btoa(binary);

            console.log(`📦 Descriptor convertido a Base64: ${descriptorBase64.length} caracteres`);

            // Usar el servicio para registrar
            const response = await registrarDescriptorFacial(
              empleadoId,
              descriptorBase64
            );

            if (response.success) {
              setSuccessMessage(`Descriptor facial registrado para empleado ${empleadoId}`);
              setStep("success");

              // Cerrar después de 3 segundos
              setTimeout(() => {
                handleClose();
              }, 3000);
            } else {
              setErrorMessage(response.error || "Error al registrar descriptor");
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

  // Limpiar cámara al cerrar
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
        <div className="bg-gradient-to-r from-[#1976D2] to-[#001A70] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Registro Facial - Pruebas</h3>
              <p className="text-xs text-blue-100 mt-0.5">Agregar descriptor a la base de datos</p>
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
                  onChange={(e) => setEmpleadoId(e.target.value.slice(0, 8))}
                  placeholder="Ejemplo: EMP00001"
                  maxLength={8}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1976D2] uppercase"
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
                className="w-full bg-[#1976D2] hover:bg-[#1565C0] text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Capturar Rostro
              </button>

              <div className="flex items-center gap-2 p-3 bg-[#E3F2FD] dark:bg-[#1565C0]/20 border border-[#BBDEFB] dark:border-[#1565C0]/40 rounded-lg">
                <input
                  type="checkbox"
                  id="skipLiveness"
                  checked={skipLiveness}
                  onChange={(e) => setSkipLiveness(e.target.checked)}
                  className="w-4 h-4 text-[#1976D2] border-gray-300 rounded focus:ring-[#1976D2]"
                />
                <label htmlFor="skipLiveness" className="text-sm text-[#0D47A1] dark:text-[#90CAF9] cursor-pointer">
                  <strong>⚡ Modo Rápido</strong> - Capturar sin verificación de parpadeo (solo para pruebas)
                </label>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  ⚠️ <strong>Nota:</strong> El descriptor facial se guardará en la tabla Credenciales, columna Facial (BYTEA).
                  El ID del empleado es un código de máximo 8 caracteres.
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
                        borderColor: faceDetected ? '#1976D2' : 'rgba(255,255,255,0.5)',
                        filter: faceDetected ? 'drop-shadow(0 0 8px rgba(25, 118, 210,0.8))' : 'none'
                      }}
                    />
                    <div
                      className="absolute top-0 right-0 w-10 h-10 border-r-[3px] border-t-[3px] transition-all duration-300"
                      style={{
                        borderColor: faceDetected ? '#1976D2' : 'rgba(255,255,255,0.5)',
                        filter: faceDetected ? 'drop-shadow(0 0 8px rgba(25, 118, 210,0.8))' : 'none'
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-0 w-10 h-10 border-l-[3px] border-b-[3px] transition-all duration-300"
                      style={{
                        borderColor: faceDetected ? '#1976D2' : 'rgba(255,255,255,0.5)',
                        filter: faceDetected ? 'drop-shadow(0 0 8px rgba(25, 118, 210,0.8))' : 'none'
                      }}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-10 h-10 border-r-[3px] border-b-[3px] transition-all duration-300"
                      style={{
                        borderColor: faceDetected ? '#1976D2' : 'rgba(255,255,255,0.5)',
                        filter: faceDetected ? 'drop-shadow(0 0 8px rgba(25, 118, 210,0.8))' : 'none'
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
                    <div className={`flex items-center gap-1.5 ${faceDetected ? 'text-[#1976D2] dark:text-[#42A5F5]' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${faceDetected ? 'bg-[#1976D2] animate-pulse' : 'bg-gray-400'}`} />
                      <span className="font-medium">Rostro detectado</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${livenessDetected ? 'text-[#1976D2] dark:text-[#42A5F5]' : 'text-gray-500 dark:text-gray-400'}`}>
                      <Eye className={`w-4 h-4 ${livenessDetected ? 'animate-pulse' : ''}`} />
                      <span className="font-medium">Liveness</span>
                    </div>
                  </div>
                )}

                {modelsLoaded && detectionProgress > 0 && (
                  <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#1976D2] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${detectionProgress}%` }}
                    />
                  </div>
                )}

                {!modelsLoaded && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1976D2] border-t-transparent"></div>
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
                  releaseCamera();
                }}
                className="bg-[#1976D2] hover:bg-[#1565C0] text-white font-semibold py-2 px-6 rounded-lg transition-colors"
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
