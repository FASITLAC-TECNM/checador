import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importar servicios
import {
  checkBiometricSupport,
  capturarHuellaDigital,
  capturarReconocimientoFacial,
  limpiarDatosLocales,
} from '../../services/biometricservice';

import {
  requestCameraPermission,
  processFaceData,
  validateFaceQuality,
  clearLocalFacialData,
} from '../../services/facialCameraService';

import {
  extractFaceFeatures,
  saveFaceFeatures,
  deleteFaceFeatures,
} from '../../services/faceComparisonService';

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

// ─── Constantes de color por estado ─────────────────────────────────────────
const ESTADO_COLORES = {
  activo: {
    bg: '#16a34a',
    bgPressed: '#15803d',
    texto: '#fff',
    icono: '#fff',
  },
  inactivo: {
    bg: '#6b7280',
    bgPressed: '#4b5563',
    texto: '#fff',
    icono: '#fff',
  },
  noDisponible: {
    bg: '#dc2626',
    bgPressed: '#b91c1c',
    texto: '#fff',
    icono: '#fff',
  },
};

export const SecurityScreen = ({ darkMode, onBack, userData }) => {
  // ─── Estado de credenciales ───────────────────────────────────────────
  const [hasFingerprint, setHasFingerprint] = useState(false);
  const [hasFacial, setHasFacial] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  // ─── Carga inicial ────────────────────────────────────────────────────
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

  // ─── Soporte de hardware ──────────────────────────────────────────────
  const [biometricSupport, setBiometricSupport] = useState(null);

  // ─── Estados de procesamiento por método ──────────────────────────────
  const [procesandoHuella, setProcesandoHuella] = useState(false);
  const [procesandoFacial, setProcesandoFacial] = useState(false);
  const [procesandoPin, setProcesandoPin] = useState(false);

  // ─── Feedback de presión ──────────────────────────────────────────────
  const [presionado, setPresionado] = useState(null);

  // ─── Captura facial ───────────────────────────────────────────────────
  const [showFacialCapture, setShowFacialCapture] = useState(false);

  // ─── Modal PIN ────────────────────────────────────────────────────────
  const [showPinModal, setShowPinModal] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);

  const styles = darkMode ? securityStylesDark : securityStyles;

  useEffect(() => {
    initializeSecurity();
  }, []);

  // ─── Inicialización ─────────────────────────────────────────────────────
  const initializeSecurity = async () => {
    try {
      const support = await checkBiometricSupport();
      setBiometricSupport(support);

      const empleadoId =
        userData?.empleado?.id || userData?.empleado_id || userData?.id;

      if (!empleadoId) {
        setIsLoadingCredentials(false);
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoadingCredentials(false);
        return;
      }

      const credenciales = await getCredencialesByEmpleado(empleadoId, token);

      if (credenciales.success && credenciales.data) {
        setHasFingerprint(credenciales.data.tiene_dactilar || false);
        setHasFacial(credenciales.data.tiene_facial || false);
        setHasPin(credenciales.data.tiene_pin || false);
      }
    } catch (error) {
      if (error.message !== 'Credenciales no encontradas') {
        Alert.alert('Error', 'No se pudo cargar la configuración de seguridad');
      }
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  // ─── Determinar estado visual ───────────────────────────────────────────
  // activo      → tiene la credencial registrada
  // inactivo    → puede registrarla (hardware OK o no necesita hardware)
  // noDisponible → el hardware no lo soporta
  const getEstado = (tipo) => {
    switch (tipo) {
      case 'dactilar':
        if (hasFingerprint) return 'activo';
        if (!biometricSupport?.hasFingerprint) return 'noDisponible';
        return 'inactivo';

      case 'facial':
        if (hasFacial) return 'activo';
        // Facial siempre disponible porque tiene el fallback de cámara manual
        return 'inactivo';

      case 'pin':
        if (hasPin) return 'activo';
        return 'inactivo';

      default:
        return 'inactivo';
    }
  };

  // ─── Obtener empleadoId (helper) ────────────────────────────────────────
  const getEmpleadoId = () =>
    userData?.empleado?.id || userData?.empleado_id || userData?.id;

  // ─── HUELLA DIGITAL ─────────────────────────────────────────────────────
  const handleHuellaPress = async () => {
    const estado = getEstado('dactilar');

    if (estado === 'noDisponible') {
      Alert.alert(
        'No disponible',
        biometricSupport?.message ||
          'Tu dispositivo no tiene sensor de huellas dactilares compatible.'
      );
      return;
    }

    // Si ya la tiene → ofrecer eliminar
    if (estado === 'activo') {
      await removeFingerprint();
      return;
    }

    // Si no la tiene → enrollar
    await enrollFingerprint();
  };

  const enrollFingerprint = async () => {
    setProcesandoHuella(true);
    const empleadoId = getEmpleadoId();

    if (!empleadoId) {
      Alert.alert('Error', 'No se encontró el ID del empleado');
      setProcesandoHuella(false);
      return;
    }

    Alert.alert(
      '🔐 Registrar Huella Digital',
      'Coloca tu dedo en el sensor cuando se te indique',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => setProcesandoHuella(false),
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
                setHasFingerprint(true);
                Alert.alert(
                  '✅ ¡Éxito!',
                  'Tu huella digital ha sido registrada correctamente'
                );
              } else {
                throw new Error(response.message);
              }
            } catch (error) {
              Alert.alert(
                'Error',
                error.message || 'No se pudo registrar la huella digital'
              );
            } finally {
              setProcesandoHuella(false);
            }
          },
        },
      ]
    );
  };

  const removeFingerprint = async () => {
    Alert.alert(
      '⚠️ Eliminar Huella Digital',
      '¿Estás seguro de que deseas eliminar tu huella digital?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setProcesandoHuella(true);
            try {
              const empleadoId = getEmpleadoId();
              const token = await AsyncStorage.getItem('userToken');
              await eliminarCredencial(empleadoId, 'dactilar', token);
              await limpiarDatosLocales(empleadoId);
              setHasFingerprint(false);
              Alert.alert('✅ Eliminado', 'Tu huella digital ha sido eliminada');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la huella digital');
            } finally {
              setProcesandoHuella(false);
            }
          },
        },
      ]
    );
  };

  // ─── RECONOCIMIENTO FACIAL ──────────────────────────────────────────────
  const handleFacialPress = async () => {
    const estado = getEstado('facial');

    // Si ya lo tiene → ofrecer eliminar
    if (estado === 'activo') {
      await removeFaceId();
      return;
    }

    // Si no lo tiene → ofrecer métodos de registro
    const options = [{ text: 'Cancelar', style: 'cancel' }];

    options.push({
      text: '📸 Captura con Cámara',
      onPress: () => enrollFaceIdCamera(),
    });

    if (biometricSupport?.hasFaceId) {
      options.push({
        text: '🔐 Face ID Nativo',
        onPress: () => enrollFaceIdNative(),
      });
    }

    Alert.alert('Reconocimiento Facial', 'Elige el método de registro', options);
  };

  const enrollFaceIdCamera = async () => {
    try {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert(
          'Permisos necesarios',
          permission.message ||
            'Se necesita acceso a la cámara para usar reconocimiento facial'
        );
        return;
      }
      setShowFacialCapture(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudo acceder a la cámara');
    }
  };

  const handleFacialCaptureComplete = async (captureData) => {
    setShowFacialCapture(false);
    setProcesandoFacial(true);

    try {
      const empleadoId = getEmpleadoId();
      if (!empleadoId) throw new Error('No se encontró el ID del empleado');

      console.log('📸 Captura completada, procesando datos faciales...');

      // Verificar si ya viene con detección facial
      if (captureData.faceDetectionUsed) {
        console.log('✅ Usando datos de detección facial real de Vision Camera');
      }

      const faceFeatures = processFaceData(captureData.faceData);
      const validation = validateFaceQuality(faceFeatures);

      if (!validation.isValid) {
        console.warn('⚠️ Validación de calidad falló:', validation.errors);
        Alert.alert(
          '⚠️ Calidad insuficiente',
          validation.errors.join('\n') + '\n\n¿Deseas intentar de nuevo?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setProcesandoFacial(false) },
            { text: 'Reintentar', onPress: () => setShowFacialCapture(true) },
          ]
        );
        setProcesandoFacial(false);
        return;
      }

      console.log('✅ Validación de calidad exitosa, extrayendo características...');

      // Extraer características faciales para comparación local
      const features = extractFaceFeatures(faceFeatures);

      // Guardar características localmente (PRINCIPAL)
      const saveResult = await saveFaceFeatures(
        empleadoId,
        features,
        captureData.photoUri
      );

      if (saveResult.success) {
        setHasFacial(true);
        console.log('✅ Reconocimiento facial registrado exitosamente (local)');

        // También intentar guardar en el backend si hay token (OPCIONAL)
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (token) {
            // Convertir features a base64 para enviar al backend
            const featuresString = JSON.stringify(features);
            const featuresBase64 = btoa(unescape(encodeURIComponent(featuresString)));

            await guardarFacial(empleadoId, featuresBase64, token);
            console.log('✅ También guardado en backend');
          }
        } catch (backendError) {
          console.warn('⚠️ No se pudo guardar en backend:', backendError.message);
          // No importa si falla el backend, ya está guardado localmente
        }

        Alert.alert(
          '✅ ¡Éxito!',
          'Tu reconocimiento facial ha sido registrado correctamente.\n\nAhora puedes usar tu rostro para verificar tu identidad.'
        );
      } else {
        throw new Error(saveResult.error);
      }
    } catch (error) {
      console.error('❌ Error en handleFacialCaptureComplete:', error);
      Alert.alert(
        '❌ Error',
        error.message || 'No se pudo procesar el reconocimiento facial'
      );
    } finally {
      setProcesandoFacial(false);
    }
  };

  const handleFacialCaptureCancel = () => {
    setShowFacialCapture(false);
  };

  const enrollFaceIdNative = async () => {
    setProcesandoFacial(true);
    try {
      const empleadoId = getEmpleadoId();
      if (!empleadoId) throw new Error('No se encontró el ID del empleado');

      const resultado = await capturarReconocimientoFacial(empleadoId);
      const token = await AsyncStorage.getItem('userToken');
      const response = await guardarFacial(empleadoId, resultado.template, token);

      if (response.success) {
        setHasFacial(true);
        Alert.alert('✅ ¡Éxito!', 'Tu Face ID ha sido registrado correctamente');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'No se pudo registrar el reconocimiento facial'
      );
    } finally {
      setProcesandoFacial(false);
    }
  };

  const removeFaceId = async () => {
    Alert.alert(
      '⚠️ Eliminar Reconocimiento Facial',
      '¿Estás seguro de que deseas eliminar tu reconocimiento facial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setProcesandoFacial(true);
            try {
              const empleadoId = getEmpleadoId();

              // Eliminar datos locales (PRINCIPAL)
              await deleteFaceFeatures(empleadoId);
              await clearLocalFacialData(empleadoId);

              // Intentar eliminar del backend (OPCIONAL)
              try {
                const token = await AsyncStorage.getItem('userToken');
                if (token) {
                  await eliminarCredencial(empleadoId, 'facial', token);
                  await limpiarDatosLocales(empleadoId);
                }
              } catch (backendError) {
                console.warn('⚠️ No se pudo eliminar del backend:', backendError.message);
              }

              setHasFacial(false);
              Alert.alert(
                '✅ Eliminado',
                'Tu reconocimiento facial ha sido eliminado'
              );
            } catch (error) {
              Alert.alert(
                'Error',
                'No se pudo eliminar el reconocimiento facial'
              );
            } finally {
              setProcesandoFacial(false);
            }
          },
        },
      ]
    );
  };

  // ─── PIN ────────────────────────────────────────────────────────────────
  const handlePinPress = () => {
    const estado = getEstado('pin');

    // Si ya lo tiene → ofrecer cambiar o eliminar
    if (estado === 'activo') {
      Alert.alert('PIN de Seguridad', '¿Qué deseas hacer?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar PIN',
          onPress: () => {
            setIsChangingPin(true);
            setShowPinModal(true);
          },
        },
        {
          text: 'Eliminar PIN',
          style: 'destructive',
          onPress: () => removePin(),
        },
      ]);
      return;
    }

    // Si no lo tiene → configurar nuevo
    setIsChangingPin(false);
    setShowPinModal(true);
  };

  const handlePinConfirm = async (pin) => {
    setProcesandoPin(true);
    try {
      const empleadoId = getEmpleadoId();
      if (!empleadoId) throw new Error('No se encontró el ID del empleado');

      const token = await AsyncStorage.getItem('userToken');
      const response = await guardarPin(empleadoId, pin, token);

      if (response.success) {
        setHasPin(true);
        Alert.alert(
          '✅ ¡Éxito!',
          isChangingPin
            ? 'Tu PIN ha sido actualizado correctamente'
            : 'Tu PIN ha sido configurado correctamente'
        );
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      throw error;
    } finally {
      setProcesandoPin(false);
    }
  };

  const removePin = async () => {
    Alert.alert(
      '⚠️ Eliminar PIN',
      '¿Estás seguro de que deseas eliminar tu PIN de seguridad?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setProcesandoPin(true);
            try {
              const empleadoId = getEmpleadoId();
              const token = await AsyncStorage.getItem('userToken');
              const response = await eliminarCredencial(empleadoId, 'pin', token);

              if (response.success) {
                setHasPin(false);
                Alert.alert('✅ Eliminado', 'Tu PIN ha sido eliminado');
              } else {
                throw new Error(response.message);
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el PIN');
            } finally {
              setProcesandoPin(false);
            }
          },
        },
      ]
    );
  };

  // ─── Si está en captura facial, renderizar solo esa pantalla ─────────────
  if (showFacialCapture) {
    return (
      <FacialCaptureScreen
        onCapture={handleFacialCaptureComplete}
        onCancel={handleFacialCaptureCancel}
        darkMode={darkMode}
      />
    );
  }

  // ─── Overlay de procesamiento facial ────────────────────────────────────
  if (procesandoFacial && !showFacialCapture) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.backButton} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Procesando</Text>
              <Text style={styles.headerSubtitle}>Analizando datos faciales</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>
            🔍 Analizando reconocimiento facial...
          </Text>
          <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8, color: '#9ca3af' }]}>
            Esto puede tomar unos segundos
          </Text>
        </View>
      </View>
    );
  }

  // ─── Loading ────────────────────────────────────────────────────────────
  if (isLoadingCredentials) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Seguridad</Text>
              <Text style={styles.headerSubtitle}>Cargando...</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>
            Cargando configuración de seguridad...
          </Text>
        </View>
      </View>
    );
  }

  // ─── Datos de los métodos para renderizar ──────────────────────────────
  const metodos = [
    {
      id: 'dactilar',
      nombre: 'Huella Digital',
      icono: 'finger-print',
      estado: getEstado('dactilar'),
      procesando: procesandoHuella,
      handler: handleHuellaPress,
    },
    {
      id: 'facial',
      nombre: 'Reconocimiento Facial',
      icono: 'scan',
      estado: getEstado('facial'),
      procesando: procesandoFacial,
      handler: handleFacialPress,
    },
    {
      id: 'pin',
      nombre: 'PIN de Seguridad',
      icono: 'keypad',
      estado: getEstado('pin'),
      procesando: procesandoPin,
      handler: handlePinPress,
    },
  ];

  // ─── RENDER PRINCIPAL ───────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Seguridad</Text>
            <Text style={styles.headerSubtitle}>Métodos de acceso</Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons
            name="shield-checkmark"
            size={32}
            color={darkMode ? '#93c5fd' : '#2563eb'}
          />
          <Text style={styles.infoTitle}>Protege tu cuenta</Text>
          <Text style={styles.infoText}>
            Elige los métodos de autenticación que prefieras para acceder a tu cuenta
          </Text>
        </View>

        {/* Botones de métodos */}
        <View style={styles.metodosContainer}>
          {metodos.map((metodo) => {
            const colores = ESTADO_COLORES[metodo.estado];
            const estaPresionado = presionado === metodo.id;

            return (
              <TouchableOpacity
                key={metodo.id}
                activeOpacity={1}
                disabled={metodo.procesando}
                onPressIn={() => setPresionado(metodo.id)}
                onPressOut={() => setPresionado(null)}
                onPress={() => metodo.handler()}
                style={[
                  styles.botonMetodo,
                  {
                    backgroundColor: estaPresionado
                      ? colores.bgPressed
                      : colores.bg,
                  },
                ]}
                hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
              >
                {/* Icono */}
                <View style={styles.botonIconContainer}>
                  {metodo.procesando ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons
                      name={metodo.icono}
                      size={30}
                      color={colores.icono}
                    />
                  )}
                </View>

                {/* Nombre */}
                <Text
                  style={[styles.botonNombre, { color: colores.texto }]}
                >
                  {metodo.nombre}
                </Text>

                {/* Indicador derecho */}
                <View style={styles.botonIndicador}>
                  {metodo.estado === 'activo' ? (
                    <Ionicons name="checkmark-circle" size={26} color="#fff" />
                  ) : metodo.estado === 'noDisponible' ? (
                    <Ionicons name="ban" size={26} color="rgba(255,255,255,0.7)" />
                  ) : (
                    <Ionicons
                      name="add-circle-outline"
                      size={26}
                      color="rgba(255,255,255,0.8)"
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal de PIN — fuera del ScrollView para que funcione en iOS */}
      <PinInputModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onConfirm={handlePinConfirm}
        title={isChangingPin ? 'Cambiar PIN' : 'Configurar PIN'}
        subtitle="Ingresa un PIN de 6 dígitos"
        darkMode={darkMode}
        requireConfirmation={true}
        isChanging={isChangingPin}
      />
    </View>
  );
};

// ─── ESTILOS LIGHT ──────────────────────────────────────────────────────────
const securityStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
  header: {
    backgroundColor: '#2563eb',
    paddingTop: Platform.OS === 'android' ? 16 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bfdbfe',
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 40,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 60,
  },

  // Info card superior
  infoCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 10,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Contenedor de botones
  metodosContainer: {
    gap: 12,
    marginBottom: 24,
  },

  // Botón de método
  botonMetodo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  botonIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  botonNombre: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  botonIndicador: {
    // espacio para ícono de estado
  },

  // Leyenda
  leyendaContainer: {
    gap: 6,
    marginBottom: 24,
    paddingLeft: 2,
  },
  leyendaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leyendaPunto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  leyendaTexto: {
    fontSize: 12,
    color: '#6b7280',
  },

  // Tips
  tipsCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400e',
  },
  tipText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 19,
  },
});

// ─── ESTILOS DARK ───────────────────────────────────────────────────────────
const securityStylesDark = StyleSheet.create({
  ...securityStyles,
  container: {
    ...securityStyles.container,
    backgroundColor: '#0f172a',
  },
  header: {
    ...securityStyles.header,
    backgroundColor: '#1e40af',
  },
  infoCard: {
    ...securityStyles.infoCard,
    backgroundColor: '#1e3a8a',
  },
  infoTitle: {
    ...securityStyles.infoTitle,
    color: '#f9fafb',
  },
  infoText: {
    ...securityStyles.infoText,
    color: '#cbd5e1',
  },
  loadingText: {
    ...securityStyles.loadingText,
    color: '#9ca3af',
  },
  leyendaTexto: {
    ...securityStyles.leyendaTexto,
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