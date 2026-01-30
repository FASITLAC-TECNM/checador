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
  
  // Refs para lógica de parpadeo
  const blinkCount = useRef(0);
  const eyesClosedFrames = useRef(0);
  const eyesOpenFrames = useRef(0);
  const lastBlinkTime = useRef(0);
  const startTimeRef = useRef(0);

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

  // Cálculo del EAR (Eye Aspect Ratio)
  const calculateEAR = (landmarks) => {
    try {
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const distance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

      const leftEAR = (distance(leftEye[1], leftEye[5]) + distance(leftEye[2], leftEye[4])) / (2.0 * distance(leftEye[0], leftEye[3]));
      const rightEAR = (distance(rightEye[1], rightEye[5]) + distance(rightEye[2], rightEye[4])) / (2.0 * distance(rightEye[0], rightEye[3]));

      return (leftEAR + rightEAR) / 2.0;
    } catch {
      return 0.3;
    }
  };

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
        
        // --- LÓGICA DE LIVENESS MEJORADA ---
        const ear = calculateEAR(detections.landmarks);
        
        // Ajuste dinámico de dificultad:
        // Si lleva más de 4 segundos intentando, hacemos el umbral un poco más permisivo
        // para gente con ojos pequeños o lentes, pero SIN aceptar fotos estáticas.
        const timeElapsed = Date.now() - startTimeRef.current;
        const currentThreshold = timeElapsed > 4000 ? 0.29 : 0.26; 

        // Detectar ojos cerrados
        if (ear < currentThreshold) {
          eyesClosedFrames.current++;
        } else {
          // Detectar apertura tras cierre (Parpadeo completo)
          if (eyesClosedFrames.current > 0) {
             const now = Date.now();
             // Filtrar parpadeos fantasma (ruido) demasiado rápidos (<50ms) o lentos
             if (eyesClosedFrames.current >= 1 && (now - lastBlinkTime.current > 200)) {
                blinkCount.current++;
                lastBlinkTime.current = now;
                console.log(`👁️ Parpadeo válido! (${blinkCount.current})`);
                
                // Feedback visual de progreso
                setDetectionProgress((prev) => Math.min(prev + 50, 90));
             }
             eyesClosedFrames.current = 0;
          }
        }

        // --- VERIFICACIÓN DE ÉXITO ---
        if (blinkCount.current >= 1 && !livenessDetected) {
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

        // Si no ha parpadeado, mostramos progreso parcial de "rostro detectado"
        if (blinkCount.current === 0) {
           setDetectionProgress((prev) => Math.min(prev + 2, 40)); 
        }

      } else {
        // No hay rostro
        setFaceDetected(false);
        eyesClosedFrames.current = 0;
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
    blinkCount.current = 0;
    eyesClosedFrames.current = 0;
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
    loadModels,
    startFaceDetection,
    stopFaceDetection,
  };
}