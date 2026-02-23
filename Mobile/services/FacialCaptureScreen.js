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

// Dimensiones del óvalo
const OVAL_WIDTH = SCREEN_WIDTH * 0.65;
const OVAL_HEIGHT = SCREEN_HEIGHT * 0.42;

// Posición del óvalo en pantalla
const OVAL_CENTER_X = SCREEN_WIDTH / 2;
const OVAL_CENTER_Y = SCREEN_HEIGHT / 2 - 20;
const OVAL_LEFT = OVAL_CENTER_X - OVAL_WIDTH / 2;
const OVAL_RIGHT = OVAL_CENTER_X + OVAL_WIDTH / 2;
const OVAL_TOP = OVAL_CENTER_Y - OVAL_HEIGHT / 2;
const OVAL_BOTTOM = OVAL_CENTER_Y + OVAL_HEIGHT / 2;

/**
 * Verifica si el centro del rostro detectado está dentro del óvalo guía.
 * Los bounds del face detector se mapean 1:1 a coordenadas de pantalla
 * cuando la cámara ocupa todo el screen.
 */
const isFaceInOval = (face) => {
  if (!face?.bounds) return false;

  const { x, y, width, height } = face.bounds;
  const faceCX = x + width / 2;
  const faceCY = y + height / 2;

  const radiusX = OVAL_WIDTH / 2;
  const radiusY = OVAL_HEIGHT / 2;

  // Fórmula de elipse: (cx-h)²/a² + (cy-k)²/b² ≤ 1
  const ellipseTest =
    Math.pow((faceCX - OVAL_CENTER_X) / radiusX, 2) +
    Math.pow((faceCY - OVAL_CENTER_Y) / radiusY, 2);

  const isCentered = ellipseTest <= 1.05; // pequeño margen de tolerancia
  const isBigEnough = width >= OVAL_WIDTH * 0.30; // rostro ocupa al menos 30% del óvalo

  return isCentered && isBigEnough;
};

export const FacialCaptureScreen = ({
  onCapture,
  onCancel,
  darkMode = false
}) => {
  const device = useCameraDevice('front');
  const camera = useRef(null);
  const [hasPermission, setHasPermission] = useState(false);

  // ── Colores adaptábles al modo oscuro ──
  const dm = darkMode;
  const bgColor = dm ? '#0f172a' : '#ffffff';
  const textColor = dm ? '#f1f5f9' : '#374151';
  const closeBtnBg = dm ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const closeIconClr = dm ? '#f1f5f9' : '#1f2937';
  const tipBg = dm ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  // Botón X debajo del status bar de Android
  const closeTop = Platform.OS === 'ios'
    ? 50
    : (StatusBar.currentHeight || 24) + 8;

  const faceDetectionOptions = useRef({
    performanceMode: 'fast',
    classificationMode: 'all',
    landmarkMode: 'all',
    contourMode: 'none',
    trackingEnabled: true,
    minFaceSize: 0.15,
  }).current;

  const [instruction, setInstruction] = useState('Centra tu rostro dentro del óvalo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

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

  const updateFaceDetection = useCallback((faces) => {
    setFacesDetected(faces);

    if (faces.length > 0) {
      const face = faces[0];
      setLastFaceData(face);

      if (faceDetectionTimeout.current) {
        clearTimeout(faceDetectionTimeout.current);
      }

      const leftEyeOpen = face.leftEyeOpenProbability !== undefined ? face.leftEyeOpenProbability : 1;
      const rightEyeOpen = face.rightEyeOpenProbability !== undefined ? face.rightEyeOpenProbability : 1;
      const yaw = Math.abs(face.yawAngle || 0);
      const roll = Math.abs(face.rollAngle || 0);

      const isGoodQuality = leftEyeOpen > 0.3 && rightEyeOpen > 0.3 && yaw < 30 && roll < 30;

      // ── NUEVA VALIDACIÓN: el rostro debe estar dentro del óvalo ──
      const inOval = isFaceInOval(face);

      if (!countdown && !isProcessing && !isValidating) {
        if (!inOval) {
          setFaceDetected(false);
          setInstruction('Centra tu rostro dentro del óvalo');
        } else if (isGoodQuality) {
          setFaceDetected(true);
          setInstruction('✓ Rostro detectado - Toca para capturar');
        } else {
          setFaceDetected(false);
          if (leftEyeOpen < 0.3 || rightEyeOpen < 0.3) {
            setInstruction('Abre bien los ojos');
          } else if (yaw >= 30) {
            setInstruction('Mira de frente a la cámara');
          } else if (roll >= 30) {
            setInstruction('Mantén la cabeza recta');
          } else {
            setInstruction('Ajusta la posición de tu rostro');
          }
        }
      }

      faceDetectionTimeout.current = setTimeout(() => {
        setFaceDetected(false);
        if (!countdown && !isProcessing && !isValidating) {
          setInstruction('Centra tu rostro dentro del óvalo');
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
    if (!camera.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setInstruction('📸 Capturando foto...');

      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: 'off',
        skipMetadata: true,
      });

      const fileUri = Platform.OS === 'ios' ? photo.path : `file://${photo.path}`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (!fileInfo.exists || fileInfo.size < 50000) {
        throw new Error('La captura falló. Intenta de nuevo con mejor iluminación.');
      }

      setInstruction('🔍 Analizando rostro...');
      setIsValidating(true);

      if (!lastFaceData) {
        setIsValidating(false);
        setIsProcessing(false);
        setCountdown(null);
        Alert.alert(
          '❌ No se detectó rostro',
          'No se detectó ningún rostro en el momento de la captura.\n\nPor favor:\n• Asegúrate de que tu rostro esté visible\n• Verifica que haya buena iluminación\n• Posiciónate dentro del óvalo',
          [{ text: 'Tomar otra foto', onPress: () => setInstruction('Centra tu rostro dentro del óvalo') }]
        );
        return;
      }

      // Validar que el rostro seguía en el óvalo al momento de capturar
      if (!isFaceInOval(lastFaceData)) {
        setIsValidating(false);
        setIsProcessing(false);
        setCountdown(null);
        Alert.alert(
          '⚠️ Rostro fuera del óvalo',
          'Tu rostro no estaba centrado en el óvalo al momento de capturar.\n\nPor favor posiciona tu rostro dentro del óvalo e inténtalo de nuevo.',
          [{ text: 'Reintentar', onPress: () => setInstruction('Centra tu rostro dentro del óvalo') }]
        );
        return;
      }

      const detectedFace = lastFaceData;
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
          [{ text: 'Tomar otra foto', onPress: () => setInstruction('Centra tu rostro en el óvalo') }]
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
        leftEyePosition: detectedFace.landmarks?.LEFT_EYE,
        rightEyePosition: detectedFace.landmarks?.RIGHT_EYE,
        noseBasePosition: detectedFace.landmarks?.NOSE_BASE,
        mouthPosition: detectedFace.landmarks?.MOUTH_BOTTOM,
        leftCheekPosition: detectedFace.landmarks?.LEFT_CHEEK,
        rightCheekPosition: detectedFace.landmarks?.RIGHT_CHEEK,
      };

      setInstruction('✅ Rostro verificado correctamente');
      await new Promise(resolve => setTimeout(resolve, 800));

      onCapture({
        photoUri: fileUri,
        photoBase64: null,
        faceData: realFaceData,
        timestamp: Date.now(),
        imageSize: fileInfo.size,
        validated: true,
        faceDetectionUsed: true,
      });

    } catch (error) {
      // Silencio en producción
      setIsValidating(false);
      setIsProcessing(false);
      setCountdown(null);
      Alert.alert(
        '❌ Error de captura',
        error.message || 'No se pudo capturar o analizar la foto correctamente.',
        [{ text: 'Reintentar', onPress: () => setInstruction('Centra tu rostro en el óvalo') }]
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
          <Text style={styles.permissionSubtext}>Ve a Ajustes para habilitar la cámara</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
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

  // Color del borde del óvalo según el estado
  const ovalBorderColor = countdown
    ? '#10b981'
    : isValidating
      ? '#f59e0b'
      : faceDetected
        ? '#10b981'
        : '#3b82f6';

  return (
    <Modal visible={true} animationType="fade" statusBarTranslucent>
      <View style={styles.fullScreen}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Fondo adaptable al modo oscuro */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />

        {/* Cámara clipeada al óvalo */}
        <View style={styles.cameraOval}>
          <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            photo={true}
            faceDetectionCallback={handleFaceDetection}
            faceDetectionOptions={faceDetectionOptions}
          />
        </View>

        {/* Borde del óvalo encima */}
        <View style={styles.ovalContainer} pointerEvents="none">
          <Animated.View
            style={[
              styles.oval,
              {
                transform: [{ scale: pulseAnim }],
                borderColor: ovalBorderColor,
              }
            ]}
          />
          {countdown && (
            <Text style={styles.countdownText}>{countdown}</Text>
          )}
          {isValidating && (
            <ActivityIndicator size="large" color="#f59e0b" style={styles.validatingIndicator} />
          )}
        </View>

        {/* Botón cerrar — respeta status bar Android */}
        <TouchableOpacity
          style={[styles.closeButton, {
            top: closeTop,
            backgroundColor: closeBtnBg,
          }]}
          onPress={onCancel}
          disabled={isProcessing || isValidating}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color={closeIconClr} />
        </TouchableOpacity>

        {/* Instrucción — centrada entre status bar y borde superior del óvalo */}
        <View style={[styles.instructionContainer, { top: closeTop + 56 }]} pointerEvents="none">
          <View style={[
            styles.instructionBadge,
            countdown && styles.instructionBadgeCountdown,
            isValidating && styles.instructionBadgeValidating,
            faceDetected && !countdown && !isValidating && styles.instructionBadgeDetected
          ]}>
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>
        </View>

        {/* Tips — debajo del óvalo */}
        {!countdown && !isValidating && (
          <View style={styles.tipsContainer} pointerEvents="none">
            <View style={[styles.tipItem, { backgroundColor: tipBg }]}>
              <Ionicons name="sunny-outline" size={14} color="#f59e0b" />
              <Text style={[styles.tipText, { color: textColor }]}>Busca buena iluminación</Text>
            </View>
            <View style={[styles.tipItem, { backgroundColor: tipBg }]}>
              <Ionicons name="eye-outline" size={14} color="#3b82f6" />
              <Text style={[styles.tipText, { color: textColor }]}>Mira directamente a la cámara</Text>
            </View>
          </View>
        )}

        {/* Botón de captura — abajo */}
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
                name={isProcessing || isValidating ? 'hourglass' : 'camera'}
                size={28}
                color="#fff"
              />
            </View>
          </TouchableOpacity>

          <Text style={[styles.helpText, { color: textColor }]}>
            {isProcessing
              ? 'Procesando...'
              : isValidating
                ? 'Analizando rostro...'
                : countdown
                  ? `Capturando en ${countdown}...`
                  : faceDetected
                    ? '✓ Listo – Toca para capturar'
                    : 'Centra tu rostro en el óvalo y toca'}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#ffffff', // base — sobreescrito inline por darkMode
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  // ── Cámara clipeada al óvalo ─────────────────────────────────
  cameraOval: {
    position: 'absolute',
    top: OVAL_TOP,
    left: OVAL_LEFT,
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 1.5, // mismo radio que el borde del óvalo
    overflow: 'hidden',             // clipa la cámara al shape del óvalo
    zIndex: 1,
  },

  // ── Óvalo guía ──────────────────────────────────────────────
  ovalContainer: {
    position: 'absolute',
    top: OVAL_TOP,
    left: OVAL_LEFT,
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  oval: {
    width: '100%',
    height: '100%',
    borderRadius: OVAL_WIDTH / 1.5,
    borderWidth: 4,
    backgroundColor: 'transparent',
  },
  validatingIndicator: {
    position: 'absolute',
  },
  countdownText: {
    position: 'absolute',
    fontSize: 72,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  // ── Botón cerrar ────────────────────────────────────────────
  closeButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },

  // ── Instrucción ─────────────────────────────────────────────
  instructionContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  instructionBadge: {
    backgroundColor: 'rgba(59,130,246,0.92)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    maxWidth: '90%',
    elevation: 3,
  },
  instructionBadgeCountdown: { backgroundColor: 'rgba(16,185,129,0.95)' },
  instructionBadgeValidating: { backgroundColor: 'rgba(245,158,11,0.95)' },
  instructionBadgeDetected: { backgroundColor: 'rgba(16,185,129,0.92)' },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Tips ────────────────────────────────────────────────────
  tipsContainer: {
    position: 'absolute',
    top: OVAL_BOTTOM + 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.07)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
  },
  tipText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Botón captura ────────────────────────────────────────────
  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  captureButtonDisabled: { opacity: 0.6 },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInnerCountdown: { backgroundColor: '#10b981' },
  captureButtonInnerReady: { backgroundColor: '#10b981' },
  helpText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Permisos ─────────────────────────────────────────────────
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
