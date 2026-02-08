// FacialCaptureScreen.js - CON DETECCIÓN FACIAL usando Vision Camera
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Platform,
  ActivityIndicator,
  StatusBar,
  Modal,
} from 'react-native';
import { Camera as VisionCamera, useCameraDevice } from 'react-native-vision-camera';
import { Camera } from 'react-native-vision-camera-face-detector';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const OVAL_WIDTH = SCREEN_WIDTH * 0.65;
const OVAL_HEIGHT = SCREEN_HEIGHT * 0.42;

export const FacialCaptureScreen = ({
  onCapture,
  onCancel,
  darkMode = false
}) => {
  const device = useCameraDevice('front');
  const camera = useRef(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Opciones de detección facial
  const faceDetectionOptions = useRef({
    performanceMode: 'fast',
    classificationMode: 'all',
    landmarkMode: 'all',
    contourMode: 'none',
    trackingEnabled: true,
    minFaceSize: 0.15,
  }).current;

  const [instruction, setInstruction] = useState('Posiciona tu rostro y toca para capturar');
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Estado para detección facial en tiempo real
  const [facesDetected, setFacesDetected] = useState([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [lastFaceData, setLastFaceData] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const faceDetectionTimeout = useRef(null);

  useEffect(() => {
    checkPermissions();
    startPulseAnimation();
  }, []);

  const checkPermissions = async () => {
    const cameraPermission = await VisionCamera.getCameraPermissionStatus();
    if (cameraPermission === 'granted') {
      setHasPermission(true);
    } else {
      const newCameraPermission = await VisionCamera.requestCameraPermission();
      setHasPermission(newCameraPermission === 'granted');
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Callback para actualizar estado de detección facial desde frame processor
  const updateFaceDetection = useCallback((faces) => {
    setFacesDetected(faces);

    if (faces.length > 0) {
      const face = faces[0];
      setLastFaceData(face);

      // Limpiar timeout anterior
      if (faceDetectionTimeout.current) {
        clearTimeout(faceDetectionTimeout.current);
      }

      // Verificar calidad básica del rostro detectado
      const leftEyeOpen = face.leftEyeOpenProbability !== undefined ? face.leftEyeOpenProbability : 1;
      const rightEyeOpen = face.rightEyeOpenProbability !== undefined ? face.rightEyeOpenProbability : 1;
      const yaw = Math.abs(face.yawAngle || 0);
      const roll = Math.abs(face.rollAngle || 0);

      const isGoodQuality =
        leftEyeOpen > 0.3 &&
        rightEyeOpen > 0.3 &&
        yaw < 30 &&
        roll < 30;

      if (isGoodQuality && !countdown && !isProcessing && !isValidating) {
        setFaceDetected(true);
        setInstruction('✓ Rostro detectado - Toca para capturar');
      } else if (!countdown && !isProcessing && !isValidating) {
        setFaceDetected(false);
        // Dar feedback más específico
        if (leftEyeOpen < 0.3 || rightEyeOpen < 0.3) {
          setInstruction('Abre bien los ojos');
        } else if (yaw >= 30) {
          setInstruction('Mira de frente a la cámara');
        } else if (roll >= 30) {
          setInstruction('Mantén la cabeza recta');
        } else {
          setInstruction('Posiciona tu rostro correctamente');
        }
      }

      // Resetear después de 500ms si no detecta más
      faceDetectionTimeout.current = setTimeout(() => {
        setFaceDetected(false);
        if (!countdown && !isProcessing && !isValidating) {
          setInstruction('Posiciona tu rostro en el óvalo');
        }
      }, 500);
    } else {
      setFaceDetected(false);
      setLastFaceData(null);
      if (!countdown && !isProcessing && !isValidating) {
        setInstruction('No se detecta rostro');
      }
    }
  }, [countdown, isProcessing, isValidating]);

  // Callback para el wrapper Camera de face-detector (se ejecuta en JS thread)
  const handleFaceDetection = useCallback((faces) => {
    updateFaceDetection(faces);
  }, [updateFaceDetection]);

  const startCountdown = () => {
    setCountdown(3);
    setInstruction('Mantén la posición');

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(timer);
          handleCapture();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCapture = async () => {
    if (!camera.current || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      setInstruction('📸 Capturando foto...');

      // 1. CAPTURAR LA FOTO
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: 'off',
        skipMetadata: true,
      });

      console.log('📸 Foto capturada:', photo.path);

      // Obtener info del archivo
      const fileUri = Platform.OS === 'ios' ? photo.path : `file://${photo.path}`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (!fileInfo.exists || fileInfo.size < 50000) {
        throw new Error('La captura falló. Intenta de nuevo con mejor iluminación.');
      }

      // 2. USAR DATOS DE LA ÚLTIMA DETECCIÓN FACIAL
      setInstruction('🔍 Analizando rostro...');
      setIsValidating(true);

      console.log('🔍 Usando datos de detección facial en tiempo real...');

      // 3. VERIFICAR QUE REALMENTE HAY UNA CARA
      if (!lastFaceData) {
        setIsValidating(false);
        setIsProcessing(false);
        setCountdown(null);

        Alert.alert(
          '❌ No se detectó rostro',
          'No se detectó ningún rostro en el momento de la captura.\n\nPor favor:\n• Asegúrate de que tu rostro esté visible\n• Verifica que haya buena iluminación\n• Posiciónate dentro del óvalo',
          [
            {
              text: 'Tomar otra foto',
              onPress: () => {
                setInstruction('Posiciona tu rostro en el óvalo');
              }
            }
          ]
        );
        return;
      }

      // 4. USAR LOS DATOS REALES DE LA CARA DETECTADA
      const detectedFace = lastFaceData;

      console.log('✅ Rostro detectado:', {
        bounds: detectedFace.bounds,
        rollAngle: detectedFace.rollAngle,
        yawAngle: detectedFace.yawAngle,
      });

      // Validar calidad básica
      const leftEyeOpen = detectedFace.leftEyeOpenProbability !== undefined ? detectedFace.leftEyeOpenProbability : 1;
      const rightEyeOpen = detectedFace.rightEyeOpenProbability !== undefined ? detectedFace.rightEyeOpenProbability : 1;
      const yaw = Math.abs(detectedFace.yawAngle || 0);
      const roll = Math.abs(detectedFace.rollAngle || 0);

      if (leftEyeOpen < 0.2 || rightEyeOpen < 0.2 || yaw > 40 || roll > 40) {
        setIsValidating(false);
        setIsProcessing(false);
        setCountdown(null);

        Alert.alert(
          '⚠️ Calidad insuficiente',
          'Se detectó un rostro pero la calidad no es suficiente.\n\n' +
          (leftEyeOpen < 0.2 || rightEyeOpen < 0.2 ? '• Mantén los ojos abiertos\n' : '') +
          (yaw > 40 ? '• Mira de frente a la cámara\n' : '') +
          (roll > 40 ? '• Mantén la cabeza recta\n' : ''),
          [
            {
              text: 'Tomar otra foto',
              onPress: () => {
                setInstruction('Posiciona tu rostro en el óvalo');
              }
            }
          ]
        );
        return;
      }

      const realFaceData = {
        bounds: detectedFace.bounds,
        rollAngle: detectedFace.rollAngle,
        yawAngle: detectedFace.yawAngle,
        pitchAngle: detectedFace.pitchAngle || 0,
        smilingProbability: detectedFace.smilingProbability || 0,
        leftEyeOpenProbability: detectedFace.leftEyeOpenProbability,
        rightEyeOpenProbability: detectedFace.rightEyeOpenProbability,
        // Mapear landmarks del nuevo paquete al formato esperado por servicios downstream
        leftEyePosition: detectedFace.landmarks?.LEFT_EYE,
        rightEyePosition: detectedFace.landmarks?.RIGHT_EYE,
        noseBasePosition: detectedFace.landmarks?.NOSE_BASE,
        mouthPosition: detectedFace.landmarks?.MOUTH_BOTTOM,
        leftCheekPosition: detectedFace.landmarks?.LEFT_CHEEK,
        rightCheekPosition: detectedFace.landmarks?.RIGHT_CHEEK,
      };

      setInstruction('✅ Rostro verificado correctamente');

      // Pequeña pausa para mostrar el mensaje de éxito
      await new Promise(resolve => setTimeout(resolve, 800));

      onCapture({
        photoUri: fileUri,
        photoBase64: null, // Vision Camera no provee base64 directamente
        faceData: realFaceData,
        timestamp: Date.now(),
        imageSize: fileInfo.size,
        validated: true,
        faceDetectionUsed: true,
      });

    } catch (error) {
      console.error('❌ Error en captura:', error);
      setIsValidating(false);
      setIsProcessing(false);
      setCountdown(null);

      Alert.alert(
        '❌ Error de captura',
        error.message || 'No se pudo capturar o analizar la foto correctamente.',
        [
          {
            text: 'Reintentar',
            onPress: () => {
              setInstruction('Posiciona tu rostro en el óvalo');
            }
          }
        ]
      );
    }
  };

  if (!hasPermission) {
    return (
      <Modal visible={true} animationType="fade" statusBarTranslucent>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.permissionText}>Solicitando permisos...</Text>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false && hasPermission !== null) {
    return (
      <Modal visible={true} animationType="fade" statusBarTranslucent>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <Ionicons name="camera-off" size={56} color="#ef4444" />
          <Text style={styles.permissionText}>Acceso a cámara necesario</Text>
          <Text style={styles.permissionSubtext}>
            Ve a Ajustes para habilitar la cámara
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (!device) {
    return (
      <Modal visible={true} animationType="fade" statusBarTranslucent>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.permissionText}>Cargando cámara...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={true} animationType="fade" statusBarTranslucent>
      <View style={styles.fullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Camera con detección facial integrada */}
      <Camera
        ref={camera}
        style={styles.camera}
        device={device}
        isActive={true}
        photo={true}
        faceDetectionCallback={handleFaceDetection}
        faceDetectionOptions={faceDetectionOptions}
      />

      {/* Overlay con position: absolute FUERA de Camera */}
      <View style={styles.overlay} pointerEvents="box-none">

        {/* Botón cerrar */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onCancel}
          disabled={isProcessing || isValidating}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Óvalo guía */}
        <View style={styles.ovalContainer} pointerEvents="none">
          <Animated.View
            style={[
              styles.oval,
              {
                transform: [{ scale: pulseAnim }],
                borderColor: countdown
                  ? '#10b981' // Verde durante countdown
                  : isValidating
                    ? '#f59e0b' // Amarillo durante validación
                    : faceDetected
                      ? '#10b981' // Verde cuando detecta rostro
                      : '#3b82f6', // Azul por defecto
              }
            ]}
          />

          {countdown && (
            <Text style={styles.countdownText}>{countdown}</Text>
          )}

          {isValidating && (
            <ActivityIndicator
              size="large"
              color="#f59e0b"
              style={styles.validatingIndicator}
            />
          )}
        </View>

        {/* Instrucción */}
        <View style={styles.instructionContainer} pointerEvents="none">
          <View style={[
            styles.instructionBadge,
            countdown && styles.instructionBadgeCountdown,
            isValidating && styles.instructionBadgeValidating,
            faceDetected && !countdown && !isValidating && styles.instructionBadgeDetected
          ]}>
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>
        </View>

        {/* Consejos */}
        {!countdown && !isValidating && (
          <View style={styles.tipsContainer} pointerEvents="none">
            <View style={styles.tipItem}>
              <Ionicons name="sunny-outline" size={14} color="#fbbf24" />
              <Text style={styles.tipText}>Busca buena iluminación</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="eye-outline" size={14} color="#60a5fa" />
              <Text style={styles.tipText}>Mira a la cámara</Text>
            </View>
          </View>
        )}

        {/* Botón de captura */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.captureButton,
              (isProcessing || countdown !== null || isValidating) && styles.captureButtonDisabled
            ]}
            onPress={startCountdown}
            disabled={isProcessing || countdown !== null || isValidating}
            activeOpacity={0.8}
          >
            <View style={[
              styles.captureButtonInner,
              countdown && styles.captureButtonInnerCountdown,
              faceDetected && !countdown && !isValidating && styles.captureButtonInnerReady
            ]}>
              <Ionicons
                name={isProcessing || isValidating ? "hourglass" : "camera"}
                size={28}
                color="#fff"
              />
            </View>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            {isProcessing
              ? 'Procesando...'
              : isValidating
                ? 'Analizando rostro...'
                : countdown
                  ? `Capturando en ${countdown}...`
                  : faceDetected
                    ? '✓ Listo - Toca para capturar'
                    : 'Posiciona tu rostro en el óvalo'}
          </Text>
        </View>
      </View>
    </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  ovalContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -OVAL_WIDTH / 2,
    marginTop: -(OVAL_HEIGHT / 2) - 20,
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  oval: {
    width: '100%',
    height: '100%',
    borderRadius: OVAL_WIDTH / 1.5,
    borderWidth: 5,
    backgroundColor: 'transparent',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  validatingIndicator: {
    position: 'absolute',
  },
  countdownText: {
    position: 'absolute',
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  instructionContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.92)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  instructionBadgeCountdown: {
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
  },
  instructionBadgeValidating: {
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
  },
  instructionBadgeDetected: {
    backgroundColor: 'rgba(16, 185, 129, 0.92)',
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tipsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 180 : 160,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
  },
  tipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInnerCountdown: {
    backgroundColor: '#10b981',
  },
  captureButtonInnerReady: {
    backgroundColor: '#10b981',
  },
  helpText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  permissionSubtext: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 24,
    backgroundColor: '#ef4444',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
