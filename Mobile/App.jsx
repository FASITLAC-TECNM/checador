import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
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
  const [deviceRegistered, setDeviceRegistered] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      // 1. Verificar si hay un token guardado (usuario logueado previamente)
      const token = await AsyncStorage.getItem('userToken');
      
      // 2. Verificar si el dispositivo ya está registrado
      const deviceCompleted = await AsyncStorage.getItem('@onboarding_completed');
      
      console.log('📱 Estado de la app:');
      console.log('- Token existe:', token ? 'Sí ✅' : 'No ❌');
      console.log('- Dispositivo registrado:', deviceCompleted === 'true' ? 'Sí ✅' : 'No ❌');

      if (token && deviceCompleted === 'true') {
        // Usuario tiene token Y dispositivo registrado
        // TODO: Aquí podrías validar el token con el backend
        // Por ahora solo verificamos que existan
        console.log('✅ Usuario autenticado y dispositivo registrado');
        // Necesitarías cargar los datos del usuario del AsyncStorage o del backend
        // Por simplicidad, dejamos que vuelva a hacer login
        setDeviceRegistered(true);
        setIsLoggedIn(false);
      } else if (token && deviceCompleted !== 'true') {
        // Tiene token pero no ha registrado el dispositivo
        console.log('⚠️ Usuario autenticado pero dispositivo no registrado');
        setDeviceRegistered(false);
        setIsLoggedIn(false);
      } else {
        // No hay token, debe hacer login
        console.log('❌ Usuario no autenticado');
        setDeviceRegistered(false);
        setIsLoggedIn(false);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error verificando estado de la app:', error);
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (data) => {
    try {
      console.log('🎯 Login exitoso, datos recibidos:', {
        nombre: data.nombre,
        correo: data.correo,
        es_empleado: data.es_empleado,
        empleado_id: data.empleado_id,
        token: data.token ? 'Sí ✅' : 'No ❌'
      });

      // Guardar el token
      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
        console.log('✅ Token guardado');
      }

      // Guardar datos del usuario
      setUserData(data);

      // Verificar si el dispositivo ya está registrado
      const deviceCompleted = await AsyncStorage.getItem('@onboarding_completed');
      
      if (deviceCompleted === 'true') {
        // Ya completó el onboarding antes, ir directo al home
        console.log('✅ Dispositivo ya registrado, ir a Home');
        setDeviceRegistered(true);
        setIsLoggedIn(true);
      } else {
        // Primera vez con este dispositivo, mostrar onboarding
        console.log('⚠️ Primera vez en este dispositivo, mostrar onboarding');
        setDeviceRegistered(false);
        setIsLoggedIn(true); // Está logueado pero necesita onboarding
      }
    } catch (error) {
      console.error('❌ Error en handleLoginSuccess:', error);
    }
  };

  const handleOnboardingComplete = async (onboardingData) => {
    try {
      console.log('✅ Onboarding completado:', {
        email: onboardingData.email,
        empresaId: onboardingData.empresaId,
        deviceId: onboardingData.idDispositivo
      });

      // Marcar que el dispositivo ya fue registrado
      await AsyncStorage.setItem('@onboarding_completed', 'true');
      
      // Ir a la pantalla principal
      setDeviceRegistered(true);
    } catch (error) {
      console.error('❌ Error completando onboarding:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // Limpiar token y datos de sesión
      await AsyncStorage.removeItem('userToken');
      console.log('✅ Token eliminado');
      
      // NO limpiar el onboarding, el dispositivo sigue registrado
      // Solo limpia la sesión del usuario
      
      setIsLoggedIn(false);
      setCurrentScreen('home');
      setUserData(null);
    } catch (error) {
      console.error('❌ Error en logout:', error);
    }
  };

  // Pantalla de carga inicial
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={appStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaProvider>
    );
  }

  // FLUJO 1: Usuario NO ha iniciado sesión → LOGIN
  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaProvider>
    );
  }

  // FLUJO 2: Usuario logueado pero dispositivo NO registrado → ONBOARDING
  if (isLoggedIn && !deviceRegistered && userData) {
    return (
      <SafeAreaProvider>
        <OnboardingNavigator 
          onComplete={handleOnboardingComplete}
          userData={userData} // Pasamos los datos del usuario al onboarding
        />
      </SafeAreaProvider>
    );
  }

  // FLUJO 3: Usuario logueado Y dispositivo registrado → HOME
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