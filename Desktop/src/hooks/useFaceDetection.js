import { useRef, useState, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';

// Mantenemos el Singleton global para los modelos
let modelsLoadedGlobal = false;
let loadingPromise = null;

export function useFaceDetection() {
  const [modelsLoaded, setModelsLoaded] = useState(modelsLoadedGlobal);
  const [faceDetected, setFaceDetected] = useState(false);
  const [livenessDetected, setLivenessDetected] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [detectionError, setDetectionError] = useState(null);

  // Refs de estado interno (para no re-renderizar durante el bucle)
  const isScanning = useRef(false);
  const detectionTimeout = useRef(null);
  
  // Refs para lógica de Challenge Point
  const challengeDoneRef = useRef(false);
  const startNoseRef = useRef(null);
  const smoothedPoseRef = useRef(null); // Ref de filtro temporal (EMA)
  const startTimeRef = useRef(0);
  
  // Guardamos el punto actual (puede leerlo el componente)
  const [challengePoint, setChallengePoint] = useState(null);

  /**
   * Carga Singleton de modelos
   */
  const loadModels = useCallback(async () => {
    if (modelsLoadedGlobal) {
      setModelsLoaded(true);
      return;
    }
    if (loadingPromise) {
      await loadingPromise;
      setModelsLoaded(true);
      return;
    }

    try {
      console.log('📦 Iniciando carga de modelos...');
      // Ajuste automático de ruta para Electron (file://) vs Web (http://)
      const MODEL_URL = window.location.protocol === 'file:' ? './models' : '/models';

      loadingPromise = Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      await loadingPromise;
      console.log('✅ Modelos cargados');
      modelsLoadedGlobal = true;
      setModelsLoaded(true);
    } catch (error) {
      console.error('❌ Error cargando modelos:', error);
      setDetectionError('Error cargando modelos IA');
      loadingPromise = null; 
    }
  }, []);

  // Generar punto aleatorio dentro del óvalo
  const generateChallengePoint = useCallback(() => {
    // Angulo aleatorio entre 0 y 2PI (360 grados)
    const angle = Math.random() * Math.PI * 2;
    
    // Distancia aleatoria desde el centro (entre 45% y 80% del radio del óvalo)
    const scale = 0.45 + (Math.random() * 0.35);
    
    const radiusX = 80 * scale;
    const radiusY = 105 * scale;
    
    // Coordinadas origen estaticas (SVG mask centro) = 200, 140
    const targetX = 200 + Math.cos(angle) * radiusX;
    const targetY = 140 + Math.sin(angle) * radiusY;

    return { 
      x: targetX, 
      y: targetY, 
      angle: angle,
    };
  }, []);

  /**
   * Bucle de Detección Recursivo
   * Reemplaza a setInterval para evitar saturación de CPU
   */
  const detectionLoop = async (videoElement, onSuccess, onError) => {
    // 1. Verificar si debemos seguir escaneando
    if (!isScanning.current || !videoElement || videoElement.paused || videoElement.ended) {
      return;
    }

    const startProcessTime = Date.now();

    try {
      // 2. Ejecutar detección
      // inputSize 320 es mejor balance que 224 para distancias de escritorio
      const detections = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detections) {
        setFaceDetected(true);
        
        // --- LÓGICA DE LIVENESS (Challenge Point) ---
        const nose = detections.landmarks.getNose();
        const leftEye = detections.landmarks.getLeftEye();
        const rightEye = detections.landmarks.getRightEye();

        if (nose && nose.length >= 4 && leftEye && rightEye) {
          const noseTip = nose[3];

          // Calcular el punto central entre ambos ojos
          const eyesCenterX = (leftEye[0].x + rightEye[3].x) / 2;
          const eyesCenterY = (leftEye[0].y + rightEye[3].y) / 2;

          // Posición relativa de la nariz (Rotación de cabeza vs Posición en cámara)
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

          if (!startNoseRef.current) {
            startNoseRef.current = { x: stableNoseX, y: stableNoseY };
          } else {
            // Evaluamos el movimiento si el componente ha generado un challengePoint en el DOM 
            // Para simplificar la inyección de la coordenada generamos uno local si no existe (al inicio)
            let actChallenge = null;
            setChallengePoint(prev => {
              actChallenge = prev || generateChallengePoint();
              return actChallenge;
            });

            if (actChallenge) {
               // Invertir deltaX porque el video web suele renderizarse en modo espejo
               // Convertimos de vuelta a escala de píxeles para mantener la sensibilidad de umbral original
               const deltaX = -(stableNoseX - startNoseRef.current.x) * eyeDistance;
               const deltaY = (stableNoseY - startNoseRef.current.y) * eyeDistance;
               const rotationMoved3D = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

               // Evaluamos si hubo rotación pura 3D (20px relativos para evadir jitter)
               if (rotationMoved3D > 20) {
                   let userAngle = Math.atan2(deltaY, deltaX);
                   if (userAngle < 0) userAngle += 2 * Math.PI;

                   let angleDiff = Math.abs(userAngle - actChallenge.angle);
                   if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

                   // Tolerancia de ~45 grados (PI/4)
                   if (angleDiff < Math.PI / 4) {
                      challengeDoneRef.current = true;
                      setDetectionProgress(100);
                   }
               }
            }
          }
        }

        // --- VERIFICACIÓN DE ÉXITO ---
        if (challengeDoneRef.current && !livenessDetected) {
            setLivenessDetected(true);
            setDetectionProgress(100);
            
            // Éxito: Detenemos el bucle
            isScanning.current = false;
            
            // Copiar datos para evitar referencias perdidas
            const descriptor = new Float32Array(detections.descriptor);
            
            onSuccess?.({
              descriptor: Array.from(descriptor),
              detection: detections.detection,
              landmarks: detections.landmarks
            });
            return; // Salir del bucle
        }

        // Progreso parcial si ya hay rostro
        if (!challengeDoneRef.current) {
           setDetectionProgress((prev) => Math.min(prev + 2, 40)); 
        }

      } else {
        // No hay rostro
        setFaceDetected(false);
        setDetectionProgress((prev) => Math.max(0, prev - 5));
      }

    } catch (error) {
      console.error(error);
      // No detenemos el bucle por un error de un frame, solo logueamos
    }

    // 3. Programar el siguiente frame
    // Calculamos cuánto tardó este frame para ajustar el delay
    const processDuration = Date.now() - startProcessTime;
    // Intentamos mantener aprox 150-200ms entre frames
    const delay = Math.max(50, 200 - processDuration);
    
    if (isScanning.current) {
      detectionTimeout.current = setTimeout(() => 
        detectionLoop(videoElement, onSuccess, onError), 
      delay);
    }
  };

  /**
   * Iniciar proceso
   */
  const startFaceDetection = async (videoElement, onSuccess, onError) => {
    // Limpieza de seguridad previa
    stopFaceDetection();

    if (!videoElement) {
      onError?.('Cámara no detectada');
      return;
    }

    // Carga de modelos si faltan
    if (!modelsLoadedGlobal) {
      try {
        await loadModels();
      } catch (e) {
        onError?.('Error inicializando IA');
        return;
      }
    }

    // Reiniciar estados
    challengeDoneRef.current = false;
    startNoseRef.current = null;
    setChallengePoint(generateChallengePoint());
    startTimeRef.current = Date.now();
    isScanning.current = true; // Bandera maestra
    
    setFaceDetected(false);
    setLivenessDetected(false);
    setDetectionProgress(0);
    setDetectionError(null);

    // Iniciar bucle
    detectionLoop(videoElement, onSuccess, onError);

    // Timeout de seguridad general (30s)
    setTimeout(() => {
      if (isScanning.current) {
        stopFaceDetection();
        setDetectionError('Tiempo agotado. Intente acercarse más.');
        onError?.('Tiempo agotado');
      }
    }, 30000);
  };

  const stopFaceDetection = () => {
    isScanning.current = false;
    if (detectionTimeout.current) {
      clearTimeout(detectionTimeout.current);
      detectionTimeout.current = null;
    }
    setFaceDetected(false);
    setDetectionProgress(0);
    setChallengePoint(null);
  };

  useEffect(() => {
    return () => stopFaceDetection();
  }, []);

  return {
    modelsLoaded,
    faceDetected,
    livenessDetected,
    faceDescriptor,
    detectionProgress,
    detectionError,
    challengePoint,
    loadModels,
    startFaceDetection,
    stopFaceDetection,
  };
}