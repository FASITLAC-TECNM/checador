import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Vibration,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

const numbersMatrix = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'back']
];

const PinHeader = memo(({ styles, darkMode, handleClose, step, title, subtitle }) => {
  return (
    <LinearGradient
      colors={darkMode ? ['#1e40af', '#2563eb'] : ['#2563eb', '#3b82f6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}>
      <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.6}>
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={styles.iconContainer}>
        <Ionicons name="keypad" size={40} color="#fff" />
      </View>
      <Text style={styles.title}>{step === 1 ? title : 'Confirmar PIN'}</Text>
      <Text style={styles.subtitle}>{step === 1 ? subtitle : 'Vuelve a ingresar tu PIN'}</Text>
    </LinearGradient>
  );
});

const Keypad = memo(({ onNumberPress, onBackspace, styles, darkMode }) => {
  return (
    <View style={styles.keypad}>
      {numbersMatrix.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.keypadRow}>
          {row.map((key, keyIndex) => {
            if (key === '') return <View key={keyIndex} style={styles.keyButton} />;
            if (key === 'back') {
              return (
                <TouchableOpacity key={keyIndex} style={styles.keyButton} onPress={onBackspace} activeOpacity={0.6}>
                  <Ionicons name="backspace-outline" size={24} color={darkMode ? '#f9fafb' : '#1f2937'} />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity key={keyIndex} style={styles.keyButton} onPress={() => onNumberPress(key)} activeOpacity={0.6}>
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
});

export const PinInputModal = ({
  visible,
  onClose,
  onConfirm,
  title = "Configurar PIN",
  subtitle = "Ingresa un PIN de 6 dígitos",
  darkMode = false,
  requireConfirmation = true,
  isChanging = false
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimations = useRef(Array.from({ length: 6 }, () => new Animated.Value(1))).current;

  const styles = darkMode ? pinStylesDark : pinStyles;

  const pinRef = useRef(pin);
  const confirmPinRef = useRef(confirmPin);
  
  useEffect(() => { pinRef.current = pin; }, [pin]);
  useEffect(() => { confirmPinRef.current = confirmPin; }, [confirmPin]);

  useEffect(() => {
    if (visible) {
      setPin('');
      setConfirmPin('');
      setStep(1);
      setError('');
      setIsLoading(false);
    }
  }, [visible]);

  const shake = useCallback(() => {
    Vibration.vibrate(200);
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 30, useNativeDriver: true })
    ]).start();
  }, [shakeAnimation]);

  const handleClose = useCallback(() => {
    setPin('');
    setConfirmPin('');
    setStep(1);
    setError('');
    setIsLoading(false);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async (pinToSubmit) => {
    if (pinToSubmit.length !== 6) {
      setError('El PIN debe ser de exactamente 6 dígitos');
      shake();
      return;
    }
    setIsLoading(true);
    try {
      await onConfirm(pinToSubmit);
      handleClose();
    } catch (err) {
      setError(err.message || 'El PIN ingresado es incorrecto');
      setPin('');
      setConfirmPin('');
      setStep(1);
      shake();
    } finally {
      setIsLoading(false);
    }
  }, [onConfirm, shake, handleClose]);

  const handleConfirmPin = useCallback((confirmValue, originalPin) => {
    if (confirmValue !== originalPin) {
      setError('Los PIN no coinciden');
      setConfirmPin('');
      shake();
      return;
    }
    handleSubmit(confirmValue);
  }, [shake, handleSubmit]);

  const animatePress = useCallback((index) => {
    Animated.sequence([
      Animated.timing(scaleAnimations[index], { toValue: 1.15, duration: 40, useNativeDriver: true }),
      Animated.timing(scaleAnimations[index], { toValue: 1, duration: 40, useNativeDriver: true })
    ]).start();
  }, [scaleAnimations]);

  const handleNumberPress = useCallback((number) => {
    setError('');
    
    if (step === 1) {
      if (pinRef.current.length >= 6) return;
      const newPin = pinRef.current + number;
      setPin(newPin);
      animatePress(newPin.length - 1);
      
      if (newPin.length === 6) {
        setTimeout(() => {
          if (requireConfirmation) {
            setStep(2);
          } else {
            handleSubmit(newPin);
          }
        }, 50);
      }
    } else {
      if (confirmPinRef.current.length >= 6) return;
      const newPin = confirmPinRef.current + number;
      setConfirmPin(newPin);
      animatePress(newPin.length - 1);
      
      if (newPin.length === 6) {
        setTimeout(() => handleConfirmPin(newPin, pinRef.current), 50);
      }
    }
  }, [step, requireConfirmation, animatePress, handleSubmit, handleConfirmPin]);

  const handleBackspace = useCallback(() => {
    setError('');
    if (step === 1) {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  }, [step]);

  const renderPinDots = () => {
    const currentPin = step === 1 ? pin : confirmPin;
    return (
      <View style={styles.dotsContainer}>
        {scaleAnimations.map((animValue, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              currentPin.length > index && styles.dotFilled,
              { transform: [{ scale: animValue }] }
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ translateX: shakeAnimation }],
              paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 16)
            }
          ]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            scrollEnabled={false}>
            
            <PinHeader
              styles={styles}
              darkMode={darkMode}
              handleClose={handleClose}
              step={step}
              title={title}
              subtitle={subtitle}
            />

            <View style={styles.pinDisplay}>
              {renderPinDots()}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : (
                <Text style={styles.lengthHint}>
                  {step === 1 && pin.length > 0 && `${pin.length}/6`}
                  {step === 2 && confirmPin.length > 0 && `${confirmPin.length}/6`}
                  {pin.length === 0 && confirmPin.length === 0 && ' '}
                </Text>
              )}
            </View>

            <Keypad
              onNumberPress={handleNumberPress}
              onBackspace={handleBackspace}
              styles={styles}
              darkMode={darkMode}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const pinStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85
  },
  scrollContent: {
    flexGrow: 1
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center'
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6
  },
  subtitle: {
    fontSize: 13,
    color: '#e0f2fe',
    textAlign: 'center'
  },
  pinDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
    minHeight: 80
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: 'transparent'
  },
  dotFilled: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500'
  },
  lengthHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 6,
    minHeight: 14
  },
  keypad: {
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12
  },
  keyButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  keyText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1f2937'
  },
  tipsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  tipText: {
    fontSize: 11.5,
    color: '#6b7280'
  }
});

const pinStylesDark = StyleSheet.create({
  ...pinStyles,
  modalContent: {
    ...pinStyles.modalContent,
    backgroundColor: '#1e293b'
  },
  keyButton: {
    ...pinStyles.keyButton,
    backgroundColor: '#334155'
  },
  keyText: {
    ...pinStyles.keyText,
    color: '#f9fafb'
  },
  tipText: {
    ...pinStyles.tipText,
    color: '#9ca3af'
  },
  lengthHint: {
    ...pinStyles.lengthHint,
    color: '#9ca3af'
  }
});