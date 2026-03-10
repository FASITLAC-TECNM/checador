import { useState, useEffect, useRef } from "react";
import {
  Camera,
  X,
  CheckCircle,
  XCircle,
  LogIn,
  Timer,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useFaceDetection } from "../../hooks/useFaceDetection";
import { identificarPorFacial, guardarSesion } from "../../services/biometricAuthService";
import { useCamera } from "../../context/CameraContext";
import { API_CONFIG } from "../../config/apiEndPoint";
import {
  obtenerDepartamentoEmpleado,
  registrarAsistenciaEnServidor,
  obtenerInfoClasificacion
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

  const [step, setStep] = useState("liveness"); // liveness, capturing, identifying, success, error
  const [showModal, setShowModal] = useState(!backgroundMode);
  const [errorMessage, setErrorMessage] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [result, setResult] = useState(null);
  const [countdown, setCountdown] = useState(6);
  const [loginHabilitado, setLoginHabilitado] = useState(false);
  const [processingLogin, setProcessingLogin] = useState(false);

  // Liveness detection state (Point Challenge)
  const [challengePoint, setChallengePoint] = useState(null); // {x, y, angle}
  const [challengeDone, setChallengeDone] = useState(false);
  const [proximityMessage, setProximityMessage] = useState(""); // Guía visual de proximidad

  // Refs
  const countdownIntervalRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const backgroundModeRef = useRef(backgroundMode);
  const isProcessingRef = useRef(false);
  const captureIntervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const cropCanvasRef = useRef(null);

  // Liveness refs (no re-render during loop)
  const livenessIntervalRef = useRef(null);
  const livenessTimeoutRef = useRef(null);
  const challengeDoneRef = useRef(false);
  const startNoseRef = useRef(null); // Guardar posicion inicial de la nariz
  const smoothedPoseRef = useRef(null); // Guardar la posición suavizada actual (filtro EMA)
  const currentChallengeRef = useRef(null); // Referencia al challenge actual para el closure de setInterval
  const framesHeldRef = useRef(0); // Para requerir múltiples fotogramas sostenidos

  // Hook de camara singleton
  const { initCamera, releaseCamera } = useCamera();

  // ── Helpers de Liveness ──────────────────────────────────────────────────

  // Generar punto aleatorio dentro del óvalo
  const generateChallengePoint = () => {
    // Definimos el área visible: asumiendo viewBox de la máscara (400x300)
    // Angulo aleatorio entre 0 y 2PI (360 grados)
    const angle = Math.random() * Math.PI * 2;

    // Distancia aleatoria desde el centro (entre 45% y 80% del radio del óvalo)
    const scale = 0.45 + (Math.random() * 0.35);

    // Posicionamos
    const radiusX = 80 * scale;
    const radiusY = 105 * scale;

    // En el SVG original, el origin = (200, 140)
    const targetX = 200 + Math.cos(angle) * radiusX;
    const targetY = 140 + Math.sin(angle) * radiusY;

    return {
      x: targetX,
      y: targetY,
      angle: angle, // Angulo real de la dirección a mover
      direction: 'punto rojo'
    };
  };

  // Cleanup del loop de liveness
  const stopLiveness = () => {
    if (livenessIntervalRef.current) clearInterval(livenessIntervalRef.current);
    if (livenessTimeoutRef.current) clearTimeout(livenessTimeoutRef.current);
    livenessIntervalRef.current = null;
    livenessTimeoutRef.current = null;
  };

  // Iniciar loop de liveness Detection (Challenge-Response)
  const startLivenessLoop = (video) => {
    stopLiveness();
    challengeDoneRef.current = false;
    startNoseRef.current = null;
    smoothedPoseRef.current = null;
    currentChallengeRef.current = null;
    framesHeldRef.current = 0;
    setChallengePoint(null);
    setChallengeDone(false);

    const advanceToCapture = () => {
      stopLiveness();
      setTimeout(() => {
        setStep("capturing");
        setChallengePoint(null);
      }, 600);
    };

    livenessIntervalRef.current = setInterval(async () => {
      if (!video || video.paused || video.ended) return;
      try {
        const detections = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
          .withFaceLandmarks();

        if (!detections) return;

        // Obtener la punta de la nariz y los ojos
        const nose = detections.landmarks.getNose();
        const leftEye = detections.landmarks.getLeftEye();
        const rightEye = detections.landmarks.getRightEye();

        if (!nose || nose.length < 4 || !leftEye || !rightEye) {
          setProximityMessage("No se detecta correctamente el rostro");
          return;
        }

        // --- VALIDACIÓN DE PROXIMIDAD Y CENTRADO ---
        if (!challengeDoneRef.current) {
          const box = detections.detection.box;
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const faceCenterX = box.x + box.width / 2;
          const faceCenterY = box.y + box.height / 2;
          const idealCenterX = vw * 0.5;
          const idealCenterY = vh * 0.466; // El ovalo está un poco arriba del puro centro

          const heightRatio = box.height / vh;

          let positionGood = false;
          if (heightRatio < 0.25) {
            setProximityMessage("Acércate un poco más a la cámara");
          } else if (heightRatio > 0.60) {
            setProximityMessage("Aléjate un poco de la cámara");
          } else if (Math.abs(faceCenterX - idealCenterX) > vw * 0.15 || Math.abs(faceCenterY - idealCenterY) > vh * 0.15) {
            setProximityMessage("Centra tu rostro dentro del óvalo");
          } else {
            setProximityMessage("¡Posición perfecta!");
            positionGood = true;
          }

          // Si no está en una buena posición y aún no ha iniciado el reto, no lo generamos todavía
          if (!currentChallengeRef.current) {
            if (!positionGood) {
              startNoseRef.current = null;
              smoothedPoseRef.current = null;
              return;
            } else {
              const chal = generateChallengePoint();
              currentChallengeRef.current = chal;
              setChallengePoint(chal);
              console.log(`🎯 Nuevo Punto Liveness generado tras posición perfecta`);
            }
          }
        }

        const noseTip = nose[3]; // Punta de la nariz

        // Calcular el punto central entre ambos ojos
        const eyesCenterX = (leftEye[0].x + rightEye[3].x) / 2;
        const eyesCenterY = (leftEye[0].y + rightEye[3].y) / 2;

        // Calcular la posición RELATIVA de la nariz respecto al centro de los ojos
        const relativeNoseX = noseTip.x - eyesCenterX;
        const relativeNoseY = noseTip.y - eyesCenterY;

        // Medir distancia y ángulo de los ojos para Normalizar Escala y Rotación plana (2D)
        const eyeDistance = Math.sqrt(
          Math.pow(rightEye[3].x - leftEye[0].x, 2) + Math.pow(rightEye[3].y - leftEye[0].y, 2)
        );
        const eyeAngle = Math.atan2(rightEye[3].y - leftEye[0].y, rightEye[3].x - leftEye[0].x);

        // Rotar el vector de la nariz para ignorar la inclinación de la foto (Invariancia de Rotación 2D)
        const rotatedNoseX = relativeNoseX * Math.cos(-eyeAngle) - relativeNoseY * Math.sin(-eyeAngle);
        const rotatedNoseY = relativeNoseX * Math.sin(-eyeAngle) + relativeNoseY * Math.cos(-eyeAngle);

        // Normalizar por la distancia de los ojos para ignorar acercamiento/alejamiento de foto (Invariancia de Escala 2D)
        const normNoseX = rotatedNoseX / eyeDistance;
        const normNoseY = rotatedNoseY / eyeDistance;

        // --- COMPROBACIÓN 3D ANTI-SPOOFING (PARALLAX FACIAL) ---
        const jaw = detections.landmarks.getJawOutline();
        let parallaxRatio = 1.0;

        if (jaw && jaw.length === 17) {
          const leftJawEdge = jaw[0];
          const rightJawEdge = jaw[16];

          const distToLeftEdge = noseTip.x - leftJawEdge.x;
          const distToRightEdge = rightJawEdge.x - noseTip.x;

          if (distToRightEdge > 0 && distToLeftEdge > 0) {
            parallaxRatio = distToLeftEdge / distToRightEdge;
          }
        }

        // --- FILTRO DE ESTABILIZACIÓN (EMA) ---
        // Filtramos las pulsaciones rápidas (jitter de IA) o sacudidas irreales del papel
        const alpha = 0.3; // Factor de suavizado (menor = más suave/lento)
        if (!smoothedPoseRef.current) {
          smoothedPoseRef.current = { x: normNoseX, y: normNoseY };
        } else {
          smoothedPoseRef.current.x = (alpha * normNoseX) + ((1 - alpha) * smoothedPoseRef.current.x);
          smoothedPoseRef.current.y = (alpha * normNoseY) + ((1 - alpha) * smoothedPoseRef.current.y);
        }

        const stableNoseX = smoothedPoseRef.current.x;
        const stableNoseY = smoothedPoseRef.current.y;

        // Si es el primer cuadro detectado con éxito, guardamos la "pose" inicial normalizada y estable
        if (!startNoseRef.current) {
          startNoseRef.current = { x: stableNoseX, y: stableNoseY };
          return;
        }

        // Calcular cuánto cambió la POSICIÓN RELATIVA verdadera (Rotación 3D pura Pitch/Yaw)
        // Convertimos de vuelta a escala de píxeles para mantener la sensibilidad de umbral original
        const deltaX = -(stableNoseX - startNoseRef.current.x) * eyeDistance; // Invertido por Espejo
        const deltaY = (stableNoseY - startNoseRef.current.y) * eyeDistance;

        // Calcular magnitud de la rotación 3D (cuánto rotó la cabeza)
        const rotationMoved3D = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Si la cabeza rotó de forma evidente proporcional al tamaño de los ojos
        if (rotationMoved3D > eyeDistance * 0.22) {
          // Calcular ángulo de movimiento de la cabeza interactiva (-PI a PI)
          let userAngle = Math.atan2(deltaY, deltaX);
          if (userAngle < 0) userAngle += 2 * Math.PI; // Normalizar 0 a 2*PI

          // Calcular diferencia con el ángulo del target
          let angleDiff = Math.abs(userAngle - currentChallengeRef.current.angle);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

          // Tolerancia de ~50 grados para movimiento diagonal natural
          if (angleDiff < Math.PI / 3.6) {

            // VALIDACIÓN ESTRICTA DE PROFUNDIDAD 3D (YAW)
            let isTrue3D = true;
            if (Math.abs(deltaX) > eyeDistance * 0.15) {
              const isLookingRight = deltaX > 0;
              if (isLookingRight && parallaxRatio > 0.85) {
                isTrue3D = false;
              } else if (!isLookingRight && parallaxRatio < 1.15) {
                isTrue3D = false;
              }
            }

            if (isTrue3D) {
              framesHeldRef.current += 1;
              if (framesHeldRef.current >= 3) {
                console.log("✅ Rotación 3D intencional correcta hacia el punto detectado");
                challengeDoneRef.current = true;
                setChallengeDone(true);
                advanceToCapture();
              }
            } else {
              framesHeldRef.current = 0;
              setProximityMessage("Movimiento irreal. Gire el cuello, no la cámara.");
            }
          } else {
            framesHeldRef.current = 0;
          }
        } else {
          framesHeldRef.current = Math.max(0, framesHeldRef.current - 1);
        }

      } catch (err) {
        // silenciar error de detección por frame
      }
    }, 150);

    // Timeout de 20s para liveness
    livenessTimeoutRef.current = setTimeout(() => {
      stopLiveness();
      setErrorMessage("Verificación de vida fallida. Sigue el punto verde mostrado en pantalla.");
      setStep("error");
    }, 20000);
  };

  // ── Fin helpers de Liveness ──────────────────────────────────────────────

  // Recortar video al area del ovalo guia
  const getCroppedOvalFrame = (video) => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    // Calcular area visible (object-cover con aspect 4:3)
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

    // Mapear ovalo SVG (viewBox 400x300, ellipse cx=200 cy=140 rx=80 ry=105)
    const oLeft = 120 / 400, oTop = 35 / 300;
    const oW = 160 / 400, oH = 210 / 300;
    const cropX = sx + sw * oLeft;
    const cropY = sy + sh * oTop;
    const cropW = sw * oW;
    const cropH = sh * oH;

    // Reusar canvas
    if (!cropCanvasRef.current) {
      cropCanvasRef.current = document.createElement('canvas');
    }
    const canvas = cropCanvasRef.current;
    const cw = 280, ch = Math.round(280 * (cropH / cropW));
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    // Limpiar y aplicar clip eliptico
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cw / 2, ch / 2, cw / 2, ch / 2, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cw, ch);
    ctx.restore();

    return canvas;
  };

  const {
    modelsLoaded,
    faceDetected,
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
      stopLiveness();
    };
  }, []);

  // Cargar modelos e iniciar camara al montar (patron identico a FacialAuthModal)
  useEffect(() => {
    if (!shouldMaintainConnection) return;

    // Verificar si la cámara está registrada antes de intentar usarla
    let isRegistered = false;
    try {
      isRegistered = JSON.parse(localStorage.getItem("cached_camera_registered") || "false");
    } catch {
      isRegistered = false;
    }

    if (!isRegistered) {
      console.warn("🚫 [AsistenciaFacial] Cámara no registrada. Abortando inicio de cámara.");
      setErrorMessage("La cámara no está registrada en el sistema. Contacte al administrador.");
      setStep("error");
      if (backgroundMode) setShowModal(true);
      return;
    }

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

  // Iniciar liveness detection cuando los modelos esten listos
  useEffect(() => {
    if (step !== "liveness" || !modelsLoaded || !shouldMaintainConnection) return;

    const video = document.getElementById("facialAttendanceVideo");
    if (!video) return;

    const handleCanPlay = () => {
      if (video.readyState >= 2) startLivenessLoop(video);
    };

    video.addEventListener("loadeddata", handleCanPlay);
    video.addEventListener("canplay", handleCanPlay);

    if (video.readyState >= 2) startLivenessLoop(video);

    return () => {
      video.removeEventListener("loadeddata", handleCanPlay);
      video.removeEventListener("canplay", handleCanPlay);
      stopLiveness();
    };
  }, [step, modelsLoaded, shouldMaintainConnection]);

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
          // Recortar al area del ovalo guia
          const croppedFrame = getCroppedOvalFrame(video);
          if (!croppedFrame) return;

          const detections = await faceapi
            .detectSingleFace(croppedFrame, new faceapi.TinyFaceDetectorOptions({
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

      // identificarPorFacial retorna { usuario: empleado } - datos del empleado directamente
      empleadoData = response.usuario;
      const empleadoId = empleadoData.id_empleado || empleadoData.id;
      const usuarioId = empleadoData.id_usuario || empleadoData.usuario_id;

      if (!empleadoId) {
        throw new Error("No se encontro informacion del empleado");
      }

      console.log("Empleado identificado:", empleadoData?.nombre || empleadoId);

      // 2. Registrar asistencia
      console.log("Registrando asistencia...");
      const departamentoId = await obtenerDepartamentoEmpleado(empleadoId);

      const data = await registrarAsistenciaEnServidor({
        empleadoId: empleadoId,
        departamentoId,
        metodoRegistro: 'FACIAL',
        token: localStorage.getItem('auth_token') || ''
      });

      // 3. Procesar resultado exitoso
      const now = new Date();
      const horaActual = now.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const clasificacionFinal = data.data?.clasificacion || data.data?.estado || 'puntual';
      const tipoRegistro = data.data?.tipo || 'entrada';
      const tipoMovimiento = tipoRegistro === 'salida' ? 'SALIDA' : 'ENTRADA';

      const { estadoTexto, tipoEvento } = obtenerInfoClasificacion(clasificacionFinal, tipoRegistro);

      agregarEvento({
        user: empleadoData?.nombre || 'Usuario',
        action: `${tipoMovimiento === 'SALIDA' ? 'Salida' : 'Entrada'} registrada (${estadoTexto}) - Facial`,
        type: tipoEvento,
      });

      // Mensaje de voz estandarizado
      const tipoVoz = tipoMovimiento === 'SALIDA' ? 'salida' : 'entrada';
      const voiceMessage = `Registro ${tipoVoz} exitoso`;

      const utterance = new SpeechSynthesisUtterance(voiceMessage);
      utterance.lang = "es-MX";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);

      setResult({
        success: true,
        message: "Asistencia registrada",
        empleado: empleadoData,
        usuario: empleadoData,
        empleadoId: empleadoId,
        tipoMovimiento: tipoMovimiento,
        hora: data.data?.fecha_registro
          ? new Date(data.data.fecha_registro).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
          : horaActual,
        estado: clasificacionFinal,
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

      // === FALLBACK OFFLINE ===
      // NOTA: identificarPorFacial() captura todos los errores internamente y retorna
      // { success: false, error: "..." }. El throw de línea 536 convierte ese mensaje
      // en un Error, pero ya NO contiene el texto original "Failed to fetch".
      // Por eso también chequeamos navigator.onLine y el mensaje genérico del servicio.
      const isNetworkError = !navigator.onLine                           // sin conexión a nivel OS
        || error.name === 'TypeError'
        || error.message.includes('Failed to fetch')
        || error.message.includes('NetworkError')
        || error.message.includes('ERR_INTERNET_DISCONNECTED')
        || error.message.includes('fetch')
        || error.message.includes('Error al identificar rostro')         // mensaje genérico cuando falla la red
        || error.message.includes('Error HTTP: 0')                       // sin respuesta del servidor
        || error.isApiOffline
        || error.message.includes('Server Error');

      if (isNetworkError && window.electronAPI && window.electronAPI.offlineDB) {
        console.log('📴 [AsistenciaFacial] Sin conexión — intentando autenticación offline...');

        try {
          // 1. Importar servicios offline
          const {
            identificarPorFacialOffline,
            guardarAsistenciaOffline
          } = await import('../../services/offlineAuthService');

          // Convertir Base64 a array de float para identificar
          const base64ToFloat32Array = (base64) => {
            const binary_string = window.atob(base64);
            const len = binary_string.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binary_string.charCodeAt(i);
            }
            return new Float32Array(bytes.buffer);
          };

          let floatDescriptor;
          try {
            floatDescriptor = base64ToFloat32Array(descriptorBase64);
          } catch (e) {
            throw new Error("No se pudo parsear descriptor facial para login offline");
          }

          const resultadoOffline = await identificarPorFacialOffline(floatDescriptor);

          if (!resultadoOffline) {
            throw new Error("Rostro no reconocido en base de datos local");
          }

          const empleadoId = resultadoOffline.empleado_id;
          const empleadoFull = await window.electronAPI.offlineDB.getEmpleado(empleadoId);

          if (!empleadoFull) {
            throw new Error("Empleado no encontrado en base de datos local");
          }

          // Cola Inmediata (Asistencia Cruda / Raw Punch)
          await guardarAsistenciaOffline({
            empleadoId,
            metodoRegistro: 'FACIAL',
          });

          // Mensaje de voz estandarizado offline neutral
          const utterance = new SpeechSynthesisUtterance(
            `Asistencia guardada localmente`
          );
          utterance.lang = "es-MX";
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);

          const resultadoOfflineExito = {
            success: true,
            offline: true,
            message: "Asistencia guardada en dispositivo (Offline). Se sincronizará en automático",
            empleado: empleadoFull,
            empleadoId: empleadoId,
            tipoMovimiento: "OFFLINE",
            hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
            estado: "Pendiente",
            estadoTexto: '📴 Modo Offline',
            clasificacion: 'guardado local',
            usuario: empleadoFull
          };

          setResult(resultadoOfflineExito);
          setStep("success");
          return;

        } catch (offlineError) {
          console.error('❌ [AsistenciaFacial] Error en flujo offline:', offlineError);
          setErrorMessage(`Error Offline: ${offlineError.message}`);
          setResult({
            success: false,
            message: `Error Offline: ${offlineError.message}`,
            noReconocida: offlineError.message?.includes("no reconocido") || offlineError.message?.includes("No se encontr")
          });
          setStep("error");
          return;
        }
      }

      agregarEvento({
        user: empleadoData?.nombre || 'Usuario',
        action: `Error en registro facial - ${error.message}`,
        type: "error",
      });

      // Detectar errores devueltos por la API para mostrar UI amarilla
      const responseData = error.responseData;
      const isBlockCompletedError = error.message && (
        (error.message.includes('bloque') && error.message.includes('completado')) ||
        (error.message.includes('jornada') && error.message.includes('completada'))
      );

      let finalErrorMessage = error.message || "Error al registrar asistencia";
      if (finalErrorMessage.includes("falta directa")) {
        finalErrorMessage = "Registro denegado: Se te ha registrado una falta directa en este turno. No puedes registrar asistencia.";
      }

      setErrorMessage(finalErrorMessage);
      const empleadoIdLocal = empleadoData ? (empleadoData.id_empleado || empleadoData.id) : null;
      setResult({
        success: false,
        message: finalErrorMessage,
        empleado: empleadoData,
        usuario: empleadoData,
        empleadoId: empleadoIdLocal,
        noPuedeRegistrar: responseData?.noPuedeRegistrar || isBlockCompletedError,
        estadoHorario: responseData?.estadoHorario || (isBlockCompletedError ? 'completado' : undefined),
        minutosRestantes: responseData?.minutosRestantes,
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
      (result && !result.success && result.empleadoId) ||
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
        if (authResponse.status >= 500) {
          const error = new Error(`Server Error: ${authResponse.status}`);
          error.isApiOffline = true;
          throw error;
        }
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

      // === FALLBACK OFFLINE LOGIN ===
      const isNetworkError = !navigator.onLine
        || error.name === 'TypeError'
        || error.message.includes('Failed to fetch')
        || error.message.includes('NetworkError')
        || error.message.includes('ERR_INTERNET_DISCONNECTED')
        || error.isApiOffline
        || error.message.includes('Server Error');

      if (isNetworkError && window.electronAPI && window.electronAPI.offlineDB) {
        console.log('📴 [AsistenciaFacial] Sin conexión — intentando Login offline...');
        try {
          const empleadoId = result.empleadoId;
          const empleadoFull = await window.electronAPI.offlineDB.getEmpleado(empleadoId);
          if (empleadoFull) {
            const usuarioOffline = {
              id: empleadoFull.usuario_id,
              nombre: empleadoFull.nombre,
              username: empleadoFull.nombre,
              es_empleado: true,
              empleado_id: empleadoId,
              roles: [],
              permisos: [],
              esAdmin: false,
              offline: true,
              metodoAutenticacion: "FACIAL_OFFLINE",
              ...empleadoFull
            };

            guardarSesion(usuarioOffline);

            if (onClose) onClose();

            if (onLoginRequest) {
              onLoginRequest(usuarioOffline);
            }
            return;
          }
        } catch (offlineErr) {
          console.error('❌ [AsistenciaFacial] Error Login Offline:', offlineErr);
        }
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
      setStep("liveness");
      setErrorMessage("");
    } else {
      setIsClosing(true);
      releaseCamera();
      setTimeout(() => {
        if (onClose) onClose();
      }, 300);
    }
  };

  // Reintentar (vuelve al paso de liveness)
  const handleRetry = () => {
    stopLiveness();
    setStep("liveness");
    setResult(null);
    setErrorMessage("");
    isProcessingRef.current = false;
    challengeDoneRef.current = false;
    startNoseRef.current = null;
    setChallengeDone(false);
    setChallengePoint(null);

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
        <div className="bg-gradient-to-r from-[#1976D2] to-[#001A70] px-6 py-4">
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
          {/* Liveness Detection */}
          {(step === "liveness" || step === "capturing") && (
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

                {/* Guias de captura - Ovalo facial con animaciones */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Oscurecer areas fuera del ovalo */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
                    <defs>
                      <mask id="faceMaskOverlay">
                        <rect width="400" height="300" fill="white" />
                        <ellipse cx="200" cy="140" rx="80" ry="105" fill="black" />
                      </mask>
                      {/* Glow filter para deteccion */}
                      <filter id="faceGuideGlow">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      {/* Gradiente para linea de escaneo */}
                      <linearGradient id="scanLineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="30%" stopColor={faceDetected ? "rgba(25, 118, 210, 0.6)" : "rgba(255,255,255,0.3)"} />
                        <stop offset="50%" stopColor={faceDetected ? "rgba(25, 118, 210, 0.9)" : "rgba(255,255,255,0.5)"} />
                        <stop offset="70%" stopColor={faceDetected ? "rgba(25, 118, 210, 0.6)" : "rgba(255,255,255,0.3)"} />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                    {/* Overlay semi-oscuro */}
                    <rect width="400" height="300" fill="rgba(0,0,0,0.45)" mask="url(#faceMaskOverlay)" />
                    {/* Ovalo guia principal */}
                    <ellipse
                      cx="200" cy="140" rx="80" ry="105"
                      fill="none"
                      stroke={faceDetected ? "#1976D2" : "rgba(255,255,255,0.6)"}
                      strokeWidth={faceDetected ? "3" : "2"}
                      strokeDasharray={faceDetected ? "none" : "8 4"}
                      filter={faceDetected ? "url(#faceGuideGlow)" : "none"}
                      style={{ transition: "all 0.4s ease" }}
                    />
                    {/* Segundo ovalo glow (solo visible con rostro detectado) */}
                    {faceDetected && (
                      <ellipse
                        cx="200" cy="140" rx="84" ry="109"
                        fill="none"
                        stroke="rgba(25, 118, 210, 0.25)"
                        strokeWidth="6"
                        style={{ animation: "facePulse 2s ease-in-out infinite" }}
                      />
                    )}
                    {/* Linea de escaneo animada */}
                    {!faceDetected && (
                      <line
                        x1="120" y1="140" x2="280" y2="140"
                        stroke="url(#scanLineGradient)"
                        strokeWidth="2"
                        style={{ animation: "scanLine 2.5s ease-in-out infinite" }}
                      />
                    )}
                    {/* Marcas de alineacion - esquinas */}
                    {/* Superior izquierda */}
                    <path d="M 135 55 L 135 40 L 155 40" fill="none" stroke={faceDetected ? "#1976D2" : "rgba(255,255,255,0.7)"} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s ease" }} />
                    {/* Superior derecha */}
                    <path d="M 265 55 L 265 40 L 245 40" fill="none" stroke={faceDetected ? "#1976D2" : "rgba(255,255,255,0.7)"} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s ease" }} />
                    {/* Inferior izquierda */}
                    <path d="M 135 245 L 135 260 L 155 260" fill="none" stroke={faceDetected ? "#1976D2" : "rgba(255,255,255,0.7)"} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s ease" }} />
                    {/* Inferior derecha */}
                    <path d="M 265 245 L 265 260 L 245 260" fill="none" stroke={faceDetected ? "#1976D2" : "rgba(255,255,255,0.7)"} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s ease" }} />
                    {/* Cruz de alineacion central (sutil) */}
                    <line x1="196" y1="135" x2="204" y2="135" stroke={faceDetected ? "rgba(25,118,210,0.4)" : "rgba(255,255,255,0.2)"} strokeWidth="1" />
                    <line x1="200" y1="131" x2="200" y2="139" stroke={faceDetected ? "rgba(25,118,210,0.4)" : "rgba(255,255,255,0.2)"} strokeWidth="1" />
                    {/* ── Guía visual de Liveness Challenge Point ── */}
                    {step === "liveness" && challengePoint && (
                      <circle
                        cx={challengePoint.x}
                        cy={challengePoint.y}
                        r={challengeDone ? "28" : "18"}
                        fill={challengeDone ? "#22c55e" : "#ef4444"}
                        opacity="1"
                        stroke="white"
                        strokeWidth="4"
                        style={{
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          animation: challengeDone ? 'none' : 'facePulse 1.5s infinite'
                        }}
                      />
                    )}
                  </svg>
                  {/* Keyframes para animaciones */}
                  <style>{`
                    @keyframes scanLine {
                      0% { transform: translateY(-60px); opacity: 0; }
                      15% { opacity: 1; }
                      85% { opacity: 1; }
                      100% { transform: translateY(60px); opacity: 0; }
                    }
                    @keyframes facePulse {
                      0%, 100% { opacity: 0.3; }
                      50% { opacity: 0.8; }
                    }
                  `}</style>

                  {/* ── Guía visual y feedback de Liveness ── */}
                  {step === "liveness" && modelsLoaded && challengePoint && (
                    <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                      <div style={{
                        background: 'rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(6px)',
                        borderRadius: '10px',
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                      }}>
                        <span style={{
                          color: challengeDone ? '#86efac' : 'white',
                          fontSize: 14, fontWeight: 600,
                          transition: 'all 0.3s ease',
                          textAlign: 'center'
                        }}>
                          {challengeDone ? '¡Excelente!' : 'Apunta con la nariz hacia el punto rojo'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Indicadores */}
              <div className="space-y-2">
                <p className={`text-center text-sm font-medium ${proximityMessage === "¡Posición perfecta!" || challengeDone
                  ? "text-green-600 dark:text-green-400"
                  : (proximityMessage && !challengePoint)
                    ? "text-[#1976D2] dark:text-[#42A5F5]"
                    : "text-gray-700 dark:text-gray-300"
                  }`}>
                  {!modelsLoaded && "Cargando modelos de reconocimiento..."}
                  {modelsLoaded && step === "liveness" && !challengePoint && (proximityMessage || "Coloca tu rostro frente a la cámara...")}
                  {modelsLoaded && step === "liveness" && challengePoint && !challengeDone && "Apunta con la nariz hacia el punto rojo"}
                  {modelsLoaded && step === "capturing" && "Mantén tu rostro quieto para el registro..."}
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

          {/* Identificando */}
          {step === "identifying" && (
            <div className="bg-[#E3F2FD] dark:bg-[#1565C0]/20 border border-[#BBDEFB] dark:border-[#1565C0]/40 rounded-xl p-8 text-center">
              <div className="relative">
                <Camera className="w-20 h-20 mx-auto mb-4 text-[#1976D2] dark:text-[#42A5F5] animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 border-4 border-[#BBDEFB] dark:border-[#1565C0]/40 border-t-[#1976D2] dark:border-t-[#42A5F5] rounded-full animate-spin"></div>
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
              {result.clasificacion === 'retardo_a' || result.clasificacion === 'retardo_b' || result.clasificacion === 'salida_temprana' ? (
                <AlertTriangle className="w-16 h-16 mx-auto mb-3 text-yellow-600 dark:text-yellow-400" />
              ) : result.clasificacion === 'falta' ? (
                <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle className="w-16 h-16 mx-auto mb-3 text-green-600 dark:text-green-400" />
              )}

              <p className={`font-bold text-lg mb-1 ${result.clasificacion === 'falta'
                ? "text-red-800 dark:text-red-300"
                : result.clasificacion === 'retardo_a' || result.clasificacion === 'retardo_b' || result.clasificacion === 'salida_temprana'
                  ? "text-yellow-800 dark:text-yellow-300"
                  : "text-green-800 dark:text-green-300"
                }`}>
                {result.offline ? "Asistencia Pendiente" : "Asistencia Registrada"}
              </p>

              {result.empleado?.nombre && (
                <p className="text-gray-700 dark:text-gray-300 text-lg">
                  {result.empleado.nombre}
                </p>
              )}

              {result.tipoMovimiento && (
                <div className="mt-2">
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                    {result.offline ? (
                      <>Pendiente de validación {result.hora && `a las ${result.hora}`}</>
                    ) : (
                      <>{result.tipoMovimiento === "ENTRADA" ? "Entrada" : "Salida"} registrada {result.hora && `a las ${result.hora}`}</>
                    )}
                  </p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${result.clasificacion === "entrada" || result.clasificacion === "salida_puntual"
                      ? "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300"
                      : result.clasificacion === "retardo_a" || result.clasificacion === "retardo_b" || result.clasificacion === "salida_temprana"
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
                className="w-full px-4 py-3 bg-[#1976D2] hover:bg-[#1565C0] disabled:bg-[#90CAF9] disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-3"
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
            <div className={`rounded-xl p-6 text-center ${result?.noPuedeRegistrar
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
                    className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold ${result.estadoHorario === "completado"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300"
                      : result.estadoHorario === "tiempo_insuficiente"
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300"
                      }`}
                  >
                    {result.estadoHorario === "completado"
                      ? "Jornada completada"
                      : result.estadoHorario === "tiempo_insuficiente"
                        ? `Aún no disponible`
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
                    className="px-4 py-2 md:px-5 md:py-3 2xl:px-6 2xl:py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl text-sm md:text-base 2xl:text-lg font-medium transition-colors"
                  >
                    Intentar de nuevo
                  </button>
                </>
              ) : (
                <>
                  <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-300 font-bold text-lg mb-1">
                    {(result?.message?.includes("Registro denegado") || errorMessage?.includes("Registro denegado")) ? "Registro Denegado" : "Error"}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                    {(errorMessage?.replace("Registro denegado: ", "") || result?.message?.replace("Registro denegado: ", "") || "Error al registrar asistencia")}
                  </p>

                  {result?.empleadoId && (
                    <>
                      {/* Separador */}
                      <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

                      {/* Opcion de abrir sesion */}
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                        ¿Deseas abrir tu sesión de todas formas?
                      </p>

                      <button
                        onClick={procesarLoginBiometrico}
                        disabled={processingLogin || !loginHabilitado}
                        className="w-full px-4 py-3 md:py-4 2xl:py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-xl font-medium text-base md:text-lg 2xl:text-xl transition-colors flex items-center justify-center gap-2 mb-4"
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
                            Abrir Sesión
                          </>
                        )}
                      </button>

                      {!processingLogin && (
                        <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-4">
                          <Timer className="w-4 h-4" />
                          <span>
                            Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleRetry}
                      className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 md:py-3 md:px-5 2xl:py-4 2xl:px-6 rounded-xl text-sm md:text-base 2xl:text-lg transition-colors"
                    >
                      Intentar de Nuevo
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 font-semibold py-2 px-4 md:py-3 md:px-5 2xl:py-4 2xl:px-6 rounded-xl text-sm md:text-base 2xl:text-lg transition-colors"
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
