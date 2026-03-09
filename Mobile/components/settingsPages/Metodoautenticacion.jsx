
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PinInputModal } from './PinInputModal';
import { capturarHuellaDigital } from '../services/biometric.service';
import { processFaceData, validateFaceQuality, generateFacialTemplate } from '../services/facialCameraService';
import { guardarDactilar, guardarPin, guardarFacial } from '../services/credenciales.service';
import { getApiEndpoint } from '../config/api';
import { getOrdenCredenciales } from '../services/configurationService';
import { FacialCaptureScreen } from '../services/FacialCaptureScreen';

const API_URL = getApiEndpoint('/api');


const ESTADO = {
  activo: {
    bg: '#16a34a',
    bgPressed: '#15803d',
    texto: '#fff',
    icono: '#fff'
  },
  inactivo: {
    bg: '#6b7280',
    bgPressed: '#4b5563',
    texto: '#fff',
    icono: '#fff'
  },
  noDisponible: {
    bg: '#dc2626',
    bgPressed: '#b91c1c',
    texto: '#fff',
    icono: '#fff'
  }
};

export const MetodoAutenticacionModal = ({
  visible,
  onClose,
  onSuccess,
  userData,
  darkMode = false
}) => {
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mostrarCapturaFacial, setMostrarCapturaFacial] = useState(false);
  const [credenciales, setCredenciales] = useState({
    tiene_dactilar: false,
    tiene_facial: false,
    tiene_pin: false
  });

  const [soporteHardware, setSoporteHardware] = useState({
    huella: true,
    facial: true
  });
  const [showPinModal, setShowPinModal] = useState(false);

  const [presionado, setPresionado] = useState(null);

  const [ordenCredenciales, setOrdenCredenciales] = useState(null);

  const styles = darkMode ? authStylesDark : authStyles;


  useEffect(() => {
    if (visible) {
      cargarConfiguracion();
    }
  }, [visible]);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);


      const { checkBiometricSupport } = await import('../services/biometric.service');
      const support = await checkBiometricSupport();

      setSoporteHardware({
        huella: support?.hasFingerprint || false,
        facial: support?.hasFaceId || false
      });


      try {
        const ordenResult = await getOrdenCredenciales(userData?.token);
        if (ordenResult.success && ordenResult.ordenCredenciales) {
          setOrdenCredenciales(ordenResult.ordenCredenciales);
        }
      } catch (error) {

      }


      const empleadoId = userData?.empleado?.id || userData?.empleado_id || userData?.id;
      if (empleadoId && userData?.token) {
        const response = await fetch(
          `${API_URL}/credenciales/empleado/${empleadoId}`,
          {
            headers: {
              Authorization: `Bearer ${userData.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const data = await response.json();
        if (data.success && data.data) {
          setCredenciales(data.data);
        }
      }
    } catch (error) {
      (function () {})('Error en cargarConfiguracion:', error);
    } finally {
      setLoading(false);
    }
  };





  const getEstado = (tipo) => {

    if (ordenCredenciales && ordenCredenciales[tipo] && !ordenCredenciales[tipo].activo) {
      return 'noDisponible';
    }

    switch (tipo) {
      case 'dactilar':
        if (credenciales.tiene_dactilar) return 'activo';
        if (!soporteHardware.huella) return 'noDisponible';
        return 'inactivo';

      case 'facial':
        if (credenciales.tiene_facial) return 'activo';
        if (!soporteHardware.facial) return 'noDisponible';
        return 'inactivo';

      case 'pin':
        if (credenciales.tiene_pin) return 'activo';
        return 'inactivo';

      default:
        return 'inactivo';
    }
  };


  const handleRegistrarHuella = async () => {
    const estado = getEstado('dactilar');
    if (estado === 'noDisponible') {
      Alert.alert(
        'No disponible',
        'Tu dispositivo no tiene sensor de huellas dactilares compatible.'
      );
      return;
    }

    try {
      setProcesando(true);

      Alert.alert(
        'Registrar Huella',
        'Coloca tu dedo en el sensor biométrico cuando se te solicite',
        [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => setProcesando(false)
        },
        {
          text: 'Continuar',
          onPress: async () => {
            try {
              const empleadoId =
              userData?.empleado?.id || userData?.empleado_id || userData?.id;

              const resultado = await capturarHuellaDigital(empleadoId);

              if (!resultado.success) {
                throw new Error('No se pudo capturar la huella');
              }

              await guardarDactilar(
                empleadoId,
                resultado.template,
                userData.token
              );


              setCredenciales((prev) => ({ ...prev, tiene_dactilar: true }));

              Alert.alert('¡Éxito!', 'Huella digital registrada correctamente', [
              {
                text: 'OK',
                onPress: () => {
                  if (onSuccess) onSuccess('dactilar');
                  onClose();
                }
              }]
              );
            } catch (error) {
              Alert.alert(
                'Error',
                error.message ||
                'No se pudo registrar la huella. Verifica que tu dispositivo tenga sensor biométrico.'
              );
            } finally {
              setProcesando(false);
            }
          }
        }]

      );
    } catch (error) {
      setProcesando(false);
    }
  };

  const handleRegistrarFacial = async () => {
    const estado = getEstado('facial');
    if (estado === 'noDisponible') {
      Alert.alert(
        'No disponible',
        'El reconocimiento facial está desactivado en la configuración.'
      );
      return;
    }

    try {

      setMostrarCapturaFacial(true);
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'No se pudo iniciar la captura facial.'
      );
    }
  };

  const handleFacialCaptureComplete = async (captureData) => {
    setMostrarCapturaFacial(false);
    setProcesando(true);

    try {
      const empleadoId =
      userData?.empleado?.id || userData?.empleado_id || userData?.id;

      (function () {})(' Captura facial completada para login');


      if (!captureData.faceDetectionUsed || !captureData.validated) {
        throw new Error('No se detectó un rostro válido en la captura');
      }


      const faceFeatures = processFaceData(captureData.faceData);
      const validation = validateFaceQuality(faceFeatures);

      if (!validation.isValid) {
        (function () {})('️ Validación de calidad falló:', validation.errors);
        Alert.alert(
          '⚠️ Calidad insuficiente',
          validation.errors.join('\n') + '\n\n¿Deseas intentar de nuevo?',
          [
          { text: 'Cancelar', style: 'cancel', onPress: () => setProcesando(false) },
          { text: 'Reintentar', onPress: () => setMostrarCapturaFacial(true) }]

        );
        setProcesando(false);
        return;
      }

      (function () {})(' Validación facial exitosa, generando template...');


      const resultado = await generateFacialTemplate(
        faceFeatures,
        captureData.photoUri,
        empleadoId
      );

      (function () {})(' Guardando en el servidor...');


      await guardarFacial(
        empleadoId,
        resultado.template,
        userData.token
      );


      setCredenciales((prev) => ({ ...prev, tiene_facial: true }));

      Alert.alert('¡Éxito!', 'Reconocimiento facial registrado correctamente', [
      {
        text: 'OK',
        onPress: () => {
          if (onSuccess) onSuccess('facial');
          onClose();
        }
      }]
      );
    } catch (error) {
      (function () {})(' Error en registro facial:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo registrar el reconocimiento facial'
      );
    } finally {
      setProcesando(false);
    }
  };

  const handleFacialCaptureCancel = () => {
    setMostrarCapturaFacial(false);
    setProcesando(false);
  };

  const handleRegistrarPIN = () => {
    setShowPinModal(true);
  };

  const handleConfirmarPIN = async (pin) => {
    try {
      setProcesando(true);

      const empleadoId =
      userData?.empleado?.id || userData?.empleado_id || userData?.id;

      await guardarPin(empleadoId, pin, userData.token);

      setCredenciales((prev) => ({ ...prev, tiene_pin: true }));

      Alert.alert(
        '¡Éxito!',
        credenciales.tiene_pin ? 'PIN actualizado correctamente' : 'PIN configurado correctamente',
        [
        {
          text: 'OK',
          onPress: () => {
            setShowPinModal(false);
            if (onSuccess) onSuccess('pin');
            onClose();
          }
        }]

      );
    } catch (error) {
      throw error;
    } finally {
      setProcesando(false);
    }
  };



  const metodosDisponibles = {
    dactilar: {
      id: 'dactilar',
      nombre: 'Huella Digital',
      icono: 'finger-print',
      handler: handleRegistrarHuella
    },
    facial: {
      id: 'facial',
      nombre: 'Reconocimiento Facial',
      icono: 'scan',
      handler: handleRegistrarFacial
    },
    pin: {
      id: 'pin',
      nombre: 'PIN de Seguridad',
      icono: 'keypad',
      handler: handleRegistrarPIN
    }
  };


  let metodos;
  if (ordenCredenciales) {

    metodos = Object.keys(ordenCredenciales).
    filter((key) => ordenCredenciales[key]?.activo !== false).
    sort((a, b) => {
      const prioridadA = ordenCredenciales[a]?.prioridad || 999;
      const prioridadB = ordenCredenciales[b]?.prioridad || 999;
      return prioridadA - prioridadB;
    }).
    map((key) => metodosDisponibles[key]).
    filter(Boolean);
  } else {

    metodos = Object.values(metodosDisponibles);
  }




  if (mostrarCapturaFacial) {
    return (
      <FacialCaptureScreen
        onCapture={handleFacialCaptureComplete}
        onCancel={handleFacialCaptureCancel}
        darkMode={darkMode} />);


  }

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}>
        
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>

              <View style={styles.headerIconContainer}>
                <Ionicons name="shield-checkmark" size={40} color="#fff" />
              </View>

              <Text style={styles.headerTitle}>Método de Acceso</Text>
              <Text style={styles.headerSubtitle}>
                Selecciona cómo deseas acceder al sistema
              </Text>
            </View>

            {}
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}>
              
              {loading ?
              <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Cargando opciones...</Text>
                </View> :

              <View style={styles.metodosContainer}>
                  {metodos.map((metodo) => {
                  const estado = getEstado(metodo.id);
                  const colores = ESTADO[estado];
                  const estaPresionado = presionado === metodo.id;

                  return (
                    <TouchableOpacity
                      key={metodo.id}
                      activeOpacity={1}
                      disabled={procesando}
                      onPressIn={() => setPresionado(metodo.id)}
                      onPressOut={() => setPresionado(null)}
                      onPress={() => metodo.handler()}
                      style={[
                      styles.botonMetodo,
                      {
                        backgroundColor: estaPresionado ?
                        colores.bgPressed :
                        colores.bg
                      }]
                      }
                      hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}>
                      
                        {}
                        <View style={styles.botonIconContainer}>
                          <Ionicons
                          name={metodo.icono}
                          size={32}
                          color={colores.icono} />
                        
                        </View>

                        {}
                        <Text
                        style={[
                        styles.botonNombre,
                        { color: colores.texto }]
                        }>
                        
                          {metodo.nombre}
                        </Text>

                        {}
                        <View style={styles.botonIndicador}>
                          {estado === 'activo' ?
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#fff" /> :

                        estado === 'noDisponible' ?
                        <Ionicons
                          name="ban"
                          size={24}
                          color="rgba(255,255,255,0.7)" /> :


                        <Ionicons
                          name="add-circle-outline"
                          size={24}
                          color="rgba(255,255,255,0.8)" />

                        }
                        </View>
                      </TouchableOpacity>);

                })}
                </View>
              }

              {}
              {!loading &&
              <View style={styles.leyendaContainer}>
                  <View style={styles.leyendaFila}>
                    <View
                    style={[styles.leyendaPunto, { backgroundColor: '#16a34a' }]} />
                  
                    <Text style={styles.leyendaTexto}>Registrado</Text>
                  </View>
                  <View style={styles.leyendaFila}>
                    <View
                    style={[styles.leyendaPunto, { backgroundColor: '#6b7280' }]} />
                  
                    <Text style={styles.leyendaTexto}>Disponible</Text>
                  </View>
                  <View style={styles.leyendaFila}>
                    <View
                    style={[styles.leyendaPunto, { backgroundColor: '#dc2626' }]} />
                  
                    <Text style={styles.leyendaTexto}>No disponible en este dispositivo</Text>
                  </View>
                </View>
              }
            </ScrollView>
          </View>
        </View>
      </Modal>

      {}
      <PinInputModal
        visible={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setProcesando(false);
        }}
        onConfirm={handleConfirmarPIN}
        title={credenciales.tiene_pin ? 'Cambiar PIN' : 'Configurar PIN'}
        subtitle="Ingresa un PIN de 6 dígitos"
        darkMode={darkMode}
        requireConfirmation={true} />
      
    </>);

};


const authStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10
  },
  header: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 24 : 20,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center'
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bfdbfe',
    textAlign: 'center'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 24
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
    gap: 16
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280'
  },
  metodosContainer: {
    padding: 20,
    gap: 12
  },



  botonMetodo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3
  },
  botonIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  botonNombre: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600'
  },
  botonIndicador: {

  },


  leyendaContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 6
  },
  leyendaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  leyendaPunto: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  leyendaTexto: {
    fontSize: 12,
    color: '#6b7280'
  }
});


const authStylesDark = StyleSheet.create({
  ...authStyles,
  modalContent: {
    ...authStyles.modalContent,
    backgroundColor: '#1e293b'
  },
  header: {
    ...authStyles.header,
    backgroundColor: '#1e40af'
  },
  loadingText: {
    ...authStyles.loadingText,
    color: '#9ca3af'
  },
  leyendaTexto: {
    ...authStyles.leyendaTexto,
    color: '#9ca3af'
  }
});