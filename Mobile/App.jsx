import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginScreen } from './login';
import { HomeScreen } from './home';
import { HistoryScreen } from './history';
import { ScheduleScreen } from './schedule';
import { SettingsScreen } from './settings';
import { BottomNavigation } from './nav';
import { OnboardingNavigator } from './onBoardNavigator';

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

  const handleLoginSuccess = (data) => {
    console.log('🎯 Datos recibidos en App:', data);

    // Guardar TODOS los datos del usuario que vienen del backend
    // Incluye: usuario, empleado, rol, permisos, departamento
    setUserData(data);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentScreen('home');
    setUserData(null);
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
        {currentScreen === 'schedule' && <ScheduleScreen darkMode={darkMode} />}
        {currentScreen === 'settings' && (
          <SettingsScreen
            userData={userData}
            email={userData.email}
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