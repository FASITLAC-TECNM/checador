import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ActivityIndicator, View, Alert, AppState, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { LoginScreen } from './components/logins/login';
import { HomeScreen } from './components/homes/home';
import { HistoryScreen } from './components/homes/history';
import { ScheduleScreen } from './components/homes/schedule';
import { SettingsScreen } from './components/settingsPages/settings';
import { BottomNavigation } from './components/homes/nav';
import { NotifyScreen } from './components/homes/NotifyScreen';
import { OnboardingNavigator } from './components/devicesetup/onBoardNavigator';
import { getSolicitudPorToken } from './services/solicitudMovilService';
import { getUsuarioCompleto } from './services/empleadoServices';
import { useNavigationBarColor } from './services/useNavigationBarColor';
import sqliteManager from './services/offline/sqliteManager';
import syncManager from './services/offline/syncManager';

const STORAGE_KEYS = {
  DARK_MODE: '@dark_mode',
  USER_DATA: '@user_data',
  USER_TOKEN: 'userToken',
  SOLICITUD_ID: '@solicitud_id',
  TOKEN_SOLICITUD: '@token_solicitud',
  ONBOARDING_COMPLETED: '@onboarding_completed'
};

const USER_DATA_REFRESH_INTERVAL = 60000;
const DEVICE_VERIFICATION_INTERVAL = 120000;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [userData, setUserData] = useState(null);
  const [deviceRegistered, setDeviceRegistered] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const appState = useRef(AppState.currentState);
  const verificationInterval = useRef(null);
  const userDataRefreshInterval = useRef(null);

  // Configurar barra de navegación de Android según el tema
  useNavigationBarColor(darkMode);

  // Configurar color de fondo del root view nativo según el tema
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(darkMode ? '#111827' : '#f3f4f6');
  }, [darkMode]);

  useEffect(() => {
    checkAppState();

    // Inicializar DB Offline y AutoSync
    const initOffline = async () => {
      try {
        await sqliteManager.initDatabase();
        console.log('✅ Offline DB Initialized');
        syncManager.initAutoSync();
      } catch (e) {
        console.error('❌ Failed to init offline DB', e);
      }
    };
    initOffline();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      clearInterval(verificationInterval.current);
      clearInterval(userDataRefreshInterval.current);
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn && deviceRegistered) {
      startDeviceVerification();
      startUserDataRefresh();
    } else {
      stopDeviceVerification();
      stopUserDataRefresh();
    }

    return () => {
      stopDeviceVerification();
      stopUserDataRefresh();
    };
  }, [isLoggedIn, deviceRegistered]);

  const handleAppStateChange = async (nextAppState) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active' &&
      isLoggedIn &&
      deviceRegistered
    ) {
      await Promise.all([verificarEstadoDispositivo(), refreshUserData()]);
    }
    appState.current = nextAppState;
  };

  const startDeviceVerification = () => {
    verificarEstadoDispositivo();
    verificationInterval.current = setInterval(verificarEstadoDispositivo, DEVICE_VERIFICATION_INTERVAL);
  };

  const stopDeviceVerification = () => {
    if (verificationInterval.current) {
      clearInterval(verificationInterval.current);
      verificationInterval.current = null;
    }
  };

  const startUserDataRefresh = () => {
    refreshUserData();
    userDataRefreshInterval.current = setInterval(refreshUserData, USER_DATA_REFRESH_INTERVAL);
  };

  const stopUserDataRefresh = () => {
    if (userDataRefreshInterval.current) {
      clearInterval(userDataRefreshInterval.current);
      userDataRefreshInterval.current = null;
    }
  };

  const refreshUserData = async () => {
    try {
      const [storedUserData, token] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN)
      ]);

      const currentUserData = JSON.parse(storedUserData);
      const usuarioId = currentUserData.id || currentUserData.usuario_id;

      const response = await getUsuarioCompleto(usuarioId, token);

      if (response.success && response.data) {
        const updatedUserData = {
          ...response.data,
          token: token,
          ...Object.keys(currentUserData).reduce((acc, key) => {
            if (!response.data[key] && currentUserData[key]) {
              acc[key] = currentUserData[key];
            }
            return acc;
          }, {})
        };

        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
        setUserData(updatedUserData);
        syncManager.setAuthToken(token, response.data.empleado_id?.toString()); // Update token + empleadoId for sync
      }
    } catch (error) {
      // Silent error
    }
  };

  const verificarEstadoDispositivo = async () => {
    try {
      // No verificar si estamos offline — confiar en estado local
      const online = await syncManager.isOnline();
      if (!online) return;

      const [solicitudId, tokenSolicitud, onboardingCompleted] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SOLICITUD_ID),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN_SOLICITUD),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
      ]);

      if (onboardingCompleted !== 'true' || !solicitudId || !tokenSolicitud) {
        if (onboardingCompleted === 'true') {
          await handleDeviceInvalidated('No se encontró información del dispositivo registrado');
        }
        return;
      }

      const response = await getSolicitudPorToken(tokenSolicitud);
      const estadoLower = response.estado?.toLowerCase();

      if (estadoLower === 'aceptado') return;

      const mensajes = {
        pendiente: 'Tu dispositivo está pendiente de aprobación nuevamente',
        rechazado: 'Tu dispositivo fue rechazado por el administrador'
      };

      await handleDeviceInvalidated(mensajes[estadoLower] || 'El estado de tu dispositivo ha cambiado');

    } catch (error) {
      if (error.code === 'SOLICITUD_NOT_FOUND' || error.status === 404) {
        await handleDeviceInvalidated('Tu registro de dispositivo fue eliminado');
      }
      // Otros errores de red: silenciar (no invalidar offline)
    }
  };

  const handleDeviceInvalidated = async (mensaje) => {
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    stopDeviceVerification();
    stopUserDataRefresh();
    setDeviceRegistered(false);

    Alert.alert(
      'Registro de Dispositivo Requerido',
      `${mensaje}\n\nDebes registrar nuevamente este dispositivo para continuar.`,
      [{ text: 'Entendido' }],
      { cancelable: false }
    );
  };

  const checkAppState = async () => {
    try {
      const [deviceCompleted, savedDarkMode] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED),
        AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE),
      ]);

      setDeviceRegistered(deviceCompleted === 'true');
      setDarkMode(savedDarkMode === 'true');
      // Siempre mostrar login por seguridad — LoginScreen maneja validación offline
      setIsLoggedIn(false);
      console.log('🔒 [App] Login screen enforced on startup');
    } catch (error) {
      console.error('CheckAppState error:', error);
      setIsLoggedIn(false);
      setDeviceRegistered(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDarkMode = async () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    await AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE, String(newValue));
  };

  const handleLoginSuccess = async (data) => {
    try {
      if (data.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, data.token);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
      setUserData(data);
      if (data.token) {
        const empId = data.empleado_id || data.empleadoInfo?.id || null;
        syncManager.setAuthToken(data.token, empId?.toString());
        // Pull solo datos del empleado logueado
        syncManager.pullData(empId).catch(e => console.log('Initial pull failed:', e.message));
      }

      const deviceCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);

      if (deviceCompleted === 'true') {
        // Verificar si estamos online para validar con el servidor
        const online = await syncManager.isOnline();

        if (!online) {
          // OFFLINE: confiar en el estado local del dispositivo
          console.log('📴 [App] Offline — confiando en estado local del dispositivo (verificado)');
          setDeviceRegistered(true);
        } else {
          // ONLINE: verificar contra el servidor
          const tokenSolicitud = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_SOLICITUD);

          if (tokenSolicitud) {
            try {
              const response = await getSolicitudPorToken(tokenSolicitud);
              const estadoLower = response.estado?.toLowerCase();

              if (estadoLower === 'aceptado') {
                setDeviceRegistered(true);
              } else {
                await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
                setDeviceRegistered(false);
              }
            } catch (error) {
              if (error.code === 'SOLICITUD_NOT_FOUND' || error.status === 404) {
                await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
                setDeviceRegistered(false);
              } else {
                // Error de red u otro — confiar en estado local
                console.log('⚠️ [App] Error verificando solicitud, confiando en estado local');
                setDeviceRegistered(true);
              }
            }
          } else {
            await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
            setDeviceRegistered(false);
          }
        }
      } else {
        setDeviceRegistered(false);
      }

      setIsLoggedIn(true);
    } catch (error) {
      // Silent error
    }
  };

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    setDeviceRegistered(true);
  };

  const handleLogout = async () => {
    stopDeviceVerification();
    stopUserDataRefresh();

    // Guardar sesión de logout antes de limpiar datos
    if (userData) {
      try {
        const isOnline = await syncManager.isOnline();
        await sqliteManager.saveOfflineSession({
          usuario_id: userData.id?.toString(),
          empleado_id: userData.empleado_id?.toString(),
          tipo: 'logout',
          modo: isOnline ? 'online' : 'offline'
        });
        await syncManager.pushSessions().catch(() => { });
      } catch (e) {
        console.log('Error guardando sesión logout:', e);
      }
    }

    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA)
    ]);

    setIsLoggedIn(false);
    setCurrentScreen('home');
    setUserData(null);
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaProvider>
    );
  }

  if (isLoggedIn && !deviceRegistered && userData) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
        <OnboardingNavigator
          onComplete={handleOnboardingComplete}
          userData={userData}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={darkMode ? "#1e40af" : "#2563eb"}
      />
      <SafeAreaView
        style={[styles.safeArea, darkMode && styles.safeAreaDark]}
        edges={['top']}
      >
        <View style={[styles.container, darkMode && styles.containerDark]}>
          {currentScreen === 'home' && <HomeScreen userData={userData} darkMode={darkMode} onOpenAvisos={() => setCurrentScreen('avisos')} />}
          {currentScreen === 'avisos' && <NotifyScreen userData={userData} darkMode={darkMode} onGoBack={() => setCurrentScreen('home')} />}
          {currentScreen === 'history' && <HistoryScreen darkMode={darkMode} userData={userData} />}
          {currentScreen === 'schedule' && <ScheduleScreen userData={userData} darkMode={darkMode} />}
          {currentScreen === 'settings' && (
            <SettingsScreen
              userData={userData}
              email={userData.correo}
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
              onLogout={handleLogout}
            />
          )}

          {currentScreen !== 'avisos' && (
            <BottomNavigation
              currentScreen={currentScreen}
              onScreenChange={setCurrentScreen}
              darkMode={darkMode}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2563eb',
  },
  safeAreaDark: {
    backgroundColor: '#1e40af',
  },
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