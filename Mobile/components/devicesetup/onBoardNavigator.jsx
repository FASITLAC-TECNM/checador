import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Alert, ActivityIndicator, View, Text } from 'react-native';
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

export const OnboardingNavigator = ({ onComplete, userData }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    email: userData?.correo || '',
    empresaId: userData?.empleadoInfo?.empresa_id || '',
    empresaNombre: userData?.empleadoInfo?.empresa_nombre || '',
    nombreUsuario: userData?.nombre || '',
    empleadoId: userData?.empleado_id || null,
    deviceInfo: {},
    tokenSolicitud: '',
    idSolicitud: null,
    idDispositivo: null,
    fechaAprobacion: null,
    motivoRechazo: ''
  });

  useEffect(() => {
    checkExistingDevice();
  }, []);

  const checkExistingDevice = async () => {
    try {
      // Verificar si ya existe una solicitud previa de este dispositivo
      const [solicitudId, tokenSolicitud] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SOLICITUD_ID),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN_SOLICITUD)
      ]);

      if (solicitudId && tokenSolicitud) {
        console.log('🔍 Encontrada solicitud anterior, verificando estado...');
        
        try {
          const response = await getSolicitudPorToken(tokenSolicitud);
          const estadoLower = response.estado?.toLowerCase();

          if (estadoLower === 'aceptado') {
            // Ya fue aprobado, marcar como completado
            console.log('✅ Solicitud ya aprobada');
            await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
            
            const savedData = {
              idDispositivo: response.dispositivo_id || solicitudId,
              idSolicitud: solicitudId,
              email: userData?.correo || '',
              empresaId: userData?.empleadoInfo?.empresa_id || '',
              empresaNombre: userData?.empleadoInfo?.empresa_nombre || '',
              deviceInfo: {},
              fechaAprobacion: response.fecha_respuesta || null
            };

            onComplete(savedData);
            return;
          } else if (estadoLower === 'pendiente') {
            // Continuar esperando aprobación
            console.log('⏳ Solicitud pendiente, continuar esperando');
            setOnboardingData(prev => ({
              ...prev,
              tokenSolicitud,
              idSolicitud: solicitudId
            }));
            setCurrentStep(3); // Ir a PendingApprovalScreen
            setIsLoading(false);
            return;
          } else if (estadoLower === 'rechazado') {
            // Fue rechazada
            console.log('❌ Solicitud rechazada');
            setOnboardingData(prev => ({
              ...prev,
              motivoRechazo: response.observaciones || 'No especificado'
            }));
            setCurrentStep(5); // Ir a RejectedScreen
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.log('⚠️ Error verificando solicitud anterior:', error.message);
          // Si hay error, limpiar y empezar de nuevo
          await clearDeviceData();
        }
      }

      // No hay solicitud anterior o fue eliminada, empezar desde el inicio
      console.log('ℹ️ No hay solicitud previa, iniciando onboarding...');
      setIsLoading(false);
      
    } catch (error) {
      console.error('❌ Error verificando dispositivo:', error);
      setIsLoading(false);
    }
  };

  const saveDeviceData = async (data) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, data.idDispositivo?.toString() || ''),
        AsyncStorage.setItem(STORAGE_KEYS.SOLICITUD_ID, data.idSolicitud?.toString() || ''),
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN_SOLICITUD, data.tokenSolicitud || ''),
        AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, data.email || ''),
        AsyncStorage.setItem(STORAGE_KEYS.EMPRESA_ID, data.empresaId || ''),
        AsyncStorage.setItem(STORAGE_KEYS.EMPRESA_NOMBRE, data.empresaNombre || ''),
        AsyncStorage.setItem(STORAGE_KEYS.DEVICE_INFO, JSON.stringify(data.deviceInfo || {})),
        AsyncStorage.setItem(STORAGE_KEYS.APPROVAL_DATE, data.fechaAprobacion || ''),
        AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true')
      ]);
      console.log('✅ Datos del dispositivo guardados');
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
      console.log('🗑️ Datos del dispositivo limpiados');
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
    // Limpiar la solicitud rechazada y empezar de nuevo
    await clearDeviceData();
    
    setOnboardingData(prev => ({
      ...prev,
      tokenSolicitud: '',
      idSolicitud: null,
      motivoRechazo: ''
    }));
    
    setCurrentStep(0);
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

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Verificando estado del dispositivo...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {/* Paso 0: Bienvenida */}
        {currentStep === 0 && (
          <WelcomeScreen 
            onNext={() => setCurrentStep(1)}
            userName={userData?.nombre}
          />
        )}
        
        {/* Paso 1: Afiliación a Empresa */}
        {currentStep === 1 && (
          <CompanyAffiliationScreen
            onNext={handleNext}
            onPrevious={() => setCurrentStep(0)}
            initialEmpresaId={onboardingData.empresaId}
          />
        )}
        
        {/* Paso 2: Configuración de Dispositivo */}
{currentStep === 2 && (
  <DeviceConfigScreen
    empresaId={onboardingData.empresaId}
    empresaNombre={onboardingData.empresaNombre}
    onNext={handleNext}
    onPrevious={() => setCurrentStep(1)}
    initialEmail={onboardingData.email}
    userData={userData} // ← ✅ AGREGAR ESTA PROP
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

        {/* Paso 5: Rechazado */}
        {currentStep === 5 && (
          <RejectedScreen
            motivoRechazo={onboardingData.motivoRechazo}
            onRetry={handleRetry}
            onCancel={() => {
              Alert.alert(
                'Cancelar registro',
                'Debes registrar este dispositivo para continuar. ¿Deseas intentarlo de nuevo?',
                [
                  { text: 'Sí, intentar de nuevo', onPress: handleRetry },
                  { text: 'Salir', style: 'cancel' }
                ]
              );
            }}
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
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
});