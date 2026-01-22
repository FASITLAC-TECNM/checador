import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Alert, ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WelcomeScreen } from './WelcomeScreen';
import { CompanyAffiliationScreen } from './CompanyAffilationScreen';
import { DeviceConfigScreen } from './DeviceConfigScreen';
import { PendingApprovalScreen } from './PendingApprovalScreen';
import { ApprovedScreen } from './ApprovedScreen';
import { RejectedScreen } from './RejectedScreen';
import { getSolicitudPorToken } from '../../services/solicitudMovilService';

const STORAGE_KEYS = {
  DEVICE_ID: '@device_id',
  SOLICITUD_ID: '@solicitud_id',
  TOKEN_SOLICITUD: '@token_solicitud',
  USER_EMAIL: '@user_email',
  DEVICE_INFO: '@device_info',
  EMPRESA_ID: '@empresa_id',
  EMPRESA_NOMBRE: '@empresa_nombre',
  APPROVAL_DATE: '@approval_date',
  ONBOARDING_COMPLETED: '@onboarding_completed'
};

export const OnboardingNavigator = ({ onComplete }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    email: '',
    empresaId: '',
    empresaNombre: '',
    deviceInfo: {},
    tokenSolicitud: '',
    idSolicitud: null,
    idDispositivo: null,
    fechaAprobacion: null,
    motivoRechazo: ''
  });

  // Verificar si ya existe un dispositivo registrado
  useEffect(() => {
    checkExistingDevice();
  }, []);

  const checkExistingDevice = async () => {
    try {
      const [deviceId, solicitudId, tokenSolicitud, email, deviceInfo, empresaId, empresaNombre, approvalDate, completed] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID),
        AsyncStorage.getItem(STORAGE_KEYS.SOLICITUD_ID),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN_SOLICITUD),
        AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL),
        AsyncStorage.getItem(STORAGE_KEYS.DEVICE_INFO),
        AsyncStorage.getItem(STORAGE_KEYS.EMPRESA_ID),
        AsyncStorage.getItem(STORAGE_KEYS.EMPRESA_NOMBRE),
        AsyncStorage.getItem(STORAGE_KEYS.APPROVAL_DATE),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
      ]);

      if (completed === 'true' && deviceId && solicitudId && tokenSolicitud && empresaId) {
        // 🔍 VERIFICAR EN EL SERVIDOR USANDO EL TOKEN (ruta pública)
        try {
          const response = await getSolicitudPorToken(tokenSolicitud);

          const estadoLower = response.estado?.toLowerCase();

          if (estadoLower === 'aceptado') {
            const savedData = {
              idDispositivo: deviceId,
              idSolicitud: solicitudId,
              email: email || '',
              empresaId: empresaId,
              empresaNombre: empresaNombre || '',
              deviceInfo: deviceInfo ? JSON.parse(deviceInfo) : {},
              fechaAprobacion: approvalDate || null
            };

            onComplete(savedData);
          } else {
            await clearDeviceData();

            let mensaje = '';
            if (estadoLower === 'pendiente') {
              mensaje = 'Tu solicitud aún está pendiente de aprobación.';
            } else if (estadoLower === 'rechazado') {
              mensaje = `Tu solicitud fue rechazada.\nMotivo: ${response.observaciones || 'No especificado'}`;
            } else {
              mensaje = `Estado actual: ${response.estado}`;
            }

            Alert.alert(
              'Registro No Válido',
              `${mensaje}\n\nDebes completar el proceso de registro nuevamente.`,
              [{ text: 'Entendido', onPress: () => setIsLoading(false) }]
            );
          }
        } catch (error) {
          // Si la solicitud fue eliminada (404)
          if (error.message?.includes('no encontrada') || error.message?.includes('eliminada')) {
            await clearDeviceData();
            
            Alert.alert(
              'Registro Eliminado',
              'Tu registro anterior fue eliminado del sistema.\n\nDebes registrarte nuevamente.',
              [{ text: 'Entendido', onPress: () => setIsLoading(false) }]
            );
          } else {
            // Error de red
            Alert.alert(
              'Sin Conexión',
              'No se pudo verificar tu registro. Verifica tu conexión a internet.',
              [
                {
                  text: 'Reintentar',
                  onPress: () => checkExistingDevice()
                },
                {
                  text: 'Registrar de Nuevo',
                  onPress: async () => {
                    await clearDeviceData();
                    setIsLoading(false);
                  }
                }
              ]
            );
          }
        }
      } else {
        console.log('ℹ️ No hay dispositivo registrado, iniciando onboarding...');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Error verificando dispositivo:', error);
      setIsLoading(false);
    }
  };

  const saveDeviceData = async (data) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, data.idDispositivo.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.SOLICITUD_ID, data.idSolicitud.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN_SOLICITUD, data.tokenSolicitud || ''),
        AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, data.email || ''),
        AsyncStorage.setItem(STORAGE_KEYS.EMPRESA_ID, data.empresaId || ''),
        AsyncStorage.setItem(STORAGE_KEYS.EMPRESA_NOMBRE, data.empresaNombre || ''),
        AsyncStorage.setItem(STORAGE_KEYS.DEVICE_INFO, JSON.stringify(data.deviceInfo || {})),
        AsyncStorage.setItem(STORAGE_KEYS.APPROVAL_DATE, data.fechaAprobacion || ''),
        AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true')
      ]);
    } catch (error) {
      console.error('❌ Error guardando datos:', error);
      throw error;
    }
  };

  const clearDeviceData = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.DEVICE_ID),
        AsyncStorage.removeItem(STORAGE_KEYS.SOLICITUD_ID),
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN_SOLICITUD),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_EMAIL),
        AsyncStorage.removeItem(STORAGE_KEYS.EMPRESA_ID),
        AsyncStorage.removeItem(STORAGE_KEYS.EMPRESA_NOMBRE),
        AsyncStorage.removeItem(STORAGE_KEYS.DEVICE_INFO),
        AsyncStorage.removeItem(STORAGE_KEYS.APPROVAL_DATE),
        AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
      ]);
    } catch (error) {
      console.error('❌ Error limpiando datos:', error);
    }
  };

  const handleNext = (data) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleApproved = async (approvalData) => {
    const completeData = {
      ...onboardingData,
      idDispositivo: approvalData.idDispositivo,
      idSolicitud: approvalData.idSolicitud,
      fechaAprobacion: approvalData.fechaAprobacion
    };

    setOnboardingData(completeData);
    setCurrentStep(4);
  };

  const handleRejected = async (rejectionData) => {
    const completeData = {
      ...onboardingData,
      motivoRechazo: rejectionData.observaciones || 'No se especificó un motivo'
    };

    setOnboardingData(completeData);
    setCurrentStep(5);
  };

  const handleRetry = async () => {
    // NO limpiar los datos de la solicitud rechazada
    // Solo resetear el flujo para que el usuario pueda reintentar
    
    // Guardar la solicitud rechazada para reintentarla
    try {
      if (onboardingData.idSolicitud && onboardingData.tokenSolicitud) {
        await AsyncStorage.setItem('@solicitud_rechazada_id', onboardingData.idSolicitud.toString());
        await AsyncStorage.setItem('@solicitud_rechazada_token', onboardingData.tokenSolicitud);
        console.log('💾 Solicitud rechazada guardada para reintento:', onboardingData.idSolicitud);
      }
    } catch (error) {
      console.error('Error guardando solicitud rechazada:', error);
    }
    
    // Resetear solo el motivoRechazo y volver al inicio
    setOnboardingData(prev => ({
      ...prev,
      motivoRechazo: ''
    }));
    
    setCurrentStep(0); // Volver al WelcomeScreen
  };

  const handleCancelAfterRejection = () => {
    // Puedes cerrar la app o hacer logout
    Alert.alert(
      'Salir',
      '¿Estás seguro que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Salir', 
          onPress: () => {
            // Aquí puedes implementar la lógica para cerrar la app
            // o navegar a una pantalla de login si existe
            setCurrentStep(0);
          }
        }
      ]
    );
  };

  const handleComplete = async () => {
    try {
      await saveDeviceData(onboardingData);
      onComplete(onboardingData);
    } catch (error) {
      console.error('❌ Error guardando datos:', error);
      Alert.alert(
        'Error',
        'No se pudieron guardar los datos. Por favor intenta nuevamente.',
        [
          { text: 'Reintentar', onPress: handleComplete },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
    }
  };

  // Mostrar pantalla de carga mientras verifica dispositivo existente
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {/* Paso 0: Bienvenida */}
        {currentStep === 0 && (
          <WelcomeScreen onNext={() => setCurrentStep(1)} />
        )}
        
        {/* Paso 1: Afiliación a Empresa */}
        {currentStep === 1 && (
          <CompanyAffiliationScreen
            onNext={handleNext}
            onPrevious={() => setCurrentStep(0)}
          />
        )}
        
        {/* Paso 2: Configuración de Dispositivo */}
        {currentStep === 2 && (
          <DeviceConfigScreen
            empresaId={onboardingData.empresaId}
            empresaNombre={onboardingData.empresaNombre}
            onNext={handleNext}
            onPrevious={() => setCurrentStep(1)}
          />
        )}
        
        {/* Paso 3: Esperando Aprobación */}
        {currentStep === 3 && (
          <PendingApprovalScreen
            tokenSolicitud={onboardingData.tokenSolicitud}
            idSolicitud={onboardingData.idSolicitud}
            onApproved={handleApproved}
            onRejected={handleRejected}
          />
        )}
        
        {/* Paso 4: Aprobado */}
        {currentStep === 4 && (
          <ApprovedScreen
            email={onboardingData.email}
            empresaNombre={onboardingData.empresaNombre}
            deviceInfo={onboardingData.deviceInfo}
            onComplete={handleComplete}
          />
        )}

        {/* Paso 5: Rechazado - ¡ESTO FALTABA! */}
        {currentStep === 5 && (
          <RejectedScreen
            motivoRechazo={onboardingData.motivoRechazo}
            onRetry={handleRetry}
            onCancel={handleCancelAfterRejection}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});