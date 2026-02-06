// FacialCaptureScreen.js - CON DETECCIÓN FACIAL REAL
import React, { useState, useEffect, useRef } from 'react';
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const OVAL_WIDTH = SCREEN_WIDTH * 0.65;  // Más estrecho
const OVAL_HEIGHT = SCREEN_HEIGHT * 0.42; // Mejor proporción para rostro

export const FacialCaptureScreen = ({
  onCapture,
  onCancel,
  darkMode = false
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [instruction, setInstruction] = useState('Posiciona tu rostro y toca para capturar');
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Estado para detección facial en tiempo real
  const [facesDetected, setFacesDetected] = useState([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [lastFaceData, setLastFaceData] = useState(null);
  const [showManualCaptureOption, setShowManualCaptureOption] = useState(false);

  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const faceDetectionTimeout = useRef(null);
  const noDetectionTimeout = useRef(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
    startPulseAnimation();
  }, []);

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

  // Handler para detección facial en tiempo real
  const handleFacesDetected = ({ faces }) => {
    setFacesDetected(faces);

    // Log para debugging
    console.log('🔍 Caras detectadas:', faces.length);

    if (faces.length > 0) {
      const face = faces[0];

      // Log detallado de los datos de la cara
      console.log('👤 Datos de cara detectada:', {
        bounds: face.bounds,
        rollAngle: face.rollAngle,
        yawAngle: face.yawAngle,
        leftEyeOpen: face.leftEyeOpenProbability,
        rightEyeOpen: face.rightEyeOpenProbability,
        smiling: face.smilingProbability
      });

      setLastFaceData(face);

      // Limpiar timeout anterior
      if (faceDetectionTimeout.current) {
        clearTimeout(faceDetectionTimeout.current);
      }

      // Verificar calidad básica del rostro detectado (más permisivo)
      // Nota: Algunas probabilidades pueden ser undefined, así que usamos || 1
      const leftEyeOpen = face.leftEyeOpenProbability !== undefined ? face.leftEyeOpenProbability : 1;
      const rightEyeOpen = face.rightEyeOpenProbability !== undefined ? face.rightEyeOpenProbability : 1;
      const yaw = Math.abs(face.yawAngle || 0);
      const roll = Math.abs(face.rollAngle || 0);

      const isGoodQuality =
        leftEyeOpen > 0.3 &&  // Más permisivo: 0.3 en lugar de 0.5
        rightEyeOpen > 0.3 &&
        yaw < 30 &&  // Más permisivo: 30 grados en lugar de 20
        roll < 30;

      console.log('✅ Validación:', {
        leftEyeOpen: `${leftEyeOpen} > 0.3 = ${leftEyeOpen > 0.3}`,
        rightEyeOpen: `${rightEyeOpen} > 0.3 = ${rightEyeOpen > 0.3}`,
        yaw: `${yaw} < 30 = ${yaw < 30}`,
        roll: `${roll} < 30 = ${roll < 30}`,
        resultado: isGoodQuality ? '✅ VÁLIDO' : '❌ INVÁLIDO'
      });

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
  };

  // Validar que haya rostro detectado antes del countdown
  const validateFaceBeforeCapture = () => {
    // Verificar que hay datos de cara detectada recientemente
    if (!lastFaceData) {
      Alert.alert(
        '⚠️ No se detecta rostro',
        'Por favor posiciona tu rostro frente a la cámara y espera a que se detecte',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Verificar calidad del rostro (más permisivo)
    const leftEyeOpen = lastFaceData.leftEyeOpenProbability !== undefined ? lastFaceData.leftEyeOpenProbability : 1;
    const rightEyeOpen = lastFaceData.rightEyeOpenProbability !== undefined ? lastFaceData.rightEyeOpenProbability : 1;
    const yaw = Math.abs(lastFaceData.yawAngle || 0);
    const roll = Math.abs(lastFaceData.rollAngle || 0);

    const isGoodQuality =
      leftEyeOpen > 0.3 &&
      rightEyeOpen > 0.3 &&
      yaw < 30 &&
      roll < 30;

    if (!isGoodQuality) {
      let mensaje = 'Asegúrate de:\n\n';
      if (leftEyeOpen < 0.3 || rightEyeOpen < 0.3) {
        mensaje += '• Mantener los ojos abiertos\n';
      }
      if (yaw >= 30) {
        mensaje += '• Mirar directamente a la cámara\n';
      }
      if (roll >= 30) {
        mensaje += '• Mantener la cabeza recta\n';
      }

      Alert.alert(
        '⚠️ Calidad insuficiente',
        mensaje,
        [{ text: 'OK' }]
      );
      return false;
    }

    return true;
  };

  const startCountdown = () => {
    // NO validar nada, solo iniciar el countdown
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

  // Captura manual sin validación de detección (fallback)
  const startManualCapture = () => {
    Alert.alert(
      '📸 Captura Manual',
      'Se capturará tu foto sin detección facial automática. Asegúrate de estar bien posicionado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Capturar',
          onPress: () => {
            setCountdown(3);
            setInstruction('Mantén la posición');

            const timer = setInterval(() => {
              setCountdown(prev => {
                if (prev === 1) {
                  clearInterval(timer);
                  handleManualCapture();
                  return null;
                }
                return prev - 1;
              });
            }, 1000);
          }
        }
      ]
    );
  };

  // Captura sin validación de detección facial
  const handleManualCapture = async () => {
    if (!cameraRef.current || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      setInstruction('📸 Capturando...');

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      });

      const fileInfo = await FileSystem.getInfoAsync(photo.uri);

      if (!fileInfo.exists || fileInfo.size < 50000) {
        throw new Error('La captura falló. Intenta de nuevo con mejor iluminación.');
      }

      setInstruction('✅ Captura completada');

      // Usar datos mock si no hay detección
      const mockFaceData = {
        bounds: {
          origin: { x: SCREEN_WIDTH * 0.125, y: SCREEN_HEIGHT * 0.25 },
          size: { width: OVAL_WIDTH, height: OVAL_HEIGHT }
        },
        rollAngle: 0,
        yawAngle: 0,
        smilingProbability: 0,
        leftEyeOpenProbability: 1,
        rightEyeOpenProbability: 1,
        leftEyePosition: { x: SCREEN_WIDTH * 0.35, y: SCREEN_HEIGHT * 0.42 },
        rightEyePosition: { x: SCREEN_WIDTH * 0.65, y: SCREEN_HEIGHT * 0.42 },
        noseBasePosition: { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.5 },
        bottomMouthPosition: { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.58 },
      };

      onCapture({
        photoUri: photo.uri,
        photoBase64: photo.base64,
        faceData: mockFaceData,
        timestamp: Date.now(),
        imageSize: fileInfo.size,
        validated: false,
        faceDetectionUsed: false,
        manualCapture: true,
      });

    } catch (error) {
      console.error('Error en captura manual:', error);

      Alert.alert(
        '❌ Error de captura',
        error.message || 'No se pudo capturar la foto',
        [
          {
            text: 'Reintentar',
            onPress: () => {
              setIsProcessing(false);
              setCountdown(null);
              setInstruction('Posiciona tu rostro en el óvalo');
            }
          }
        ]
      );
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      setInstruction('📸 Capturando foto...');

      // 1. CAPTURAR LA FOTO
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      });

      console.log('📸 Foto capturada:', photo.uri);

      // Validación básica de la imagen capturada
      const fileInfo = await FileSystem.getInfoAsync(photo.uri);

      if (!fileInfo.exists || fileInfo.size < 50000) {
        throw new Error('La captura falló. Intenta de nuevo con mejor iluminación.');
      }

      // 2. AHORA SÍ ANALIZAR LA FOTO CAPTURADA
      setInstruction('🔍 Analizando si hay un rostro...');
      setIsValidating(true);

      console.log('🔍 Iniciando detección facial en la foto capturada...');

      // Usar detectFacesAsync para analizar LA FOTO capturada
      const detectionResult = await FaceDetector.detectFacesAsync(photo.uri, {
        mode: FaceDetector.FaceDetectorMode.accurate,
        detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
        runClassifications: FaceDetector.FaceDetectorClassifications.all,
      });

      console.log('🔍 Resultado de detección:', {
        facesCount: detectionResult.faces.length,
        faces: detectionResult.faces
      });

      // 3. VERIFICAR QUE REALMENTE HAY UNA CARA
      if (!detectionResult.faces || detectionResult.faces.length === 0) {
        setIsValidating(false);
        setIsProcessing(false);
        setCountdown(null);

        Alert.alert(
          '❌ No se detectó rostro',
          'No se detectó ningún rostro en la foto capturada.\n\nPor favor:\n• Asegúrate de que tu rostro esté visible\n• Verifica que haya buena iluminación\n• Posiciónate dentro del óvalo',
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

      // 4. USAR LOS DATOS REALES DE LA CARA DETECTADA EN LA FOTO
      const detectedFace = detectionResult.faces[0];

      console.log('✅ Rostro detectado en la foto:', {
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
        smilingProbability: detectedFace.smilingProbability || 0,
        leftEyeOpenProbability: detectedFace.leftEyeOpenProbability,
        rightEyeOpenProbability: detectedFace.rightEyeOpenProbability,
        leftEyePosition: detectedFace.leftEyePosition,
        rightEyePosition: detectedFace.rightEyePosition,
        noseBasePosition: detectedFace.noseBasePosition,
        bottomMouthPosition: detectedFace.bottomMouthPosition,
        leftCheekPosition: detectedFace.leftCheekPosition,
        rightCheekPosition: detectedFace.rightCheekPosition,
      };

      setInstruction('✅ Rostro verificado correctamente');

      // Pequeña pausa para mostrar el mensaje de éxito
      await new Promise(resolve => setTimeout(resolve, 800));

      onCapture({
        photoUri: photo.uri,
        photoBase64: photo.base64,
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

  if (!permission) {
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

  if (!permission.granted) {
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

  return (
    <Modal visible={true} animationType="fade" statusBarTranslucent>
      <View style={styles.fullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* ✅ CameraView SIN DETECCIÓN EN TIEMPO REAL */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
      />

      {/* ✅ Overlay con position: absolute FUERA de CameraView */}
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
            isValidating && styles.instructionBadgeValidating
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
              countdown && styles.captureButtonInnerCountdown
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
                ? 'Analizando rostro en la foto...'
                : countdown
                  ? `Capturando en ${countdown}...`
                  : 'Toca el botón para capturar tu rostro'}
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
    position: 'absolute', // ✅ Absolute positioning
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute', // ✅ Overlay separado
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
    marginTop: -(OVAL_HEIGHT / 2) - 20, // Ligeramente más arriba
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  oval: {
    width: '100%',
    height: '100%',
    borderRadius: OVAL_WIDTH / 1.5, // Más ovalado verticalmente
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