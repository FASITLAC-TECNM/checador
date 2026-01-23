import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginScreen } from './components/logins/login';
import { HomeScreen } from './components/homes/home';
import { HistoryScreen } from './components/homes/history';
import { ScheduleScreen } from './components/homes/schedule';
import { SettingsScreen } from './components/homes/settings';
import { BottomNavigation } from './components/homes/nav';
import { OnboardingNavigator } from './components/devicesetup/onBoardNavigator';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [userData, setUserData] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Cuando la base de datos esté lista, descomentar esto
    // checkOnboardingStatus();

    // Por ahora siempre mostramos el onboarding (sin guardar estado)
    setOnboardingCompleted(false);
    setIsLoading(false);
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('onboardingCompleted');
      setOnboardingCompleted(completed === 'true');
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setOnboardingCompleted(false);
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async (onboardingData) => {
    try {
      console.log('Onboarding completado con datos:', onboardingData);

      // Si se saltó el onboarding, simplemente marcarlo como completado
      if (onboardingData.skipped) {
        console.log('⏭️ Onboarding saltado, ir directo a login');
        setOnboardingCompleted(true);
        return;
      }

      // TODO: Aquí conectaremos con la base de datos real
      // Por ahora solo logueamos los datos y marcamos como completado en memoria
      // await AsyncStorage.setItem('onboardingCompleted', 'true');
      // await AsyncStorage.setItem('onboardingData', JSON.stringify(onboardingData));

      // Marcamos como completado solo en esta sesión (se resetea al reiniciar)
      setOnboardingCompleted(true);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const handleLoginSuccess = async (data) => {
    try {
      console.log('🎯 Datos recibidos en App:', data);

      // ✅ CRÍTICO: Guardar el token en AsyncStorage
      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
        console.log('✅ Token guardado en AsyncStorage:', data.token.substring(0, 20) + '...');
      } else {
        console.warn('⚠️ No se recibió token en la respuesta de login');
      }

      // Guardar TODOS los datos del usuario que vienen del backend
      // Incluye: usuario, empleado, rol, permisos, departamento
      setUserData(data);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('❌ Error guardando datos de login:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // Limpiar AsyncStorage
      await AsyncStorage.removeItem('userToken');
      console.log('✅ Token eliminado de AsyncStorage');
      
      // Limpiar estados
      setIsLoggedIn(false);
      setCurrentScreen('home');
      setUserData(null);
    } catch (error) {
      console.error('❌ Error en logout:', error);
    }
  };

  // Mostrar pantalla de carga mientras se verifica el estado del onboarding
  if (isLoading) {
    return null; // O un componente de loading si lo tienes
  }

  // Si no ha completado el onboarding, mostrar el flujo de onboarding
  if (!onboardingCompleted) {
    return (
      <SafeAreaProvider>
        <OnboardingNavigator onComplete={handleOnboardingComplete} />
      </SafeAreaProvider>
    );
  }

  // Si no está logueado, mostrar pantalla de login
  if (!isLoggedIn || !userData) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
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
});