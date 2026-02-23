import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ActivityIndicator, View, Alert, AppState, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { LoginScreen } from './components/logins/login';
import SplashScreen from './components/ui/SplashScreen';
import MaintenanceScreen from './components/ui/MaintenanceScreen';
import DeviceDisabledScreen from './components/ui/DeviceDisabledScreen';
import { getMaintenanceStatus } from './services/configurationService';
import { HomeScreen } from './components/homes/home';
import { HistoryScreen } from './components/homes/history';
import { ScheduleScreen } from './components/homes/schedule';
import { SettingsScreen } from './components/settingsPages/settings';
import { BottomNavigation } from './components/homes/nav';
import { NotifyScreen } from './components/homes/NotifyScreen';
import { OnboardingNavigator } from './components/devicesetup/onBoardNavigator';
import { getSolicitudPorToken, verificarDispositivoPorEmpleado } from './services/solicitudMovilService';
import { getUsuarioCompleto } from './services/empleadoServices';
import { useNavigationBarColor } from './services/useNavigationBarColor';
import sqliteManager from './services/offline/sqliteManager.mjs';
import syncManager from './services/offline/syncManager.mjs';
import { initNotifications } from './services/localNotificationService';

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
  const [userData, setUserData] = useState(null);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isOfflineSession, setIsOfflineSession] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [deviceDisabled, setDeviceDisabled] = useState(false);

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
        await initNotifications();
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
        syncManager.setAuthToken(token, response.data.empleado_id?.toString());
      }
    } catch (error) {
      // Silent error
    }
  };

  const verificarEstadoDispositivo = async () => {
    console.log('🔍 [App] verificandoEstadoDispositivo INICIO');
    try {
      const online = await syncManager.isOnline();
      console.log('🔍 [App] isOnline:', online);

      if (!online) {
        console.log('🔍 [App] Offline -> Saltando verificación de servidor');
        return;
      }

      const [solicitudId, tokenSolicitud, onboardingCompleted] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SOLICITUD_ID),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN_SOLICITUD),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
      ]);

      console.log('🔍 [App] Datos Storage:', { solicitudId, tokenSolicitud, onboardingCompleted });

      if (onboardingCompleted !== 'true') {
        console.log('🔍 [App] Onboarding no completado.');
        return;
      }

      if (!solicitudId || !tokenSolicitud) {
        console.log('🔍 [App] IDs de solicitud faltantes, saltando verificación de servidor');
        return;
      }

      console.log('🔍 [App] Consultando getSolicitudPorToken...');
      const response = await getSolicitudPorToken(tokenSolicitud);
      console.log('🔍 [App] Respuesta Servidor:', JSON.stringify(response));

      const estadoLower = response.estado?.toLowerCase();

      if (estadoLower === 'aceptado') {
        console.log('🔍 [App] Estado es ACEPTADO. Todo bien.');
        return;
      }

      const mensajes = {
        pendiente: 'Tu dispositivo está pendiente de aprobación nuevamente',
        rechazado: 'Tu dispositivo fue rechazado por el administrador'
      };

      // Estado rechazado/pendiente: volver al onboarding (sin pantalla disabled)
      await handleDeviceInvalidated(mensajes[estadoLower] || 'El estado de tu dispositivo ha cambiado', false);

    } catch (error) {
      if (error.code === 'SOLICITUD_NOT_FOUND' || error.status === 404) {
        await handleDeviceInvalidated('Tu registro de dispositivo fue eliminado', false);
      }
    }
  };

  const handleDeviceInvalidated = async (mensaje, isDisabled = false) => {
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    stopDeviceVerification();
    stopUserDataRefresh();
    setDeviceRegistered(false);

    if (isDisabled) {
      // Dispositivo desactivado por admin -> pantalla dedicada
      setDeviceDisabled(true);
    } else {
      // Solicitud rechazada/eliminada -> volver al onboarding con alerta
      setDeviceDisabled(false);
      Alert.alert(
        'Registro de Dispositivo Requerido',
        `${mensaje}\n\nDebes registrar nuevamente este dispositivo para continuar.`,
        [{ text: 'Entendido' }],
        { cancelable: false }
      );
    }
  };

  const handleReRequest = async () => {
    // El usuario quiere re-solicitar acceso desde DeviceDisabledScreen.
    // Limpiamos el estado disabled y los tokens viejos, enviando al onboarding.
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.SOLICITUD_ID),
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN_SOLICITUD),
      AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED),
    ]);
    setDeviceDisabled(false);
    setDeviceRegistered(false);
    // isLoggedIn ya es true -> OnboardingNavigator se mostrará
  };

  const checkAppState = async () => {
    try {
      // Verificar mantenimiento solo si hay conexión
      const online = await syncManager.isOnline();
      if (online) {
        try {
          const { maintenance } = await getMaintenanceStatus();
          if (maintenance) {
            console.log('🔧 [App] Modo mantenimiento activo');
            setIsMaintenance(true);
          }
        } catch (e) {
          console.warn('[App] No se pudo verificar estado de mantenimiento');
        }
      }

      const [deviceCompleted, savedDarkMode, storedUserData, storedToken] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED),
        AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE),
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN),
      ]);

      setDarkMode(savedDarkMode === 'true');
      setIsLoggedIn(false);
      setCurrentScreen('home');
      console.log('🔒 [App] Login screen enforced on startup');

      // Si el onboarding estaba marcado como completado, verificar contra el servidor
      // para detectar si el admin eliminó / desactivó el dispositivo mientras la app estaba cerrada
      if (deviceCompleted === 'true' && online && storedUserData && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUserData);
          const empleadoId = parsedUser.empleado_id || parsedUser.empleadoInfo?.id;

          if (empleadoId) {
            console.log('🔍 [App] Verificando estado del dispositivo en servidor al arrancar...');
            const dispositivoEnBD = await verificarDispositivoPorEmpleado(empleadoId, storedToken);

            if (dispositivoEnBD.existe && dispositivoEnBD.activo) {
              console.log('✅ [App] Dispositivo activo en servidor. Onboarding OK.');
              setDeviceRegistered(true);
            } else if (dispositivoEnBD.existe && !dispositivoEnBD.activo) {
              console.warn('⛔ [App] Dispositivo DESACTIVADO en servidor. Limpiando onboarding.');
              await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
              setDeviceRegistered(false);
              // deviceDisabled se mostrará solo si el usuario inicia sesión
            } else {
              console.warn('ℹ️ [App] Dispositivo no encontrado en servidor. Limpiando onboarding.');
              await AsyncStorage.multiRemove([
                STORAGE_KEYS.ONBOARDING_COMPLETED,
                STORAGE_KEYS.SOLICITUD_ID,
                STORAGE_KEYS.TOKEN_SOLICITUD,
              ]);
              setDeviceRegistered(false);
            }
          } else {
            // Admin / usuario sin empleado_id: no requiere dispositivo
            setDeviceRegistered(true);
          }
        } catch (verifyError) {
          // Error de red al verificar: confiar en el estado local para no bloquear al usuario
          console.warn('⚠️ [App] No se pudo verificar dispositivo al arrancar, usando estado local:', verifyError.message);
          setDeviceRegistered(deviceCompleted === 'true');
        }
      } else {
        // Sin conexión o sin datos locales: confiar en AsyncStorage
        setDeviceRegistered(deviceCompleted === 'true');
      }

    } catch (error) {
      console.error('CheckAppState error:', error);
      setIsLoggedIn(false);
      setDeviceRegistered(false);
    } finally {
      // Mantener splash screen al menos 2.5 segundos para que se vea la animación
      setTimeout(() => {
        setIsLoading(false);
      }, 2500);
    }
  };

  const handleToggleDarkMode = async () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    await AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE, String(newValue));
  };

  // 🔥 FUNCIÓN CORREGIDA: Verificación Estricta en Nube
  const handleLoginSuccess = async (data, isOffline = false) => {
    try {
      setIsOfflineSession(isOffline); // Guardar estado de sesión

      if (data.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, data.token);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
      setUserData(data);

      // Robust extraction of Empleado ID
      const empleadoId = data.empleado_id || data.empleadoInfo?.id || (data.es_empleado ? data.id : null);

      if (data.token) {
        syncManager.setAuthToken(data.token, empleadoId?.toString());
        syncManager.pullData(empleadoId).catch(e => console.log('Initial pull failed:', e.message));
      }

      // Si no es empleado (admin/rh), no requiere dispositivo
      if (!empleadoId) {
        console.log('⚠️ [App] Usuario no es empleado, no requiere dispositivo');
        setDeviceRegistered(true);
        setIsLoggedIn(true);
        return;
      }

      // Determinar si estamos online para verificación
      // Si el login fue offline, asumimos offline. Si fue online, verificamos estado actual red.
      const currentlyOnline = await syncManager.isOnline();
      const treatAsOnline = !isOffline && currentlyOnline;

      console.log(`🔍 [App] Login Mode: ${isOffline ? 'OFFLINE' : 'ONLINE'}, Net: ${currentlyOnline}`);

      if (treatAsOnline && data.token) {
        try {
          console.log('🔍 [App] ☁️ ONLINE: Verificando dispositivo estrictamente en servidor...');
          const dispositivoEnBD = await verificarDispositivoPorEmpleado(empleadoId, data.token);

          // CASO 1: Dispositivo existe y está ACTIVO -> PERMITIR
          if (dispositivoEnBD.existe && dispositivoEnBD.activo) {
            console.log('✅ [App] Dispositivo verificado en nube y ACTIVO');

            // Restaurar/Actualizar datos locales silenciosamente
            if (dispositivoEnBD.token) {
              await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_SOLICITUD, dispositivoEnBD.token);
            }
            if (dispositivoEnBD.solicitud_id) {
              await AsyncStorage.setItem(STORAGE_KEYS.SOLICITUD_ID, dispositivoEnBD.solicitud_id.toString());
            }
            await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');

            setDeviceRegistered(true);
            setIsLoggedIn(true);
            return;
          }

          // CASO 2: Dispositivo existe pero INACTIVO -> Mostrar DeviceDisabledScreen
          else if (dispositivoEnBD.existe && !dispositivoEnBD.activo) {
            console.warn('⛔ [App] Dispositivo INACTIVO en nube. Mostrando DeviceDisabledScreen.');
            await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
            setDeviceDisabled(true);
            setDeviceRegistered(false);
            setIsLoggedIn(true);
            return;
          }

          // CASO 3: No existe dispositivo en nube → registro nuevo / primera afiliación
          else {
            console.warn('ℹ️ [App] No se encontró dispositivo registrado. Primera afiliación.');
            await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
            await AsyncStorage.removeItem(STORAGE_KEYS.SOLICITUD_ID);
            await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN_SOLICITUD);
            setDeviceRegistered(false);
            setDeviceDisabled(false);
            setIsLoggedIn(true);
            return;
          }

        } catch (error) {
          console.error('❌ [App] Error verificando en nube:', error);

          // CRÍTICO: Si falla por error de RED (no 404/403 real), ¿permitimos fallback?
          // La regla es "Enforcing Cloud-Only Device Verification When Online".
          // Si el login fue online, deberíamos poder verificar.
          // Si falló con 500 o timeout, es arriesgado dejar pasar.
          // Pero si se acaba de ir la red, quizás fallback.

          // Decisión: Si el error NO es de red clarísimo, bloqueamos o pedimos reintentar.
          // Por simplicidad y seguridad: Si falló la verificación cloud en un login online, 
          // NO confiamos en la base local (podría estar desactualizada "activo").
          // Excepción: Si el error es 404 (Endpoint no encontrado?), asumimos sin dispositivo.

          // Si es error de conexión, el usuario ya entró. Podríamos dejarlo pasar PERO
          // mostrando alerta.
          // Para "Enforcing", mostramos error y no dejamos pasar si no estamos seguros.

          Alert.alert(
            'Error de Verificación',
            'No se pudo verificar el estado del dispositivo en el servidor. Intenta nuevamente.',
            [{ text: 'Reintentar', onPress: () => handleLogout() }],
            { cancelable: false }
          );
          return;
        }
      }

      // ==============================================================================
      // FALLBACK SOLO SI REALMENTE ESTAMOS OFFLINE (Login Offline)
      // ==============================================================================

      console.log('📴 [App] Modo OFFLINE detectado. Usando validación local.');
      const deviceCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);

      if (deviceCompleted === 'true') {
        setDeviceRegistered(true);
      } else {
        setDeviceRegistered(false);
      }

      setCurrentScreen('home');
      setIsLoggedIn(true);

    } catch (error) {
      console.error('[App] Error FATAL en handleLoginSuccess:', error);
      // En caso de error de código, para no dejar al usuario en el limbo, 
      // cerramos sesión.
      Alert.alert(
        'Error',
        'Ocurrió un problema al iniciar sesión. Intenta nuevamente.',
        [{ text: 'OK', onPress: () => handleLogout() }]
      );
    }
  };

  /**
   * SEGURIDAD: Auto-Logout si se pierde la conexión a internet.
   * El usuario deberá volver a loguearse (puede ser offline) para continuar.
   * EXCEPCIÓN: Si la sesión es OFFLINE desde el inicio, no sacamos al usuario.
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // Si está logueado, NO es sesión offline, y se pierde internet -> Logout
      if (isLoggedIn && !isOfflineSession && state.isConnected === false) {
        console.log('⚠️ [App] Conexión perdida en sesión ONLINE. Cerrando sesión por seguridad...');
        handleLogout();
      }
    });
    return () => unsubscribe();
  }, [isLoggedIn, isOfflineSession]);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    setDeviceRegistered(true);
  };

  const handleLogout = async () => {
    stopDeviceVerification();
    stopUserDataRefresh();

    if (userData) {
      // Ya no guardamos sesión de logout en SQLite ni intentamos sync.
      // El usuario solo quiere limpiar estado local.
      console.log('🚪 [App] Cerrando sesión (sin registrar evento logout)');
    }

    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
    ]);

    setIsLoggedIn(false);
    setCurrentScreen('home');
    setUserData(null);
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  if (isMaintenance) {
    return (
      <SafeAreaProvider>
        <MaintenanceScreen
          darkMode={darkMode}
          onRetry={async () => {
            try {
              const online = await syncManager.isOnline();
              if (!online) return;
              const { maintenance } = await getMaintenanceStatus();
              if (!maintenance) {
                setIsMaintenance(false);
              }
            } catch (e) {
              // Silenciar error
            }
          }}
        />
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

  const handleDeviceReEnabled = async () => {
    // El admin volvió a habilitar el nodo. Restauramos el estado.
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    setDeviceDisabled(false);
    setDeviceRegistered(true);
    // startDeviceVerification se dispara automáticamente por el useEffect en isLoggedIn+deviceRegistered
  };

  if (isLoggedIn && deviceDisabled) {
    return (
      <SafeAreaProvider>
        <DeviceDisabledScreen
          darkMode={darkMode}
          onReRequest={handleReRequest}
          onReEnabled={handleDeviceReEnabled}
        />
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