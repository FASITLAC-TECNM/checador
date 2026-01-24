import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importar servicios
import {
  checkBiometricSupport,
  capturarHuellaDigital,
  capturarReconocimientoFacial,
  verificarHuellaLocal,
  limpiarDatosLocales,
} from '../../services/biometricservice';

import {
  requestCameraPermission,
  processFaceData,
  validateFaceQuality,
  generateFacialTemplate,
  clearLocalFacialData,
} from '../../services/facialCameraService';

import {
  getCredencialesByEmpleado,
  guardarDactilar,
  guardarFacial,
  guardarPin,
  eliminarCredencial,
} from '../../services/credencialesService';

// Importar componentes
import { FacialCaptureScreen } from '../../services/FacialCaptureScreen';
import { PinInputModal } from './PinModal';

export const SecurityScreen = ({ darkMode, onBack, userData }) => {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  
  // Estados de carga
  const [isLoadingBiometric, setIsLoadingBiometric] = useState(false);
  const [isLoadingFace, setIsLoadingFace] = useState(false);
  const [isLoadingPin, setIsLoadingPin] = useState(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);
  
  // Soporte de hardware
  const [biometricSupport, setBiometricSupport] = useState(null);
  
  // Credenciales existentes
  const [hasFingerprint, setHasFingerprint] = useState(false);
  const [hasFacial, setHasFacial] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  
  // Estado para mostrar captura facial
  const [showFacialCapture, setShowFacialCapture] = useState(false);
  
  // Estado para mostrar modal de PIN
  const [showPinModal, setShowPinModal] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);

  const styles = darkMode ? securityStylesDark : securityStyles;

  useEffect(() => {
    initializeSecurity();
  }, []);

  const initializeSecurity = async () => {
    try {      
      // 1. Verificar soporte biométrico del dispositivo
      const support = await checkBiometricSupport();
      setBiometricSupport(support);

      // 2. Obtener empleado_id del usuario
      const empleadoId = userData?.empleado?.id || 
                        userData?.empleado_id || 
                        userData?.id;
            
      if (!empleadoId) {
        setIsLoadingCredentials(false);
        return;
      }

      // 3. Verificar credenciales existentes en el backend
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoadingCredentials(false);
        return;
      }

      const credenciales = await getCredencialesByEmpleado(empleadoId, token);
      
      if (credenciales.success && credenciales.data) {
        // Establecer estados basados en las credenciales REALES del backend
        const tieneDactilar = credenciales.data.tiene_dactilar || false;
        const tieneFacial = credenciales.data.tiene_facial || false;
        const tienePin = credenciales.data.tiene_pin || false;
        
        setHasFingerprint(tieneDactilar);
        setHasFacial(tieneFacial);
        setHasPin(tienePin);
        
        setBiometricEnabled(tieneDactilar);
        setFaceIdEnabled(tieneFacial);
        setPinEnabled(tienePin); // ✅ Solo activo si tiene PIN en BD
        
        console.log('[Security] 📊 Credenciales cargadas:', {
          dactilar: tieneDactilar,
          facial: tieneFacial,
          pin: tienePin
        });
      } else {
        // Sin credenciales registradas - TODO DESACTIVADO
        setHasFingerprint(false);
        setHasFacial(false);
        setHasPin(false);
        setBiometricEnabled(false);
        setFaceIdEnabled(false);
        setPinEnabled(false); // ✅ Desactivado por defecto
        
        console.log('[Security] ℹ️ Usuario sin credenciales registradas');
      }

    } catch (error) {
      if (error.message !== 'Credenciales no encontradas') {
        console.error('❌ Error crítico inicializando seguridad:', error);
        Alert.alert(
          'Error',
          'No se pudo cargar la configuración de seguridad'
        );
      }
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const handleBiometricToggle = async (value) => {
    if (!biometricSupport?.supported) {
      Alert.alert(
        'No disponible',
        biometricSupport?.message || 'Tu dispositivo no soporta autenticación biométrica'
      );
      return;
    }

    if (!biometricSupport?.hasFingerprint) {
      Alert.alert(
        'No disponible',
        'Tu dispositivo no tiene lector de huellas dactilares'
      );
      return;
    }

    if (value) {
      await enrollFingerprint();
    } else {
      await removeFingerprint();
    }
  };

  const enrollFingerprint = async () => {
    setIsLoadingBiometric(true);
    
    try {
      const empleadoId = userData?.empleado?.id || 
                        userData?.empleado_id || 
                        userData?.id;
      
      if (!empleadoId) {
        throw new Error('No se encontró el ID del empleado');
      }

      Alert.alert(
        '🔐 Registrar Huella Digital',
        'Coloca tu dedo en el sensor cuando se te indique',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => setIsLoadingBiometric(false),
          },
          {
            text: 'Continuar',
            onPress: async () => {
              try {                
                const resultado = await capturarHuellaDigital(empleadoId);
                const token = await AsyncStorage.getItem('userToken');
                const response = await guardarDactilar(
                  empleadoId,
                  resultado.template,
                  token
                );

                if (response.success) {
                  setBiometricEnabled(true);
                  setHasFingerprint(true);
                                    
                  Alert.alert(
                    '✅ ¡Éxito!',
                    'Tu huella digital ha sido registrada correctamente'
                  );
                } else {
                  throw new Error(response.message);
                }

              } catch (error) {
                console.error('❌ Error en captura:', error);
                Alert.alert(
                  'Error',
                  error.message || 'No se pudo registrar la huella digital'
                );
                setBiometricEnabled(false);
              } finally {
                setIsLoadingBiometric(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error preparando captura:', error);
      Alert.alert('Error', error.message);
      setIsLoadingBiometric(false);
    }
  };

  const removeFingerprint = async () => {
    Alert.alert(
      '⚠️ Eliminar Huella Digital',
      '¿Estás seguro de que deseas eliminar tu huella digital?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsLoadingBiometric(true);
            
            try {
              const empleadoId = userData?.empleado?.id || 
                                userData?.empleado_id || 
                                userData?.id;
              const token = await AsyncStorage.getItem('userToken');

              await eliminarCredencial(empleadoId, 'dactilar', token);
              await limpiarDatosLocales(empleadoId);

              setBiometricEnabled(false);
              setHasFingerprint(false);

              Alert.alert(
                '✅ Eliminado',
                'Tu huella digital ha sido eliminada'
              );

            } catch (error) {
              console.error('❌ Error eliminando huella:', error);
              Alert.alert('Error', 'No se pudo eliminar la huella digital');
              setBiometricEnabled(true);
            } finally {
              setIsLoadingBiometric(false);
            }
          },
        },
      ]
    );
  };

  const handleFaceIdToggle = async (value) => {
    if (value) {
      // Mostrar opciones: Nativo o Cámara
      const options = [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: '📸 Captura con Cámara',
          onPress: () => enrollFaceIdCamera()
        }
      ];

      // Solo agregar opción nativa si el dispositivo la soporta
      if (biometricSupport?.hasFaceId) {
        options.push({
          text: '🔐 Face ID Nativo',
          onPress: () => enrollFaceIdNative()
        });
      }

      Alert.alert(
        'Reconocimiento Facial',
        'Elige el método de registro',
        options
      );
    } else {
      await removeFaceId();
    }
  };

  const enrollFaceIdCamera = async () => {
    try {
      // Verificar permisos de cámara
      const permission = await requestCameraPermission();
      
      if (!permission.granted) {
        Alert.alert(
          'Permisos necesarios',
          permission.message || 'Se necesita acceso a la cámara para usar reconocimiento facial'
        );
        return;
      }

      setShowFacialCapture(true);

    } catch (error) {
      console.error('❌ Error preparando cámara:', error);
      Alert.alert('Error', 'No se pudo acceder a la cámara');
    }
  };

  const handleFacialCaptureComplete = async (captureData) => {
    setShowFacialCapture(false);
    setIsLoadingFace(true);

    try {
      const empleadoId = userData?.empleado?.id || 
                        userData?.empleado_id || 
                        userData?.id;

      if (!empleadoId) {
        throw new Error('No se encontró el ID del empleado');
      }
      // Procesar datos del rostro
      const faceFeatures = processFaceData(captureData.faceData);
      
      // Validar calidad
      const validation = validateFaceQuality(faceFeatures);
      
      if (!validation.isValid) {
        Alert.alert(
          'Calidad insuficiente',
          validation.errors.join('\n'),
          [{ text: 'Intentar de nuevo', onPress: () => setShowFacialCapture(true) }]
        );
        setIsLoadingFace(false);
        return;
      }
      const resultado = await generateFacialTemplate(
        faceFeatures,
        captureData.photoUri,
        empleadoId
      );

      // Guardar en el backend
      const token = await AsyncStorage.getItem('userToken');
      const response = await guardarFacial(
        empleadoId,
        resultado.template,
        token
      );

      if (response.success) {
        setFaceIdEnabled(true);
        setHasFacial(true);        
        Alert.alert(
          '✅ ¡Éxito!',
          'Tu reconocimiento facial ha sido registrado correctamente usando la cámara'
        );
      } else {
        throw new Error(response.message);
      }

    } catch (error) {
      console.error('❌ Error procesando captura facial:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo procesar el reconocimiento facial'
      );
      setFaceIdEnabled(false);
    } finally {
      setIsLoadingFace(false);
    }
  };

  const handleFacialCaptureCancel = () => {
    setShowFacialCapture(false);
  };

  const enrollFaceIdNative = async () => {
    setIsLoadingFace(true);
    
    try {
      const empleadoId = userData?.empleado?.id || 
                        userData?.empleado_id || 
                        userData?.id;
      
      if (!empleadoId) {
        throw new Error('No se encontró el ID del empleado');
      }
      const resultado = await capturarReconocimientoFacial(empleadoId);
      const token = await AsyncStorage.getItem('userToken');
      const response = await guardarFacial(
        empleadoId,
        resultado.template,
        token
      );

      if (response.success) {
        setFaceIdEnabled(true);
        setHasFacial(true);
        Alert.alert(
          '✅ ¡Éxito!',
          'Tu Face ID ha sido registrado correctamente'
        );
      } else {
        throw new Error(response.message);
      }

    } catch (error) {
      console.error('❌ Error en captura facial nativa:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo registrar el reconocimiento facial'
      );
      setFaceIdEnabled(false);
    } finally {
      setIsLoadingFace(false);
    }
  };

  const removeFaceId = async () => {
    Alert.alert(
      '⚠️ Eliminar Reconocimiento Facial',
      '¿Estás seguro de que deseas eliminar tu reconocimiento facial?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsLoadingFace(true);
            
            try {
              const empleadoId = userData?.empleado?.id || 
                                userData?.empleado_id || 
                                userData?.id;
              const token = await AsyncStorage.getItem('userToken');

              await eliminarCredencial(empleadoId, 'facial', token);
              await limpiarDatosLocales(empleadoId);
              await clearLocalFacialData(empleadoId);
              setFaceIdEnabled(false);
              setHasFacial(false);
              Alert.alert(
                '✅ Eliminado',
                'Tu reconocimiento facial ha sido eliminado'
              );

            } catch (error) {
              console.error('❌ Error eliminando facial:', error);
              Alert.alert('Error', 'No se pudo eliminar el reconocimiento facial');
              setFaceIdEnabled(true);
            } finally {
              setIsLoadingFace(false);
            }
          },
        },
      ]
    );
  };

  const handlePinToggle = async (value) => {
    if (value) {
      // Configurar nuevo PIN
      setIsChangingPin(false);
      setShowPinModal(true);
    } else {
      await removePin();
    }
  };

  const handlePinConfirm = async (pin) => {
    setIsLoadingPin(true);
    
    try {
      const empleadoId = userData?.empleado?.id || 
                        userData?.empleado_id || 
                        userData?.id;
      
      if (!empleadoId) {
        throw new Error('No se encontró el ID del empleado');
      }

      const token = await AsyncStorage.getItem('userToken');
      const response = await guardarPin(empleadoId, pin, token);

      if (response.success) {
        // ✅ Actualizar estados SOLO si el guardado fue exitoso
        setPinEnabled(true);
        setHasPin(true);
        
        console.log('[Security] ✅ PIN guardado exitosamente');
        
        Alert.alert(
          '✅ ¡Éxito!',
          isChangingPin ? 'Tu PIN ha sido actualizado correctamente' : 'Tu PIN ha sido configurado correctamente'
        );
      } else {
        throw new Error(response.message);
      }

    } catch (error) {
      console.error('❌ Error guardando PIN:', error);
      // ✅ Asegurar que el estado se mantenga desactivado si hubo error
      setPinEnabled(false);
      setHasPin(false);
      throw error; // El modal manejará el error
    } finally {
      setIsLoadingPin(false);
    }
  };

  const handleChangePin = () => {
    setIsChangingPin(true);
    setShowPinModal(true);
  };

  const removePin = async () => {
    Alert.alert(
      '⚠️ Eliminar PIN',
      '¿Estás seguro de que deseas eliminar tu PIN de seguridad?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsLoadingPin(true);
            
            try {
              const empleadoId = userData?.empleado?.id || 
                                userData?.empleado_id || 
                                userData?.id;
              const token = await AsyncStorage.getItem('userToken');

              const response = await eliminarCredencial(empleadoId, 'pin', token);

              if (response.success) {
                // ✅ Actualizar estados SOLO si la eliminación fue exitosa
                setPinEnabled(false);
                setHasPin(false);
                
                console.log('[Security] ✅ PIN eliminado exitosamente');

                Alert.alert(
                  '✅ Eliminado',
                  'Tu PIN ha sido eliminado'
                );
              } else {
                throw new Error(response.message);
              }

            } catch (error) {
              console.error('❌ Error eliminando PIN:', error);
              Alert.alert('Error', 'No se pudo eliminar el PIN');
              // ✅ Mantener el estado actual si hubo error
              setPinEnabled(true);
              setHasPin(true);
            } finally {
              setIsLoadingPin(false);
            }
          },
        },
      ]
    );
  };

  // Si está mostrando la captura facial, renderizar solo esa pantalla
  if (showFacialCapture) {
    return (
      <FacialCaptureScreen
        onCapture={handleFacialCaptureComplete}
        onCancel={handleFacialCaptureCancel}
        darkMode={darkMode}
      />
    );
  }

  if (isLoadingCredentials) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={[styles.methodSubtitle, { marginTop: 16 }]}>
          Cargando configuración de seguridad...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={darkMode ? ['#1e40af', '#2563eb'] : ['#2563eb', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seguridad</Text>
        <Text style={styles.headerSubtitle}>Métodos de acceso a tu cuenta</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <LinearGradient
            colors={darkMode ? ['#1e3a8a', '#2563eb'] : ['#dbeafe', '#bfdbfe']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoGradient}
          >
            <Ionicons
              name="shield-checkmark"
              size={32}
              color={darkMode ? '#93c5fd' : '#2563eb'}
            />
            <Text style={styles.infoTitle}>Protege tu cuenta</Text>
            <Text style={styles.infoText}>
              Elige los métodos de autenticación que prefieras para acceder a tu cuenta
            </Text>
          </LinearGradient>
        </View>

        {/* Device Support Info */}
        {biometricSupport && !biometricSupport.supported && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <Text style={styles.warningText}>
              {biometricSupport.message}
            </Text>
          </View>
        )}

        {/* Authentication Methods Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="finger-print"
              size={20}
              color={darkMode ? '#818cf8' : '#6366f1'}
            />
            <Text style={styles.sectionTitle}>Métodos de Autenticación</Text>
          </View>

          {/* Biometric Authentication */}
          <View style={styles.methodCard}>
            <View style={styles.methodHeader}>
              <View style={styles.methodLeft}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: darkMode ? '#4338ca' : '#eef2ff' },
                  ]}
                >
                  <Ionicons
                    name="finger-print"
                    size={26}
                    color={darkMode ? '#c7d2fe' : '#6366f1'}
                  />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodTitle}>Huella Digital</Text>
                  <Text style={styles.methodSubtitle}>
                    {hasFingerprint ? 'Huella registrada ✓' : 'Usa tu huella para acceder'}
                  </Text>
                </View>
              </View>
              {isLoadingBiometric ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: '#d1d5db', true: '#6366f1' }}
                  thumbColor={biometricEnabled ? '#fff' : '#f3f4f6'}
                  ios_backgroundColor="#d1d5db"
                  disabled={!biometricSupport?.hasFingerprint}
                />
              )}
            </View>
            {biometricEnabled && (
              <View style={styles.methodDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text style={styles.detailText}>Rápido y seguro</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text style={styles.detailText}>
                    Huella registrada en el dispositivo
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="information-circle" size={18} color="#3b82f6" />
                  <Text style={styles.detailText}>
                    Sincronizado con el servidor
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Face ID */}
          <View style={styles.methodCard}>
            <View style={styles.methodHeader}>
              <View style={styles.methodLeft}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: darkMode ? '#065f46' : '#d1fae5' },
                  ]}
                >
                  <Ionicons
                    name="scan"
                    size={26}
                    color={darkMode ? '#6ee7b7' : '#059669'}
                  />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodTitle}>Reconocimiento Facial</Text>
                  <Text style={styles.methodSubtitle}>
                    {hasFacial ? 'Rostro registrado ✓' : 'Desbloquea con tu rostro'}
                  </Text>
                </View>
              </View>
              {isLoadingFace ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Switch
                  value={faceIdEnabled}
                  onValueChange={handleFaceIdToggle}
                  trackColor={{ false: '#d1d5db', true: '#10b981' }}
                  thumbColor={faceIdEnabled ? '#fff' : '#f3f4f6'}
                  ios_backgroundColor="#d1d5db"
                />
              )}
            </View>
            {faceIdEnabled && (
              <View style={styles.methodDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text style={styles.detailText}>Sin contacto</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text style={styles.detailText}>
                    Mayor nivel de seguridad
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="information-circle" size={18} color="#3b82f6" />
                  <Text style={styles.detailText}>
                    Sincronizado con el servidor
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* PIN */}
          <View style={styles.methodCard}>
            <View style={styles.methodHeader}>
              <View style={styles.methodLeft}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: darkMode ? '#78350f' : '#fef3c7' },
                  ]}
                >
                  <Ionicons
                    name="keypad"
                    size={26}
                    color={darkMode ? '#fde047' : '#d97706'}
                  />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodTitle}>PIN de Seguridad</Text>
                  <Text style={styles.methodSubtitle}>
                    {hasPin ? 'PIN configurado ✓' : 'Código de 6 dígitos'}
                  </Text>
                </View>
              </View>
              {isLoadingPin ? (
                <ActivityIndicator size="small" color="#d97706" />
              ) : (
                <Switch
                  value={pinEnabled}
                  onValueChange={handlePinToggle}
                  trackColor={{ false: '#d1d5db', true: '#d97706' }}
                  thumbColor={pinEnabled ? '#fff' : '#f3f4f6'}
                  ios_backgroundColor="#d1d5db"
                />
              )}
            </View>
            {pinEnabled && (
              <View style={styles.methodDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text style={styles.detailText}>PIN de 6 dígitos configurado</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="information-circle" size={18} color="#3b82f6" />
                  <Text style={styles.detailText}>
                    Usa tu PIN para acceder rápidamente
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.changePinButton} 
                  activeOpacity={0.7}
                  onPress={handleChangePin}
                >
                  <Text style={styles.changePinText}>Cambiar PIN</Text>
                  <Ionicons name="chevron-forward" size={18} color="#6366f1" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Additional Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="shield-outline"
              size={20}
              color={darkMode ? '#818cf8' : '#6366f1'}
            />
            <Text style={styles.sectionTitle}>Seguridad Adicional</Text>
          </View>

          <TouchableOpacity style={styles.optionItem} activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: darkMode ? '#581c87' : '#f3e8ff' },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={22}
                  color={darkMode ? '#d8b4fe' : '#9333ea'}
                />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Tiempo de Bloqueo</Text>
                <Text style={styles.optionSubtitle}>
                  Bloqueo automático después de 5 minutos
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: darkMode ? '#7c2d12' : '#fed7aa' },
                ]}
              >
                <Ionicons
                  name="warning-outline"
                  size={22}
                  color={darkMode ? '#fb923c' : '#ea580c'}
                />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Intentos Fallidos</Text>
                <Text style={styles.optionSubtitle}>
                  Bloquear después de 3 intentos
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Security Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons
              name="bulb"
              size={22}
              color={darkMode ? '#fbbf24' : '#f59e0b'}
            />
            <Text style={styles.tipsTitle}>Consejos de Seguridad</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="ellipse" size={8} color="#6b7280" />
            <Text style={styles.tipText}>
              Habilita múltiples métodos de autenticación para mayor seguridad
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="ellipse" size={8} color="#6b7280" />
            <Text style={styles.tipText}>
              Nunca compartas tu PIN con nadie
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="ellipse" size={8} color="#6b7280" />
            <Text style={styles.tipText}>
              Tus datos biométricos se almacenan de forma segura
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal de PIN */}
      <PinInputModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onConfirm={handlePinConfirm}
        title={isChangingPin ? "Cambiar PIN" : "Configurar PIN"}
        subtitle="Ingresa un PIN de 6 dígitos"
        darkMode={darkMode}
        requireConfirmation={true}
        isChanging={isChangingPin}
      />
    </View>
  );
};

const securityStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 16 : 50,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0f2fe',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  infoCard: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  infoGradient: {
    padding: 24,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
  },
  methodCard: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  methodSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  methodDetails: {
    marginTop: 16,
    marginLeft: 68,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  changePinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  changePinText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 3,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  tipsCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
    paddingLeft: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#78350f',
    flex: 1,
    lineHeight: 18,
  },
});

const securityStylesDark = StyleSheet.create({
  ...securityStyles,
  container: {
    ...securityStyles.container,
    backgroundColor: '#0f172a',
  },
  infoTitle: {
    ...securityStyles.infoTitle,
    color: '#f9fafb',
  },
  infoText: {
    ...securityStyles.infoText,
    color: '#d1d5db',
  },
  warningCard: {
    ...securityStyles.warningCard,
    backgroundColor: '#422006',
    borderColor: '#713f12',
  },
  warningText: {
    ...securityStyles.warningText,
    color: '#fef08a',
  },
  section: {
    ...securityStyles.section,
    backgroundColor: '#1e293b',
  },
  sectionTitle: {
    ...securityStyles.sectionTitle,
    color: '#f9fafb',
  },
  methodCard: {
    ...securityStyles.methodCard,
    borderBottomColor: '#334155',
  },
  methodTitle: {
    ...securityStyles.methodTitle,
    color: '#f9fafb',
  },
  methodSubtitle: {
    ...securityStyles.methodSubtitle,
    color: '#9ca3af',
  },
  methodDetails: {
    ...securityStyles.methodDetails,
    borderTopColor: '#334155',
  },
  detailText: {
    ...securityStyles.detailText,
    color: '#9ca3af',
  },
  changePinButton: {
    ...securityStyles.changePinButton,
    backgroundColor: '#334155',
  },
  optionTitle: {
    ...securityStyles.optionTitle,
    color: '#f9fafb',
  },
  optionSubtitle: {
    ...securityStyles.optionSubtitle,
    color: '#9ca3af',
  },
  tipsCard: {
    ...securityStyles.tipsCard,
    backgroundColor: '#422006',
    borderColor: '#713f12',
  },
  tipsTitle: {
    ...securityStyles.tipsTitle,
    color: '#fde047',
  },
  tipText: {
    ...securityStyles.tipText,
    color: '#fef08a',
  },
});