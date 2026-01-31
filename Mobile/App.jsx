import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ActivityIndicator, View, Alert, AppState } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginScreen } from './components/logins/login';
import { HomeScreen } from './components/homes/home';
import { HistoryScreen } from './components/homes/history';
import { ScheduleScreen } from './components/homes/schedule';
import { SettingsScreen } from './components/settingsPages/settings';
import { BottomNavigation } from './components/homes/nav';
import { OnboardingNavigator } from './components/devicesetup/onBoardNavigator';
import { verificarDispositivoActivo, getSolicitudPorToken } from './services/solicitudMovilService';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [userData, setUserData] = useState(null);
  const [deviceRegistered, setDeviceRegistered] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const appState = useRef(AppState.currentState);
  const verificationInterval = useRef(null);

  useEffect(() => {
    checkAppState();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      if (verificationInterval.current) {
        clearInterval(verificationInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn && deviceRegistered) {
      startDeviceVerification();
    } else {
      stopDeviceVerification();
    }
    
    return () => {
      stopDeviceVerification();
    };
  }, [isLoggedIn, deviceRegistered]);

  const handleAppStateChange = async (nextAppState) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active' &&
      isLoggedIn &&
      deviceRegistered
    ) {
      await verificarEstadoDispositivo();
    }
    appState.current = nextAppState;
  };

  const startDeviceVerification = () => {
    verificarEstadoDispositivo();
    
    verificationInterval.current = setInterval(() => {
      verificarEstadoDispositivo();
    }, 120000);
  };

  const stopDeviceVerification = () => {
    if (verificationInterval.current) {
      clearInterval(verificationInterval.current);
      verificationInterval.current = null;
    }
  };

  const verificarEstadoDispositivo = async () => {
    try {
      const [solicitudId, tokenSolicitud, onboardingCompleted] = await Promise.all([
        AsyncStorage.getItem('@solicitud_id'),
        AsyncStorage.getItem('@token_solicitud'),
        AsyncStorage.getItem('@onboarding_completed')
      ]);

      if (onboardingCompleted !== 'true') {
        return;
      }

      if (!solicitudId || !tokenSolicitud) {
        await handleDeviceInvalidated('No se encontró información del dispositivo registrado');
        return;
      }

      const response = await getSolicitudPorToken(tokenSolicitud);
      const estadoLower = response.estado?.toLowerCase();

      if (estadoLower === 'aceptado') {
        return;
      } else if (estadoLower === 'pendiente') {
        await handleDeviceInvalidated('Tu dispositivo está pendiente de aprobación nuevamente');
      } else if (estadoLower === 'rechazado') {
        await handleDeviceInvalidated('Tu dispositivo fue rechazado por el administrador');
      } else {
        await handleDeviceInvalidated('El estado de tu dispositivo ha cambiado');
      }

    } catch (error) {
      if (error.code === 'SOLICITUD_NOT_FOUND' || error.status === 404) {
        await handleDeviceInvalidated('Tu registro de dispositivo fue eliminado');
        return;
      }
    }
  };

  const handleDeviceInvalidated = async (mensaje) => {
    try {
      await AsyncStorage.removeItem('@onboarding_completed');
      stopDeviceVerification();
      setDeviceRegistered(false);
      
      Alert.alert(
        'Registro de Dispositivo Requerido',
        mensaje + '\n\nDebes registrar nuevamente este dispositivo para continuar.',
        [{ text: 'Entendido' }],
        { cancelable: false }
      );
      
    } catch (error) {
      console.error('Error manejando invalidación del dispositivo:', error);
    }
  };

  const checkAppState = async () => {
    try {
      const deviceCompleted = await AsyncStorage.getItem('@onboarding_completed');
      
      setIsLoggedIn(false);
      setDeviceRegistered(deviceCompleted === 'true');
      setIsLoading(false);

    } catch (error) {
      console.error('Error verificando estado de la app:', error);
      setIsLoggedIn(false);
      setDeviceRegistered(false);
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (data) => {
    try {
      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
      }

      await AsyncStorage.setItem('@user_data', JSON.stringify(data));
      setUserData(data);

      const deviceCompleted = await AsyncStorage.getItem('@onboarding_completed');
      
      if (deviceCompleted === 'true') {
        const tokenSolicitud = await AsyncStorage.getItem('@token_solicitud');
        
        if (tokenSolicitud) {
          try {
            const response = await getSolicitudPorToken(tokenSolicitud);
            const estadoLower = response.estado?.toLowerCase();
            
            if (estadoLower === 'aceptado') {
              setDeviceRegistered(true);
              setIsLoggedIn(true);
            } else {
              await AsyncStorage.removeItem('@onboarding_completed');
              setDeviceRegistered(false);
              setIsLoggedIn(true);
            }
          } catch (error) {
            if (error.code === 'SOLICITUD_NOT_FOUND' || error.status === 404) {
              await AsyncStorage.removeItem('@onboarding_completed');
            }
            setDeviceRegistered(false);
            setIsLoggedIn(true);
          }
        } else {
          await AsyncStorage.removeItem('@onboarding_completed');
          setDeviceRegistered(false);
          setIsLoggedIn(true);
        }
      } else {
        setDeviceRegistered(false);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Error en handleLoginSuccess:', error);
    }
  };

  const handleOnboardingComplete = async (onboardingData) => {
    try {
      await AsyncStorage.setItem('@onboarding_completed', 'true');
      setDeviceRegistered(true);
    } catch (error) {
      console.error('Error completando onboarding:', error);
    }
  };

  const handleLogout = async () => {
    try {
      stopDeviceVerification();
      
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('@user_data');
      
      setIsLoggedIn(false);
      setCurrentScreen('home');
      setUserData(null);
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={appStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaProvider>
    );
  }

  if (isLoggedIn && !deviceRegistered && userData) {
    return (
      <SafeAreaProvider>
        <OnboardingNavigator 
          onComplete={handleOnboardingComplete}
          userData={userData}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[appStyles.container, darkMode && appStyles.containerDark]}
        edges={['top']}
      >
        {currentScreen === 'home' && <HomeScreen userData={userData} darkMode={darkMode} />}
        {currentScreen === 'history' && <HistoryScreen darkMode={darkMode} />}
        {currentScreen === 'schedule' && <ScheduleScreen userData={userData} darkMode={darkMode} />}
        {currentScreen === 'settings' && (
          <SettingsScreen
            userData={userData}
            email={userData.correo}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            onLogout={handleLogout}
          />
        )}

        <BottomNavigation
          currentScreen={currentScreen}
          onScreenChange={setCurrentScreen}
          darkMode={darkMode}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const appStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
});