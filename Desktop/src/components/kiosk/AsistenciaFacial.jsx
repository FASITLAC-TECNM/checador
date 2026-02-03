import { useState, useEffect, useRef } from "react";
import {
  Camera,
  X,
  CheckCircle,
  XCircle,
  Clock,
  LogIn,
  Timer,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useFaceDetection } from "../../hooks/useFaceDetection";
import { identificarPorFacial, guardarSesion } from "../../services/biometricAuthService";
import { useCamera } from "../../context/CameraContext";
import { API_CONFIG, fetchApi } from "../../config/apiEndPoint";
import {
  cargarDatosAsistencia,
  obtenerDepartamentoEmpleado,
  registrarAsistenciaEnServidor,
  obtenerInfoClasificacion,
  obtenerUltimoRegistro,
  calcularEstadoRegistro
} from "../../services/asistenciaLogicService";
import { agregarEvento } from "../../services/bitacoraService";
import * as faceapi from 'face-api.js';

export default function AsistenciaFacial({
  isOpen = false,
  onClose,
  onSuccess,
  onLoginRequest,
  backgroundMode = false
}) {
  const shouldMaintainConnection = isOpen || backgroundMode;

  const [step, setStep] = useState("capturing"); // capturing, identifying, success, error
  const [showModal, setShowModal] = useState(!backgroundMode);
  const [errorMessage, setErrorMessage] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [result, setResult] = useState(null);
  const [countdown, setCountdown] = useState(6);
  const [loginHabilitado, setLoginHabilitado] = useState(false);
  const [processingLogin, setProcessingLogin] = useState(false);

  // Estados para logica de asistencia
  const [horarioInfo, setHorarioInfo] = useState(null);
  const [toleranciaInfo, setToleranciaInfo] = useState(null);

  // Refs
  const countdownIntervalRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const backgroundModeRef = useRef(backgroundMode);
  const isProcessingRef = useRef(false);
  const captureIntervalRef = useRef(null);
  const timeoutRef = useRef(null);
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

  // Mantener refs actualizadas
  useEffect(() => {
    onCloseRef.current = onClose;
    backgroundModeRef.current = backgroundMode;
  }, [onClose, backgroundMode]);

  // Reset al montar
  useEffect(() => {
    setLoginHabilitado(false);
    setProcessingLogin(false);

    if (backgroundMode) {
      setShowModal(false);
    }

    return () => {
      setLoginHabilitado(false);
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Cargar modelos e iniciar camara al montar (patron identico a FacialAuthModal)
  useEffect(() => {
    if (!shouldMaintainConnection) return;

    loadModels();

    // Iniciar camara directamente, igual que FacialAuthModal
    initCamera()
      .then((mediaStream) => {
        const video = document.getElementById("facialAttendanceVideo");
        if (video) {
          video.srcObject = mediaStream;
        }
      })
      .catch((err) => {
        console.error("Error accediendo a la camara:", err);
        setErrorMessage("No se pudo acceder a la camara");
        setStep("error");
        if (backgroundMode) setShowModal(true);
      });
  }, [loadModels, initCamera]);

  // Limpiar camara al desmontar (patron identico a FacialAuthModal)
  useEffect(() => {
    return () => {
      releaseCamera();
    };
  }, [releaseCamera]);

  // Iniciar deteccion facial (patron identico a FacialAuthModal)
  useEffect(() => {
    if (step !== "capturing" || !modelsLoaded || !shouldMaintainConnection) return;

    const video = document.getElementById("facialAttendanceVideo");
    if (!video) return;

    let capturado = false;

    const handleVideoReady = () => {
      console.log("Camara lista para registro facial...");

      captureIntervalRef.current = setInterval(async () => {
        if (capturado || isProcessingRef.current) return;

        try {
          const detections = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.4
            }))
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detections && detections.detection.score > 0.4 && !capturado && !isProcessingRef.current) {
            capturado = true;
            isProcessingRef.current = true;
            clearInterval(captureIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            const descriptor = Array.from(detections.descriptor);
            console.log("Rostro capturado para registro");

            // Convertir descriptor a Base64
            const float32Array = new Float32Array(descriptor);
            const buffer = new Uint8Array(float32Array.buffer);
            let binary = '';
            for (let i = 0; i < buffer.length; i++) {
              binary += String.fromCharCode(buffer[i]);
            }
            const descriptorBase64 = btoa(binary);

            // Mostrar estado de identificacion
            setStep("identifying");
            if (backgroundMode) setShowModal(true);

            // Identificar y registrar asistencia
            await identificarYRegistrar(descriptorBase64);
          }
        } catch (error) {
          console.error("Error en deteccion:", error);
        }
      }, 500);

      // Timeout de 20 segundos
      timeoutRef.current = setTimeout(() => {
        if (!capturado && !isProcessingRef.current) {
          clearInterval(captureIntervalRef.current);
          setErrorMessage("Tiempo agotado. No se detecto un rostro valido.");
          setStep("error");
          if (backgroundMode) setShowModal(true);
        }
      }, 20000);
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
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopFaceDetection();
    };
  }, [step, modelsLoaded, shouldMaintainConnection, backgroundMode, stopFaceDetection]);

  // Identificar usuario y registrar asistencia
  const identificarYRegistrar = async (descriptorBase64) => {
    let empleadoData = null;

    try {
      // 1. Identificar usuario por facial
      const response = await identificarPorFacial(descriptorBase64);

      if (!response.success) {
        throw new Error(response.error || "Rostro no reconocido en el sistema");
      }

      const usuarioIdentificado = response.usuario;
      console.log("Usuario identificado:", usuarioIdentificado);

      // 2. Obtener datos del empleado
      let empleadoId = usuarioIdentificado.empleado_id;

      if (!empleadoId && usuarioIdentificado.es_empleado) {
        const empleadosResponse = await fetchApi(API_CONFIG.ENDPOINTS.EMPLEADOS);
        const empleados = empleadosResponse.data || empleadosResponse;
        empleadoData = empleados.find(emp => emp.usuario_id === usuarioIdentificado.id);
        empleadoId = empleadoData?.id;
      }

      if (!empleadoId) {
        throw new Error("No se encontro informacion del empleado");
      }

      if (!empleadoData) {
        const empResponse = await fetchApi(`${API_CONFIG.ENDPOINTS.EMPLEADOS}/${empleadoId}`);
        empleadoData = empResponse.data || empResponse;
      }

      console.log("Empleado identificado:", empleadoData?.nombre || empleadoId);

      // 3. Verificar horario
      const datosAsistencia = await cargarDatosAsistencia(empleadoId, usuarioIdentificado.id);
      const estadoActual = datosAsistencia.estado;

      setHorarioInfo(datosAsistencia.horario);
      setToleranciaInfo(datosAsistencia.tolerancia);

      const now = new Date();
      const horaActual = now.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Verificar si puede registrar
      if (estadoActual && !estadoActual.puedeRegistrar) {
        let mensaje = "No puedes registrar en este momento";
        if (estadoActual.jornadaCompleta) {
          mensaje = estadoActual.mensaje || "Ya completaste tu jornada de hoy";
        } else if (estadoActual.estadoHorario === 'fuera_horario') {
          mensaje = "Estas fuera del horario de registro";
        } else if (estadoActual.estadoHorario === 'tiempo_insuficiente') {
          mensaje = estadoActual.mensajeEspera || `Debes esperar ${estadoActual.minutosRestantes || 'mas'} minutos`;
        }

        agregarEvento({
          user: empleadoData?.nombre || 'Usuario',
          action: `Intento de registro facial - ${mensaje}`,
          type: "warning",
        });

        setResult({
          success: false,
          message: mensaje,
          empleado: empleadoData,
          usuario: usuarioIdentificado,
          empleadoId: empleadoId,
          estadoHorario: estadoActual?.estadoHorario,
          noPuedeRegistrar: true,
          minutosRestantes: estadoActual?.minutosRestantes,
        });

        setStep("error");
        return;
      }

      // 4. Registrar asistencia
      console.log("Registrando asistencia...");
      const departamentoId = await obtenerDepartamentoEmpleado(empleadoId);

      const data = await registrarAsistenciaEnServidor({
        empleadoId: empleadoData.id,
        departamentoId,
        tipoRegistro: estadoActual?.tipoRegistro || 'entrada',
        clasificacion: estadoActual?.clasificacion || 'entrada',
        estadoHorario: estadoActual?.estadoHorario || 'puntual',
        metodoRegistro: 'FACIAL',
        token: localStorage.getItem('auth_token') || ''
      });

      // 5. Procesar resultado exitoso
      const clasificacionFinal = data.data?.clasificacion || estadoActual?.clasificacion || 'entrada';
      const tipoRegistro = data.data?.tipo || estadoActual?.tipoRegistro || 'entrada';
      const tipoMovimiento = tipoRegistro === 'salida' ? 'SALIDA' : 'ENTRADA';

      const { estadoTexto, tipoEvento } = obtenerInfoClasificacion(clasificacionFinal, tipoRegistro);

      agregarEvento({
        user: empleadoData?.nombre || 'Usuario',
        action: `${tipoMovimiento === 'SALIDA' ? 'Salida' : 'Entrada'} registrada (${estadoTexto}) - Facial`,
        type: tipoEvento,
      });

      // Mensaje de voz
      let voiceMessage = `Registro exitoso, ${empleadoData?.nombre || 'empleado'}`;
      if (clasificacionFinal === 'retardo') {
        voiceMessage = `Registro con retardo, ${empleadoData?.nombre || 'empleado'}`;
      } else if (clasificacionFinal === 'falta') {
        voiceMessage = `Registro fuera de tolerancia, ${empleadoData?.nombre || 'empleado'}`;
      } else if (clasificacionFinal === 'salida_temprana') {
        voiceMessage = `Salida anticipada, ${empleadoData?.nombre || 'empleado'}`;
      }

      const utterance = new SpeechSynthesisUtterance(voiceMessage);
      utterance.lang = "es-MX";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);

      setResult({
        success: true,
        message: "Asistencia registrada",
        empleado: empleadoData,
        usuario: usuarioIdentificado,
        empleadoId: empleadoId,
        tipoMovimiento: tipoMovimiento,
        hora: data.data?.fecha_registro
          ? new Date(data.data.fecha_registro).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
          : horaActual,
        estado: data.data?.estado || estadoActual?.estadoHorario || 'puntual',
        estadoTexto: estadoTexto,
        clasificacion: clasificacionFinal,
      });

      setStep("success");

      // Callback de exito
      if (onSuccess) {
        onSuccess({
          empleado: empleadoData,
          tipo_movimiento: tipoMovimiento,
          hora: horaActual,
          estado: data.data?.estado,
          clasificacion: clasificacionFinal,
          dispositivo_origen: 'escritorio',
        });
      }

    } catch (error) {
      console.error("Error:", error);

      agregarEvento({
        user: empleadoData?.nombre || 'Usuario',
        action: `Error en registro facial - ${error.message}`,
        type: "error",
      });

      setErrorMessage(error.message || "Error al registrar asistencia");
      setResult({
        success: false,
        message: error.message || "Error al registrar asistencia",
        empleado: empleadoData,
        noReconocida: error.message?.includes("no reconocido") || error.message?.includes("No se encontr"),
      });

      setStep("error");
    }
  };

  // Countdown para cierre automatico
  useEffect(() => {
    const debeIniciarCountdown = result?.success ||
      result?.noPuedeRegistrar ||
      result?.noReconocida ||
      (backgroundMode && result && !result.success);

    if (debeIniciarCountdown) {
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
            setTimeout(() => {
              handleCloseModal();
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
  }, [result?.success, result?.noPuedeRegistrar, result?.noReconocida, result?.empleadoId, backgroundMode]);

  // Habilitar login despues de mostrar resultado
  useEffect(() => {
    if (result && result.empleadoId && showModal) {
      setLoginHabilitado(false);
      const timer = setTimeout(() => {
        setLoginHabilitado(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setLoginHabilitado(false);
    }
  }, [result, showModal]);

  // Procesar login biometrico
  const procesarLoginBiometrico = async () => {
    if (!loginHabilitado || !showModal || !result?.usuario) {
      console.warn("Login no habilitado o modal no visible");
      return;
    }

    setProcessingLogin(true);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    try {
      const API_BASE = `${API_CONFIG.BASE_URL}/api`;

      const authResponse = await fetch(`${API_BASE}/auth/biometric`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ empleado_id: result.empleadoId }),
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
        localStorage.setItem('auth_token', token);
      }

      const usuarioCompleto = {
        ...usuario,
        roles,
        permisos,
        esAdmin,
        token,
        metodoAutenticacion: "FACIAL",
      };

      guardarSesion(usuarioCompleto);

      if (onClose) onClose();

      if (onLoginRequest) {
        onLoginRequest(usuarioCompleto);
      }

    } catch (error) {
      console.error("Error procesando login:", error);
      setCountdown(6);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
            setTimeout(() => {
              handleCloseModal();
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

  // Cerrar modal (patron identico a FacialAuthModal)
  const handleCloseModal = () => {
    setLoginHabilitado(false);
    isProcessingRef.current = false;

    if (backgroundMode) {
      setShowModal(false);
      setResult(null);
      setStep("capturing");
      setErrorMessage("");
    } else {
      setIsClosing(true);
      releaseCamera();
      setTimeout(() => {
        if (onClose) onClose();
      }, 300);
    }
  };

  // Reintentar (patron identico a FacialAuthModal)
  const handleRetry = () => {
    setStep("capturing");
    setResult(null);
    setErrorMessage("");
    isProcessingRef.current = false;

    // Reiniciar camara directamente
    initCamera()
      .then((mediaStream) => {
        const video = document.getElementById("facialAttendanceVideo");
        if (video) {
          video.srcObject = mediaStream;
        }
      })
      .catch((err) => {
        setErrorMessage("No se pudo acceder a la camara");
        setStep("error");
      });
  };

  // No renderizar si no debe mantener conexion
  if (!shouldMaintainConnection) {
    return null;
  }

  // En modo background, no mostrar UI hasta detectar rostro
  if (backgroundMode && !showModal) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 transition-opacity duration-300"
      style={{
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        opacity: isClosing ? 0 : 1
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== "identifying") {
          handleCloseModal();
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-300"
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
                <h3 className="text-lg font-bold text-white">Registro de Asistencia</h3>
                <p className="text-xs text-white/80">Reconocimiento Facial</p>
              </div>
            </div>
            {step !== "identifying" && (
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {/* Capturando */}
          {step === "capturing" && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden w-full" style={{ aspectRatio: "4/3", minHeight: "280px" }}>
                <video
                  id="facialAttendanceVideo"
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)", minHeight: "280px" }}
                />

                {/* Guias de captura */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-44 h-56">
                    <div
                      className="absolute top-0 left-0 w-8 h-8 border-l-[3px] border-t-[3px] transition-all duration-300"
                      style={{
                        borderColor: faceDetected ? '#a855f7' : 'rgba(255,255,255,0.5)',
                        filter: faceDetected ? 'drop-shadow(0 0 8px rgba(168,85,247,0.8))' : 'none'
                      }}
                    />
                    <div
                      className="absolute top-0 right-0 w-8 h-8 border-r-[3px] border-t-[3px] transition-all duration-300"
                      style={{
                        borderColor: faceDetected ? '#a855f7' : 'rgba(255,255,255,0.5)',
                        filter: faceDetected ? 'drop-shadow(0 0 8px rgba(168,85,247,0.8))' : 'none'
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-0 w-8 h-8 border-l-[3px] border-b-[3px] transition-all duration-300"
                      style={{
                        borderColor: faceDetected ? '#a855f7' : 'rgba(255,255,255,0.5)',
                        filter: faceDetected ? 'drop-shadow(0 0 8px rgba(168,85,247,0.8))' : 'none'
                      }}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-8 h-8 border-r-[3px] border-b-[3px] transition-all duration-300"
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

          {/* Identificando */}
          {step === "identifying" && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 text-center">
              <div className="relative">
                <Camera className="w-20 h-20 mx-auto mb-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 border-4 border-blue-300 dark:border-blue-600 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
                </div>
              </div>
              <p className="text-gray-900 dark:text-white font-bold text-xl mb-2 mt-4">
                Identificando...
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Por favor espera mientras verificamos tu identidad
              </p>
            </div>
          )}

          {/* Exito */}
          {step === "success" && result && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
              {result.clasificacion === 'retardo' || result.clasificacion === 'salida_temprana' ? (
                <AlertTriangle className="w-16 h-16 mx-auto mb-3 text-yellow-600 dark:text-yellow-400" />
              ) : result.clasificacion === 'falta' ? (
                <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle className="w-16 h-16 mx-auto mb-3 text-green-600 dark:text-green-400" />
              )}

              <p className={`font-bold text-lg mb-1 ${
                result.clasificacion === 'falta'
                  ? "text-red-800 dark:text-red-300"
                  : result.clasificacion === 'retardo' || result.clasificacion === 'salida_temprana'
                  ? "text-yellow-800 dark:text-yellow-300"
                  : "text-green-800 dark:text-green-300"
              }`}>
                Asistencia Registrada
              </p>

              {result.empleado?.nombre && (
                <p className="text-gray-700 dark:text-gray-300 text-lg">
                  {result.empleado.nombre}
                </p>
              )}

              {result.tipoMovimiento && (
                <div className="mt-2">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {result.tipoMovimiento === "ENTRADA" ? "Entrada" : "Salida"}{" "}
                    registrada {result.hora && `a las ${result.hora}`}
                  </p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                      result.clasificacion === "entrada" || result.clasificacion === "salida_puntual"
                        ? "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300"
                        : result.clasificacion === "retardo" || result.clasificacion === "salida_temprana"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300"
                        : result.clasificacion === "falta"
                        ? "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300"
                    }`}
                  >
                    {result.estadoTexto || result.estado || "Registrado"}
                  </span>
                </div>
              )}

              {/* Separador */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

              {/* Opcion de abrir sesion */}
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                Deseas abrir tu sesion?
              </p>

              <button
                onClick={procesarLoginBiometrico}
                disabled={processingLogin || !loginHabilitado}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-3"
              >
                {processingLogin ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cargando datos...
                  </>
                ) : !loginHabilitado ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Preparando...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Abrir Sesion
                  </>
                )}
              </button>

              {!processingLogin && (
                <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                  <Timer className="w-4 h-4" />
                  <span>
                    Esta ventana se cerrara en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className={`rounded-xl p-6 text-center ${
              result?.noPuedeRegistrar
                ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            }`}>
              {result?.noPuedeRegistrar ? (
                <>
                  <AlertTriangle className="w-16 h-16 mx-auto mb-3 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-yellow-800 dark:text-yellow-300 font-bold text-lg mb-1">
                    No Disponible
                  </p>
                  {result.empleado?.nombre && (
                    <p className="text-gray-700 dark:text-gray-300 text-lg mb-2">
                      {result.empleado.nombre}
                    </p>
                  )}
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {result.message}
                  </p>
                  <span
                    className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold ${
                      result.estadoHorario === "completado"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300"
                        : result.estadoHorario === "tiempo_insuficiente"
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300"
                    }`}
                  >
                    {result.estadoHorario === "completado"
                      ? "Jornada completada"
                      : result.estadoHorario === "tiempo_insuficiente"
                      ? `Espera ${result.minutosRestantes || ''} min`
                      : "Fuera de horario"}
                  </span>

                  {/* Separador */}
                  <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

                  {/* Opcion de abrir sesion */}
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    Deseas abrir tu sesion de todas formas?
                  </p>

                  <button
                    onClick={procesarLoginBiometrico}
                    disabled={processingLogin || !loginHabilitado}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-3"
                  >
                    {processingLogin ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Cargando datos...
                      </>
                    ) : !loginHabilitado ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Preparando...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        Abrir Sesion
                      </>
                    )}
                  </button>

                  {!processingLogin && (
                    <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                      <Timer className="w-4 h-4" />
                      <span>
                        Esta ventana se cerrara en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                      </span>
                    </div>
                  )}
                </>
              ) : result?.noReconocida ? (
                <>
                  <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-300 font-bold text-lg mb-2">
                    Rostro No Reconocido
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                    Tu rostro no se encuentra registrado en el sistema
                  </p>

                  <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-4">
                    <Timer className="w-4 h-4" />
                    <span>
                      Esta ventana se cerrara en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                    </span>
                  </div>

                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Intentar de nuevo
                  </button>
                </>
              ) : (
                <>
                  <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-300 font-bold text-lg mb-1">
                    Error
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                    {errorMessage || result?.message || "Error al registrar asistencia"}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleRetry}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      Intentar de Nuevo
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
