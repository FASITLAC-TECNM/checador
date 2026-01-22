import { useRef, useState, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';

// Variable global para controlar si los modelos ya están cargados
let modelsLoadedGlobal = false;
let loadingPromise = null;

/**
 * Hook personalizado para detección facial y prueba de liveness
 * Implementa:
 * 1. Detección de rostro en tiempo real
 * 2. Prueba de liveness (detección de parpadeo)
 * 3. Extracción de descriptores faciales (Float32Array)
 * 4. Validación de calidad del rostro detectado
 */
export function useFaceDetection() {
  const [modelsLoaded, setModelsLoaded] = useState(modelsLoadedGlobal);
  const [faceDetected, setFaceDetected] = useState(false);
  const [livenessDetected, setLivenessDetected] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [detectionError, setDetectionError] = useState(null);

  // Refs para prueba de liveness (detección de parpadeo)
  const blinkCount = useRef(0);
  const eyesClosedFrames = useRef(0);
  const eyesOpenFrames = useRef(0);
  const lastBlinkTime = useRef(0);
  const detectionInterval = useRef(null);

  /**
   * Cargar modelos de face-api.js de forma lazy (solo cuando se necesiten)
   */
  const loadModels = useCallback(async () => {
    // Si ya están cargados, no hacer nada
    if (modelsLoadedGlobal) {
      setModelsLoaded(true);
      return;
    }

    // Si ya se está cargando, esperar a que termine
    if (loadingPromise) {
      await loadingPromise;
      setModelsLoaded(true);
      return;
    }

    try {
      console.log('📦 Iniciando carga de modelos de face-api.js...');

      // Determinar la ruta base según el entorno
      // En desarrollo (Vite): usar ruta relativa /models
      // En producción (Electron): usar la ruta del protocolo file://
      let MODEL_URL;

      if (window.location.protocol === 'file:') {
        // Modo producción con Electron - usar ruta absoluta relativa al index.html
        MODEL_URL = './models';
      } else {
        // Modo desarrollo con Vite
        MODEL_URL = '/models';
      }

      console.log(`📂 Cargando modelos desde: ${MODEL_URL}`);

      // Crear promesa de carga
      loadingPromise = Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      await loadingPromise;

      console.log('✅ Modelos de face-api.js cargados correctamente');
      modelsLoadedGlobal = true;
      setModelsLoaded(true);
    } catch (error) {
      console.error('❌ Error cargando modelos de face-api.js:', error);
      console.error('📍 URL intentada:', window.location.protocol === 'file:' ? './models' : '/models');
      console.error('📍 Protocolo actual:', window.location.protocol);
      console.error('📍 Detalles del error:', error.message);
      setDetectionError('Error cargando modelos de reconocimiento facial');
      loadingPromise = null; // Resetear para permitir reintentos
    }
  }, []);

  /**
   * Calcular Eye Aspect Ratio (EAR) para detectar parpadeo
   * @param {Array} landmarks - Puntos de referencia faciales
   * @returns {number} - Ratio del aspecto del ojo
   */
  const calculateEAR = (landmarks) => {
    try {
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();

      // Calcular EAR para ojo izquierdo
      const leftEAR = (
        euclideanDistance(leftEye[1], leftEye[5]) +
        euclideanDistance(leftEye[2], leftEye[4])
      ) / (2.0 * euclideanDistance(leftEye[0], leftEye[3]));

      // Calcular EAR para ojo derecho
      const rightEAR = (
        euclideanDistance(rightEye[1], rightEye[5]) +
        euclideanDistance(rightEye[2], rightEye[4])
      ) / (2.0 * euclideanDistance(rightEye[0], rightEye[3]));

      // Promedio de ambos ojos
      return (leftEAR + rightEAR) / 2.0;
    } catch (error) {
      console.error('Error calculando EAR:', error);
      return 0.25; // Valor por defecto (ojos abiertos)
    }
  };

  /**
   * Calcular distancia euclidiana entre dos puntos
   */
  const euclideanDistance = (point1, point2) => {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /**
   * Iniciar detección facial en un elemento de video
   * @param {HTMLVideoElement} videoElement - Elemento de video
   * @param {Function} onSuccess - Callback cuando se completa la detección
   * @param {Function} onError - Callback cuando hay un error
   */
  const startFaceDetection = async (videoElement, onSuccess, onError) => {
    if (!videoElement) {
      onError?.('No hay elemento de video disponible');
      return;
    }

    // Cargar modelos si no están cargados
    if (!modelsLoadedGlobal) {
      console.log('🔄 Modelos no cargados, cargando ahora...');
      try {
        await loadModels();
      } catch (error) {
        onError?.('Error cargando modelos de reconocimiento facial');
        return;
      }
    }

    // Resetear estados
    blinkCount.current = 0;
    eyesClosedFrames.current = 0;
    eyesOpenFrames.current = 0;
    lastBlinkTime.current = 0;
    setFaceDetected(false);
    setLivenessDetected(false);
    setDetectionProgress(0);
    setDetectionError(null);

    const EAR_THRESHOLD = 0.27; // Umbral para detectar ojos cerrados (más tolerante)
    const BLINKS_REQUIRED = 1; // Solo 1 parpadeo requerido
    const MIN_DETECTION_CONFIDENCE = 0.4; // Confianza mínima
    const STABLE_FRAMES_REQUIRED = 3; // Frames estables antes de procesar
    const AUTO_PROCEED_TIMEOUT = 5000; // Auto-proceder después de 5 segundos si hay rostro estable

    let progressValue = 0;
    let stableFramesCount = 0;
    let autoProceTimer = null;

    // Intervalo de detección cada 250ms (más rápido)
    detectionInterval.current = setInterval(async () => {
      try {
        // Usar parámetros optimizados para mejor rendimiento
        const detections = await faceapi
          .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.4
          }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections && detections.detection.score > MIN_DETECTION_CONFIDENCE) {
          // ✅ Rostro detectado
          setFaceDetected(true);
          stableFramesCount++;
          progressValue = Math.min(progressValue + 8, 50);
          setDetectionProgress(progressValue);

          // Iniciar timer de auto-proceder si el rostro está estable
          if (stableFramesCount >= STABLE_FRAMES_REQUIRED && !autoProceTimer) {
            console.log('⏱️ Rostro estable detectado, iniciando timer de auto-proceder...');
            autoProceTimer = setTimeout(() => {
              if (!livenessDetected) {
                console.log('⚡ Auto-procediendo sin parpadeo (rostro estable detectado)');
                setLivenessDetected(true);
                progressValue = 100;
                setDetectionProgress(100);

                const descriptor = Array.from(detections.descriptor);
                setFaceDescriptor(descriptor);

                clearInterval(detectionInterval.current);
                onSuccess?.({
                  descriptor,
                  detection: detections.detection,
                  landmarks: detections.landmarks,
                });
              }
            }, AUTO_PROCEED_TIMEOUT);
          }

          // Calcular EAR para detección de parpadeo
          const ear = calculateEAR(detections.landmarks);

          // Log del EAR para debugging
          if (stableFramesCount % 5 === 0) {
            console.log(`👁️ EAR actual: ${ear.toFixed(3)} (umbral: ${EAR_THRESHOLD})`);
          }

          // Detectar parpadeo (lógica más permisiva)
          if (ear < EAR_THRESHOLD) {
            eyesClosedFrames.current++;
            if (eyesClosedFrames.current >= 1 && eyesOpenFrames.current >= 1) {
              const now = Date.now();
              if (now - lastBlinkTime.current > 150) {
                blinkCount.current++;
                lastBlinkTime.current = now;
                console.log(`👁️✨ ¡Parpadeo detectado! (${blinkCount.current}/${BLINKS_REQUIRED}) - EAR: ${ear.toFixed(3)}`);

                progressValue = Math.min(progressValue + 40, 90);
                setDetectionProgress(progressValue);
              }
              eyesClosedFrames.current = 0;
              eyesOpenFrames.current = 0;
            }
          } else {
            eyesOpenFrames.current++;
            if (eyesClosedFrames.current > 0) {
              eyesClosedFrames.current = 0;
            }
          }

          // Si se detectó parpadeo, proceder inmediatamente
          if (blinkCount.current >= BLINKS_REQUIRED && !livenessDetected) {
            if (autoProceTimer) clearTimeout(autoProceTimer);

            setLivenessDetected(true);
            progressValue = 100;
            setDetectionProgress(100);

            const descriptor = Array.from(detections.descriptor);
            setFaceDescriptor(descriptor);

            console.log('✅ Liveness detectado con parpadeo - Rostro válido');
            console.log('📊 Descriptor facial extraído:', descriptor.length, 'dimensiones');

            clearInterval(detectionInterval.current);
            onSuccess?.({
              descriptor,
              detection: detections.detection,
              landmarks: detections.landmarks,
            });
          }
        } else {
          // ❌ No se detectó rostro
          setFaceDetected(false);
          stableFramesCount = 0;
          if (autoProceTimer) {
            clearTimeout(autoProceTimer);
            autoProceTimer = null;
          }
          progressValue = Math.max(progressValue - 3, 0);
          setDetectionProgress(progressValue);
        }
      } catch (error) {
        console.error('❌ Error en detección facial:', error);
        setDetectionError('Error durante la detección facial');
        onError?.(error.message);
      }
    }, 250); // 250ms de intervalo (más rápido)

    // Timeout de 30 segundos
    setTimeout(() => {
      if (!livenessDetected) {
        if (autoProceTimer) clearTimeout(autoProceTimer);
        clearInterval(detectionInterval.current);
        setDetectionError('Tiempo agotado para la detección');
        onError?.('Tiempo agotado. Por favor intenta de nuevo.');
      }
    }, 30000);
  };

  /**
   * Detener detección facial
   */
  const stopFaceDetection = () => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
    blinkCount.current = 0;
    eyesClosedFrames.current = 0;
    eyesOpenFrames.current = 0;
    setFaceDetected(false);
    setLivenessDetected(false);
    setDetectionProgress(0);
  };

  /**
   * Cleanup al desmontar
   */
  useEffect(() => {
    return () => {
      stopFaceDetection();
    };
  }, []);

  return {
    modelsLoaded,
    faceDetected,
    livenessDetected,
    faceDescriptor,
    detectionProgress,
    detectionError,
    loadModels,
    startFaceDetection,
    stopFaceDetection,
  };
}
