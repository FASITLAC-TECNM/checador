// FacialCaptureScreen.js - CORREGIDO
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
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const OVAL_WIDTH = SCREEN_WIDTH * 0.75;
const OVAL_HEIGHT = SCREEN_HEIGHT * 0.50;

export const FacialCaptureScreen = ({ 
  onCapture, 
  onCancel, 
  darkMode = false 
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [instruction, setInstruction] = useState('Posiciona tu rostro en el óvalo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  // Validar imagen antes del countdown
  const validateImageBeforeCapture = async () => {
    if (!cameraRef.current) return false;

    try {
      setIsValidating(true);
      setInstruction('Validando imagen...');

      // Tomar foto de prueba
      const testPhoto = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        base64: false,
        skipProcessing: true,
      });

      // Verificar que la imagen exista y tenga tamaño
      const fileInfo = await FileSystem.getInfoAsync(testPhoto.uri);

      // Validaciones básicas pero efectivas:
      if (!fileInfo.exists) {
        throw new Error('No se pudo capturar la imagen');
      }

      if (fileInfo.size < 50000) {
        throw new Error('La imagen es demasiado oscura o no se capturó correctamente');
      }

      if (fileInfo.size > 10000000) {
        throw new Error('La imagen está sobreexpuesta');
      }

      // Limpiar foto de prueba
      await FileSystem.deleteAsync(testPhoto.uri, { idempotent: true });

      setIsValidating(false);
      return true;

    } catch (error) {
      setIsValidating(false);
      
      Alert.alert(
        'Error de validación',
        error.message || 'No se pudo validar la imagen. Verifica:\n\n• Que haya buena iluminación\n• Que la cámara esté enfocando\n• Que tu rostro esté visible',
        [{ text: 'OK', onPress: () => setInstruction('Posiciona tu rostro en el óvalo') }]
      );
      
      return false;
    }
  };

  const startCountdown = async () => {
    const isValid = await validateImageBeforeCapture();
    
    if (!isValid) {
      setInstruction('Posiciona tu rostro en el óvalo');
      return;
    }

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
    if (!cameraRef.current || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      setInstruction('Capturando...');

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      });


      // Validación final de la imagen capturada
      const fileInfo = await FileSystem.getInfoAsync(photo.uri);
      
      if (!fileInfo.exists || fileInfo.size < 50000) {
        throw new Error('La captura final falló. Intenta de nuevo con mejor iluminación.');
      }

      const mockFaceData = {
        bounds: {
          origin: { x: SCREEN_WIDTH * 0.125, y: SCREEN_HEIGHT * 0.25 },
          size: { width: OVAL_WIDTH, height: OVAL_HEIGHT }
        },
        rollAngle: 0,
        yawAngle: 0,
        smilingProbability: 0.8,
        leftEyeOpenProbability: 1,
        rightEyeOpenProbability: 1,
        leftEyePosition: { x: SCREEN_WIDTH * 0.35, y: SCREEN_HEIGHT * 0.42 },
        rightEyePosition: { x: SCREEN_WIDTH * 0.65, y: SCREEN_HEIGHT * 0.42 },
        noseBasePosition: { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.5 },
        bottomMouthPosition: { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.58 },
        leftCheekPosition: { x: SCREEN_WIDTH * 0.3, y: SCREEN_HEIGHT * 0.52 },
        rightCheekPosition: { x: SCREEN_WIDTH * 0.7, y: SCREEN_HEIGHT * 0.52 }
      };

      onCapture({
        photoUri: photo.uri,
        photoBase64: photo.base64,
        faceData: mockFaceData,
        timestamp: Date.now(),
        imageSize: fileInfo.size,
        validated: true
      });

    } catch (error) {
      
      Alert.alert(
        'Error de captura',
        error.message || 'No se pudo capturar la foto correctamente. Asegúrate de:\n\n• Tener buena iluminación\n• Mantener la cámara estable\n• Estar frente a la cámara',
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

  if (!permission) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.permissionText}>Solicitando permisos...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
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
    );
  }

  return (
    <View style={styles.fullScreen}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* ✅ CameraView SIN children */}
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
                  ? '#10b981' 
                  : isValidating
                    ? '#f59e0b'
                    : '#3b82f6',
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
                ? 'Validando imagen...'
                : countdown 
                  ? `Capturando en ${countdown}...`
                  : 'Toca para capturar'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
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
    marginTop: -OVAL_HEIGHT / 2,
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  oval: {
    width: '100%',
    height: '100%',
    borderRadius: OVAL_WIDTH / 2,
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
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  instructionContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '90%',
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