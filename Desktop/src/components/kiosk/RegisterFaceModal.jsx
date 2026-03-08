import { useState, useEffect, useRef } from "react";
import { X, UserPlus, CheckCircle, XCircle } from "lucide-react";
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
  const [faceDetected, setFaceDetected] = useState(false);
  const [proximityMessage, setProximityMessage] = useState("");

  // Hook de cámara singleton
  const { initCamera, releaseCamera } = useCamera();

  const {
    modelsLoaded,
    detectionError,
    loadModels,
  } = useFaceDetection();

  const cropCanvasRef = useRef(null);

  // Recortar video al area del ovalo guia
  const getCroppedOvalFrame = (video) => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    const displayAspect = 4 / 3;
    const videoAspect = vw / vh;
    let sx, sy, sw, sh;
    if (videoAspect > displayAspect) {
      sh = vh; sw = vh * displayAspect;
      sx = (vw - sw) / 2; sy = 0;
    } else {
      sw = vw; sh = vw / displayAspect;
      sx = 0; sy = (vh - sh) / 2;
    }

    const oLeft = 120 / 400, oTop = 35 / 300;
    const oW = 160 / 400, oH = 210 / 300;
    const cropX = sx + sw * oLeft;
    const cropY = sy + sh * oTop;
    const cropW = sw * oW;
    const cropH = sh * oH;

    if (!cropCanvasRef.current) {
      cropCanvasRef.current = document.createElement('canvas');
    }
    const canvas = cropCanvasRef.current;
    const cw = 280, ch = Math.round(280 * (cropH / cropW));
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cw / 2, ch / 2, cw / 2, ch / 2, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cw, ch);
    ctx.restore();

    return canvas;
  };

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

      // Capturando directamente sin liveness
      let capturado = false;

      const captureInterval = setInterval(async () => {
        if (capturado) return;

        try {
          const croppedFrame = getCroppedOvalFrame(video);
          if (!croppedFrame) return;

          const detections = await faceapi
            .detectSingleFace(croppedFrame, new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.4
            }))
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detections && detections.detection.score > 0.4) {
            setFaceDetected(true);

            // Validar posición de proximidad
            const box = detections.detection.box;
            const canvasW = 280;
            // cropH/cropW aspect is (3/4)*(0.7/0.4) = 1.3125
            const canvasH = 368;
            const faceCenterX = box.x + box.width / 2;
            const faceCenterY = box.y + box.height / 2;

            const widthRatio = box.width / canvasW;
            const heightRatio = box.height / canvasH;

            let isPositionGood = false;

            if (widthRatio < 0.35 || heightRatio < 0.35) {
              setProximityMessage("Acércate un poco más a la cámara");
            } else if (widthRatio > 0.85 || heightRatio > 0.85) {
              setProximityMessage("Aléjate un poco de la cámara");
            } else if (Math.abs(faceCenterX - canvasW / 2) > canvasW * 0.20 || Math.abs(faceCenterY - canvasH / 2) > canvasH * 0.20) {
              setProximityMessage("Centra tu rostro dentro del óvalo");
            } else {
              setProximityMessage("¡Posición perfecta! Registrando...");
              isPositionGood = true;
            }

            if (isPositionGood && !capturado) {
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
          } else {
            setFaceDetected(false);
          }
        } catch (error) {
          console.error("❌ Error en detección:", error);
        }
      }, 400);

      // Timeout de 15 segundos
      setTimeout(() => {
        if (!capturado) {
          clearInterval(captureInterval);
          setErrorMessage("Tiempo agotado. No se detectó rostro.");
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
    };
  }, [step, modelsLoaded, empleadoId]);

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
                className="w-full bg-[#1976D2] hover:bg-[#1565C0] text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mb-2"
              >
                <UserPlus className="w-5 h-5" />
                Capturar Rostro
              </button>

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

                {/* Guias de captura - Ovalo facial con animaciones */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
                    <defs>
                      <mask id="regFaceMask">
                        <rect width="400" height="300" fill="white" />
                        <ellipse cx="200" cy="140" rx="80" ry="105" fill="black" />
                      </mask>
                      <filter id="regGlow">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <linearGradient id="regScanGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="30%" stopColor={faceDetected ? "rgba(25, 118, 210, 0.6)" : "rgba(255,255,255,0.3)"} />
                        <stop offset="50%" stopColor={faceDetected ? "rgba(25, 118, 210, 0.9)" : "rgba(255,255,255,0.5)"} />
                        <stop offset="70%" stopColor={faceDetected ? "rgba(25, 118, 210, 0.6)" : "rgba(255,255,255,0.3)"} />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                    <rect width="400" height="300" fill="rgba(0,0,0,0.45)" mask="url(#regFaceMask)" />
                    <ellipse
                      cx="200" cy="140" rx="80" ry="105"
                      fill="none"
                      stroke={faceDetected ? "#1976D2" : "rgba(255,255,255,0.6)"}
                      strokeWidth={faceDetected ? "3" : "2"}
                      strokeDasharray={faceDetected ? "none" : "8 4"}
                      filter={faceDetected ? "url(#regGlow)" : "none"}
                      style={{ transition: "all 0.4s ease" }}
                    />
                    {faceDetected && (
                      <ellipse
                        cx="200" cy="140" rx="84" ry="109"
                        fill="none"
                        stroke="rgba(25, 118, 210, 0.25)"
                        strokeWidth="6"
                        style={{ animation: "regFacePulse 2s ease-in-out infinite" }}
                      />
                    )}
                    {!faceDetected && (
                      <line
                        x1="120" y1="140" x2="280" y2="140"
                        stroke="url(#regScanGradient)"
                        strokeWidth="2"
                        style={{ animation: "regScanLine 2.5s ease-in-out infinite" }}
                      />
                    )}
                    <path d="M 135 55 L 135 40 L 155 40" fill="none" stroke={faceDetected ? "#1976D2" : "rgba(255,255,255,0.7)"} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s ease" }} />
                    <path d="M 265 55 L 265 40 L 245 40" fill="none" stroke={faceDetected ? "#1976D2" : "rgba(255,255,255,0.7)"} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s ease" }} />
                    <path d="M 135 245 L 135 260 L 155 260" fill="none" stroke={faceDetected ? "#1976D2" : "rgba(255,255,255,0.7)"} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s ease" }} />
                    <path d="M 265 245 L 265 260 L 245 260" fill="none" stroke={faceDetected ? "#1976D2" : "rgba(255,255,255,0.7)"} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s ease" }} />
                    <line x1="196" y1="135" x2="204" y2="135" stroke={faceDetected ? "rgba(25,118,210,0.4)" : "rgba(255,255,255,0.2)"} strokeWidth="1" />
                    <line x1="200" y1="131" x2="200" y2="139" stroke={faceDetected ? "rgba(25,118,210,0.4)" : "rgba(255,255,255,0.2)"} strokeWidth="1" />
                  </svg>
                  <style>{`
                    @keyframes regScanLine {
                      0% { transform: translateY(-60px); opacity: 0; }
                      15% { opacity: 1; }
                      85% { opacity: 1; }
                      100% { transform: translateY(60px); opacity: 0; }
                    }
                    @keyframes regFacePulse {
                      0%, 100% { opacity: 0.3; }
                      50% { opacity: 0.8; }
                    }
                  `}</style>

                </div>
              </div>

              <div className="space-y-2">
                <p className={`text-center text-sm font-medium ${proximityMessage === "¡Posición perfecta! Registrando..." ? "text-green-600 dark:text-green-400" : proximityMessage ? "text-[#1976D2] dark:text-[#42A5F5]" : "text-gray-700 dark:text-gray-300"}`}>
                  {!modelsLoaded && "Cargando modelos de reconocimiento..."}
                  {modelsLoaded && (proximityMessage || "Coloca tu rostro frente a la cámara y mantén la posición...")}
                </p>

                {modelsLoaded && (
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div className={`flex items-center gap-1.5 ${faceDetected ? 'text-[#1976D2] dark:text-[#42A5F5]' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${faceDetected ? 'bg-[#1976D2] animate-pulse' : 'bg-gray-400'}`} />
                      <span className="font-medium">Rostro detectado</span>
                    </div>
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
