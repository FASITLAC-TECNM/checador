// components/MetodoAutenticacion.jsx
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PinInputModal } from './PinInputModal';
import { capturarHuellaDigital } from '../services/biometric.service';
import { guardarDactilar, guardarPin } from '../services/credenciales.service';
import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');

export const MetodoAutenticacionModal = ({ 
  visible, 
  onClose, 
  onSuccess,
  userData,
  darkMode = false 
}) => {
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [configuracion, setConfiguracion] = useState(null);
  const [metodosOrdenados, setMetodosOrdenados] = useState([]);
  const [showPinModal, setShowPinModal] = useState(false);

  const styles = darkMode ? authStylesDark : authStyles;

  // Cargar configuración de la empresa
  useEffect(() => {
    if (visible) {
      cargarConfiguracion();
    }
  }, [visible]);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      console.log('📋 Obteniendo configuración de credenciales...');
      
      const response = await fetch(`${API_URL}/configuracion`, {
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('✅ Configuración obtenida:', data);

      if (data && data.credenciales_orden) {
        const orden = typeof data.credenciales_orden === 'string' 
          ? JSON.parse(data.credenciales_orden) 
          : data.credenciales_orden;

        console.log('📊 Orden de credenciales:', orden);
        setConfiguracion(data);
        ordenarMetodos(orden);
      } else {
        // Orden por defecto si no hay configuración
        setMetodosOrdenados(getMetodosPorDefecto());
      }
    } catch (error) {
      console.error('❌ Error cargando configuración:', error);
      // Usar orden por defecto en caso de error
      setMetodosOrdenados(getMetodosPorDefecto());
    } finally {
      setLoading(false);
    }
  };

  const ordenarMetodos = (orden) => {
    const metodosDisponibles = {
      'pin': {
        id: 'pin',
        nombre: 'PIN de Seguridad',
        descripcion: 'Código de 6 dígitos',
        icono: 'keypad',
        color: '#10b981',
        gradiente: ['#10b981', '#059669'],
        disponible: true,
        handler: handleRegistrarPIN
      },
      'dactilar': {
        id: 'dactilar',
        nombre: 'Huella Digital',
        descripcion: 'Sensor biométrico',
        icono: 'finger-print',
        color: '#3b82f6',
        gradiente: ['#3b82f6', '#2563eb'],
        disponible: true,
        handler: handleRegistrarHuella
      },
      'facial': {
        id: 'facial',
        nombre: 'Reconocimiento Facial',
        descripcion: 'Próximamente disponible',
        icono: 'scan',
        color: '#6b7280',
        gradiente: ['#6b7280', '#4b5563'],
        disponible: false,
        handler: null
      }
    };

    // Ordenar según configuración
    const metodosOrdenados = orden
      .map(key => metodosDisponibles[key])
      .filter(metodo => metodo !== undefined);

    console.log('✅ Métodos ordenados:', metodosOrdenados.map(m => m.nombre));
    setMetodosOrdenados(metodosOrdenados);
  };

  const getMetodosPorDefecto = () => {
    return [
      {
        id: 'pin',
        nombre: 'PIN de Seguridad',
        descripcion: 'Código de 6 dígitos',
        icono: 'keypad',
        color: '#10b981',
        gradiente: ['#10b981', '#059669'],
        disponible: true,
        handler: handleRegistrarPIN
      },
      {
        id: 'dactilar',
        nombre: 'Huella Digital',
        descripcion: 'Sensor biométrico',
        icono: 'finger-print',
        color: '#3b82f6',
        gradiente: ['#3b82f6', '#2563eb'],
        disponible: true,
        handler: handleRegistrarHuella
      },
      {
        id: 'facial',
        nombre: 'Reconocimiento Facial',
        descripcion: 'Próximamente disponible',
        icono: 'scan',
        color: '#6b7280',
        gradiente: ['#6b7280', '#4b5563'],
        disponible: false,
        handler: null
      }
    ];
  };

  const handleRegistrarPIN = () => {
    console.log('🔢 Abriendo modal de PIN...');
    setShowPinModal(true);
  };

  const handleConfirmarPIN = async (pin) => {
    try {
      setProcesando(true);
      console.log('💾 Guardando PIN...');

      await guardarPin(userData.empleado_id, pin, userData.token);
      
      console.log('✅ PIN guardado exitosamente');
      Alert.alert(
        '¡Éxito!',
        'PIN configurado correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowPinModal(false);
              if (onSuccess) onSuccess('pin');
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error guardando PIN:', error);
      throw error; // El PinInputModal manejará el error
    } finally {
      setProcesando(false);
    }
  };

  const handleRegistrarHuella = async () => {
    try {
      setProcesando(true);
      console.log('👆 Iniciando registro de huella...');

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
                // Capturar huella usando el servicio biométrico
                const resultado = await capturarHuellaDigital(userData.empleado_id);
                
                if (!resultado.success) {
                  throw new Error('No se pudo capturar la huella');
                }

                console.log('✅ Huella capturada, guardando en servidor...');

                // Guardar en el servidor
                await guardarDactilar(
                  userData.empleado_id,
                  resultado.template,
                  userData.token
                );

                console.log('✅ Huella guardada exitosamente');
                
                Alert.alert(
                  '¡Éxito!',
                  'Huella digital registrada correctamente',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        if (onSuccess) onSuccess('dactilar');
                        onClose();
                      }
                    }
                  ]
                );
              } catch (error) {
                console.error('❌ Error en registro de huella:', error);
                Alert.alert(
                  'Error',
                  error.message || 'No se pudo registrar la huella. Verifica que tu dispositivo tenga sensor biométrico.',
                  [{ text: 'OK' }]
                );
              } finally {
                setProcesando(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error:', error);
      setProcesando(false);
    }
  };

  const handleMetodoNoDisponible = (nombreMetodo) => {
    Alert.alert(
      'Próximamente',
      `${nombreMetodo} estará disponible en una próxima actualización.`,
      [{ text: 'Entendido' }]
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <LinearGradient
              colors={darkMode ? ['#1e40af', '#2563eb'] : ['#2563eb', '#3b82f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>

              <View style={styles.headerIcon}>
                <Ionicons name="shield-checkmark" size={48} color="#fff" />
              </View>

              <Text style={styles.headerTitle}>Método de Acceso</Text>
              <Text style={styles.headerSubtitle}>
                Selecciona cómo deseas acceder al sistema
              </Text>
            </LinearGradient>

            {/* Content */}
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Cargando opciones...</Text>
                </View>
              ) : (
                <View style={styles.metodosContainer}>
                  {metodosOrdenados.map((metodo, index) => (
                    <TouchableOpacity
                      key={metodo.id}
                      style={[
                        styles.metodoCard,
                        !metodo.disponible && styles.metodoCardDisabled
                      ]}
                      onPress={() => {
                        if (metodo.disponible && metodo.handler && !procesando) {
                          metodo.handler();
                        } else if (!metodo.disponible) {
                          handleMetodoNoDisponible(metodo.nombre);
                        }
                      }}
                      disabled={!metodo.disponible || procesando}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={metodo.gradiente}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.metodoGradient,
                          !metodo.disponible && styles.metodoGradientDisabled
                        ]}
                      >
                        <View style={styles.metodoIconContainer}>
                          <Ionicons 
                            name={metodo.icono} 
                            size={40} 
                            color="#fff" 
                          />
                        </View>

                        <View style={styles.metodoInfo}>
                          <Text style={styles.metodoNombre}>
                            {metodo.nombre}
                          </Text>
                          <Text style={styles.metodoDescripcion}>
                            {metodo.descripcion}
                          </Text>
                        </View>

                        <View style={styles.metodoAction}>
                          {!metodo.disponible ? (
                            <View style={styles.proximamenteBadge}>
                              <Text style={styles.proximamenteText}>Próximamente</Text>
                            </View>
                          ) : (
                            <Ionicons 
                              name="chevron-forward" 
                              size={24} 
                              color="#fff" 
                            />
                          )}
                        </View>
                      </LinearGradient>

                      {/* Indicador de orden */}
                      <View style={[styles.ordenBadge, { backgroundColor: metodo.color }]}>
                        <Text style={styles.ordenText}>{index + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Info adicional */}
              {!loading && (
                <View style={styles.infoContainer}>
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color="#3b82f6" />
                    <Text style={styles.infoText}>
                      El orden de los métodos es configurado por tu administrador.
                      Elige el que prefieras para acceder rápidamente.
                    </Text>
                  </View>

                  <View style={styles.securityInfo}>
                    <Ionicons name="lock-closed" size={16} color="#6b7280" />
                    <Text style={styles.securityText}>
                      Tus datos biométricos están protegidos con cifrado de extremo a extremo
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de PIN */}
      <PinInputModal
        visible={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setProcesando(false);
        }}
        onConfirm={handleConfirmarPIN}
        title="Configurar PIN"
        subtitle="Ingresa un PIN de 6 dígitos"
        darkMode={darkMode}
        requireConfirmation={true}
      />
    </>
  );
};

const authStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0f2fe',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  metodosContainer: {
    padding: 20,
    gap: 16,
  },
  metodoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metodoCardDisabled: {
    opacity: 0.6,
  },
  metodoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  metodoGradientDisabled: {
    opacity: 0.5,
  },
  metodoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metodoInfo: {
    flex: 1,
    gap: 4,
  },
  metodoNombre: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  metodoDescripcion: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  metodoAction: {
    justifyContent: 'center',
  },
  proximamenteBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  proximamenteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  ordenBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  ordenText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  infoContainer: {
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

const authStylesDark = StyleSheet.create({
  ...authStyles,
  modalContent: {
    ...authStyles.modalContent,
    backgroundColor: '#1e293b',
  },
  loadingText: {
    ...authStyles.loadingText,
    color: '#9ca3af',
  },
  infoBox: {
    ...authStyles.infoBox,
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  infoText: {
    ...authStyles.infoText,
    color: '#93c5fd',
  },
  securityText: {
    ...authStyles.securityText,
    color: '#9ca3af',
  },
});