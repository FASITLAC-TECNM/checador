import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Alert, ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WelcomeScreen } from './WelcomeScreen';
import { DeviceConfigScreen } from './DeviceConfigScreen';
import { PendingApprovalScreen } from './PendingApprovalScreen';
import { ApprovedScreen } from './ApprovedScreen';

const STORAGE_KEYS = {
  DEVICE_ID: '@device_id',
  SOLICITUD_ID: '@solicitud_id',
  USER_EMAIL: '@user_email',
  DEVICE_INFO: '@device_info',
  APPROVAL_DATE: '@approval_date',
  ONBOARDING_COMPLETED: '@onboarding_completed'
};

export const OnboardingNavigator = ({ onComplete }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    email: '',
    deviceInfo: {},
    tokenSolicitud: '',
    idSolicitud: null,
    idDispositivo: null,
    fechaAprobacion: null
  });

  // Verificar si ya existe un dispositivo registrado
  useEffect(() => {
    checkExistingDevice();
  }, []);

  const checkExistingDevice = async () => {
    try {
      console.log('🔍 Verificando si existe un dispositivo registrado...');
      
      const [deviceId, solicitudId, email, deviceInfo, approvalDate, completed] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID),
        AsyncStorage.getItem(STORAGE_KEYS.SOLICITUD_ID),
        AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL),
        AsyncStorage.getItem(STORAGE_KEYS.DEVICE_INFO),
        AsyncStorage.getItem(STORAGE_KEYS.APPROVAL_DATE),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
      ]);

      if (completed === 'true' && deviceId && solicitudId) {
        console.log('✅ Dispositivo ya registrado:', {
          deviceId,
          solicitudId,
          email
        });

        // El dispositivo ya está registrado, saltar onboarding
        const savedData = {
          idDispositivo: deviceId,
          idSolicitud: solicitudId,
          email: email || '',
          deviceInfo: deviceInfo ? JSON.parse(deviceInfo) : {},
          fechaAprobacion: approvalDate || null
        };

        onComplete(savedData);
      } else {
        console.log('ℹ️ No hay dispositivo registrado, iniciando onboarding...');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Error verificando dispositivo existente:', error);
      setIsLoading(false);
    }
  };

  const saveDeviceData = async (data) => {
    try {
      console.log('💾 Guardando datos del dispositivo:', data);

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, data.idDispositivo.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.SOLICITUD_ID, data.idSolicitud.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, data.email || ''),
        AsyncStorage.setItem(STORAGE_KEYS.DEVICE_INFO, JSON.stringify(data.deviceInfo || {})),
        AsyncStorage.setItem(STORAGE_KEYS.APPROVAL_DATE, data.fechaAprobacion || ''),
        AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true')
      ]);

      console.log('✅ Datos guardados exitosamente');
    } catch (error) {
      console.error('❌ Error guardando datos del dispositivo:', error);
      throw error;
    }
  };

  const clearDeviceData = async () => {
    try {
      console.log('🗑️ Limpiando datos del dispositivo...');
      
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.DEVICE_ID),
        AsyncStorage.removeItem(STORAGE_KEYS.SOLICITUD_ID),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_EMAIL),
        AsyncStorage.removeItem(STORAGE_KEYS.DEVICE_INFO),
        AsyncStorage.removeItem(STORAGE_KEYS.APPROVAL_DATE),
        AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
      ]);

      console.log('✅ Datos limpiados exitosamente');
    } catch (error) {
      console.error('❌ Error limpiando datos:', error);
    }
  };

  const handleNext = (data) => {
    console.log('📝 Datos recibidos en paso:', currentStep, data);
    setOnboardingData(prev => ({ ...prev, ...data }));
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleApproved = async (approvalData) => {
    console.log('✅ Solicitud aprobada:', approvalData);
    
    const completeData = {
      ...onboardingData,
      idDispositivo: approvalData.idDispositivo,
      idSolicitud: approvalData.idSolicitud,
      fechaAprobacion: approvalData.fechaAprobacion
    };

    setOnboardingData(completeData);
    setCurrentStep(3); // Ir a ApprovedScreen
  };

  const handleRejected = async (rejectionData) => {
    console.log('❌ Solicitud rechazada:', rejectionData);
    
    Alert.alert(
      'Solicitud Rechazada',
      `Motivo: ${rejectionData.motivo_rechazo || 'No especificado'}\n\n¿Deseas intentar nuevamente?`,
      [
        {
          text: 'Reintentar',
          onPress: () => setCurrentStep(1) // Volver a DeviceConfigScreen
        },
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {
            setCurrentStep(0); // Volver al inicio
          }
        }
      ]
    );
  };

  const handleComplete = async () => {
    console.log('🎉 Onboarding completado con datos:', onboardingData);
    
    try {
      // Guardar datos permanentemente
      await saveDeviceData(onboardingData);

      // Notificar al componente padre que el onboarding está completo
      onComplete(onboardingData);
    } catch (error) {
      console.error('❌ Error guardando datos del onboarding:', error);
      Alert.alert(
        'Error',
        'No se pudieron guardar los datos. Por favor intenta nuevamente.',
        [
          {
            text: 'Reintentar',
            onPress: handleComplete
          },
          {
            text: 'Cancelar',
            style: 'cancel'
          }
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
    <SafeAreaView style={styles.container}>
      {currentStep === 0 && (
        <WelcomeScreen onNext={() => setCurrentStep(1)} />
      )}
      
      {currentStep === 1 && (
        <DeviceConfigScreen
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}
      
      {currentStep === 2 && (
        <PendingApprovalScreen
          tokenSolicitud={onboardingData.tokenSolicitud}
          idSolicitud={onboardingData.idSolicitud}
          onApproved={handleApproved}
          onRejected={handleRejected}
        />
      )}
      
      {currentStep === 3 && (
        <ApprovedScreen
          email={onboardingData.email}
          deviceInfo={onboardingData.deviceInfo}
          onComplete={handleComplete}
        />
      )}
    </SafeAreaView>
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