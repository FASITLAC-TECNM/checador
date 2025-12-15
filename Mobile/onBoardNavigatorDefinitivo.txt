import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Alert } from 'react-native';
import { WelcomeScreen } from './WelcomeScreen';
import { DeviceConfigScreen } from './DeviceConfigScreen';
import { PendingApprovalScreen } from './PendingApprovalScreen';
import { ApprovedScreen } from './ApprovedScreen';

export const OnboardingNavigator = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    email: '',
    deviceInfo: {},
    tokenSolicitud: '',
    idSolicitud: null,
    idDispositivo: null,
    fechaAprobacion: null
  });

  const handleNext = (data) => {
    console.log('📝 Datos recibidos en paso:', currentStep, data);
    setOnboardingData(prev => ({ ...prev, ...data }));
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleApproved = (approvalData) => {
    console.log('✅ Solicitud aprobada:', approvalData);
    setOnboardingData(prev => ({
      ...prev,
      idDispositivo: approvalData.idDispositivo,
      fechaAprobacion: approvalData.fechaAprobacion
    }));
    setCurrentStep(3); // Ir a ApprovedScreen
  };

  const handleRejected = (rejectionData) => {
    console.log('❌ Solicitud rechazada:', rejectionData);
    
    Alert.alert(
      'Solicitud Rechazada',
      'Tu solicitud ha sido rechazada. Por favor contacta con tu administrador o intenta nuevamente.',
      [
        {
          text: 'Reintentar',
          onPress: () => setCurrentStep(1) // Volver a DeviceConfigScreen
        },
        {
          text: 'Salir',
          style: 'cancel',
          onPress: () => {
            // Aquí puedes cerrar la app o volver al inicio
            setCurrentStep(0);
          }
        }
      ]
    );
  };

  const handleComplete = async () => {
    console.log('🎉 Onboarding completado con datos:', onboardingData);
    
    try {
      // Aquí puedes guardar en AsyncStorage o hacer cualquier operación final
      // Por ejemplo:
      // await AsyncStorage.setItem('onboardingCompleted', 'true');
      // await AsyncStorage.setItem('deviceId', onboardingData.idDispositivo.toString());
      // await AsyncStorage.setItem('userEmail', onboardingData.email);

      // Notificar al componente padre que el onboarding está completo
      onComplete(onboardingData);
    } catch (error) {
      console.error('Error guardando datos del onboarding:', error);
      Alert.alert('Error', 'No se pudieron guardar los datos. Por favor intenta nuevamente.');
    }
  };

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
});