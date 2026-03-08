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
import { AdminScreen } from './components/admin/AdminScreen';
import { NotifyScreen } from './components/homes/NotifyScreen';
import { OnboardingNavigator } from './components/devicesetup/onBoardNavigator';
import { getSolicitudPorToken, verificarDispositivoPorEmpleado } from './services/solicitudMovilService';
import { getUsuarioCompleto } from './services/empleadoServices';
import { useNavigationBarColor } from './services/useNavigationBarColor';
import sqliteManager from './services/offline/sqliteManager.mjs';
import syncManager from './services/offline/syncManager.mjs';
import {
  initNotifications,
  notificarEstadoAsistencia,
  notificarRegistro,
  detectarCambiosIncidencias,
  detectarAvisosNuevos
} from './services/localNotificationService';
import { scheduleAttendanceNotifications } from './services/backgroundNotificationService';
import { getApiEndpoint } from './config/api';

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
const NOTIF_POLL_INTERVAL = 60000;      // cada 60s revó estados para notificar
const NOTIF_DIARIA_KEY = '@notif_asistencia_disponible';
const API_URL_BASE = getApiEndpoint('/api');

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
  const notifPollInterval = useRef(null);
  const notifDiariaRef = useRef({ fecha: '', entrada: false, salida: false });

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
      startNotifPoll();
    } else {
      stopDeviceVerification();
      stopUserDataRefresh();
      stopNotifPoll();
    }

    return () => {
      stopDeviceVerification();
      stopUserDataRefresh();
      stopNotifPoll();
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

  // ────────────────────────────────────────────────────────────────────────────
  //  N O T I F I C A C I O N E S   C E N T R A L I Z A D A S
  // ────────────────────────────────────────────────────────────────────────────

  const startNotifPoll = () => {
    notifPoll();  // Inmediato al login
    notifPollInterval.current = setInterval(notifPoll, NOTIF_POLL_INTERVAL);
  };

  const stopNotifPoll = () => {
    if (notifPollInterval.current) {
      clearInterval(notifPollInterval.current);
      notifPollInterval.current = null;
    }
  };

  const notifPoll = async () => {
    try {
      const [storedUserData, token] = await Promise.all([
        AsyncStorage.getItem('@user_data'),
        AsyncStorage.getItem('userToken'),
      ]);
      if (!storedUserData || !token) return;
      const user = JSON.parse(storedUserData);
      const empleadoId = user.empleado_id;
      if (!empleadoId) return;

      const online = await syncManager.isOnline();
      const hoy = new Date().toISOString().split('T')[0];

      // ── Restaurar guard diario desde AsyncStorage ────────────────────────
      const guardRaw = await AsyncStorage.getItem(NOTIF_DIARIA_KEY).catch(() => null);
      const guard = guardRaw ? JSON.parse(guardRaw) : { fecha: '', entrada: false, salida: false };
      if (guard.fecha !== hoy) {
        // Nuevo día → resetear guard
        notifDiariaRef.current = { fecha: hoy, entrada: false, salida: false };
        await AsyncStorage.setItem(NOTIF_DIARIA_KEY, JSON.stringify(notifDiariaRef.current)).catch(() => { });
      } else {
        notifDiariaRef.current = guard;
      }

      // ── ESTADO DE ASISTENCIA (notif "listo para registrar entrada/salida") ──
      if (online) {
        try {
          const preflightRes = await fetch(
            `${API_URL_BASE}/asistencias/movil/estado-boton/${empleadoId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (preflightRes.ok) {
            const pf = await preflightRes.json();
            if (pf.success && pf.habilitado) {
              const tipo = pf.tipo; // 'entrada' | 'salida'
              if (tipo === 'entrada' && !notifDiariaRef.current.entrada) {
                notifDiariaRef.current = { ...notifDiariaRef.current, entrada: true };
                await AsyncStorage.setItem(NOTIF_DIARIA_KEY, JSON.stringify(notifDiariaRef.current)).catch(() => { });
                await notificarEstadoAsistencia('entrada');
              } else if (tipo === 'salida' && !notifDiariaRef.current.salida) {
                notifDiariaRef.current = { ...notifDiariaRef.current, salida: true };
                await AsyncStorage.setItem(NOTIF_DIARIA_KEY, JSON.stringify(notifDiariaRef.current)).catch(() => { });
                await notificarEstadoAsistencia('salida');
              }
            }
          }
        } catch (_) { /* red inestable, no crítico */ }

        // ── INCIDENCIAS (detectar cambios de estado) ────────────────────────
        try {
          const incRes = await fetch(
            `${API_URL_BASE}/incidencias?empleado_id=${empleadoId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (incRes.ok) {
            const incData = await incRes.json();
            await detectarCambiosIncidencias(incData.data || []);
          }
        } catch (_) { }

        // ── AVISOS (detectar nuevos) ───────────────────────────────────
        // BUGFIX: Solo notificar avisos globales + avisos personales del empleado actual.
        // Antes se consultaba /api/avisos (todos los avisos de la empresa) lo que causaba
        // notificaciones incorrectas cuando un aviso personal era enviado a otro empleado.
        try {
          const avisosParaNotificar = [];

          // 1. Avisos globales (para todos)
          const globalesRes = await fetch(
            `${API_URL_BASE}/avisos/globales`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (globalesRes.ok) {
            const globalesData = await globalesRes.json();
            if (globalesData.success && globalesData.data) {
              avisosParaNotificar.push(...globalesData.data);
            }
          }

          // 2. Avisos personales del empleado actual (solo los que son para mí)
          const personalesRes = await fetch(
            `${API_URL_BASE}/empleados/${empleadoId}/avisos`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (personalesRes.ok) {
            const personalesData = await personalesRes.json();
            if (personalesData.success && personalesData.data) {
              avisosParaNotificar.push(...personalesData.data);
            }
          }

          await detectarAvisosNuevos(avisosParaNotificar);
        } catch (_) { }

        // ── NOTIFICACIONES DE FONDO (horario del día) ───────────────────
        try {
          const horRes = await fetch(
            `${API_URL_BASE}/empleados/${empleadoId}/horario`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (horRes.ok) {
            const horData = await horRes.json();
            const horario = horData.data || horData.horario || horData;
            if (horario?.configuracion) {
              let cfg = typeof horario.configuracion === 'string'
                ? JSON.parse(horario.configuracion)
                : horario.configuracion;
              const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
              const diaHoy = dias[new Date().getDay()];
              const key = Object.keys(cfg.configuracion_semanal || {}).find(k => k.toLowerCase() === diaHoy);
              const turnos = key ? cfg.configuracion_semanal[key].map(t => ({
                entrada: t.inicio || t.entrada,
                salida: t.fin || t.salida
              })) : [];
              if (turnos.length > 0) {
                await scheduleAttendanceNotifications(empleadoId, {}, { turnos });
              }
            }
          }
        } catch (_) { }
      }
    } catch (e) {
      // Silencioso — no crítico
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
        console.log('🔍 [App] Offline -> Saltando verificación periódica de servidor');
        return;
      }

      const [storedUserData, storedToken, onboardingCompleted] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
      ]);

      if (onboardingCompleted !== 'true') {
        console.log('🔍 [App] Onboarding no completado.');
        return;
      }

      if (!storedUserData || !storedToken) {
        console.log('🔍 [App] Faltan datos de sesión para verificar estado del servidor');
        return;
      }

      const parsedUser = JSON.parse(storedUserData);
      const empleadoId = parsedUser.empleado_id || parsedUser.empleadoInfo?.id || (parsedUser.es_empleado ? parsedUser.id : null);

      if (!empleadoId) {
        // Administradores y RRHH no requieren validación estricta de dispositivo
        return;
      }

      console.log('🔍 [App] Verificando dispositivo periódicamente por empleado en servidor...');
      const dispositivoEnBD = await verificarDispositivoPorEmpleado(empleadoId, storedToken);

      if (dispositivoEnBD.existe && dispositivoEnBD.activo) {
        console.log('✅ [App] Dispositivo verificado periódicamente en nube: ACTIVO');
        return;
      } else if (dispositivoEnBD.existe && !dispositivoEnBD.activo) {
        console.warn('⛔ [App] Dispositivo periódico: INACTIVO en nube.');
        await handleDeviceInvalidated('Tu dispositivo fue desactivado por el administrador', true);
      } else {
        console.warn('ℹ️ [App] Dispositivo periódico: No encontrado en nube.');
        await handleDeviceInvalidated('Tu registro de dispositivo fue eliminado del servidor', false);
      }

    } catch (error) {
      console.error('❌ [App] Error consultando estado periódico del servidor:', error);
      // No bloqueamos (logout) en errores de red periódicos. 
      // El dispositivo queda invalidado UNICAMENTE cuando la base de datos confirma que ya no es válido.
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
          onLogout={handleLogout}
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
          {currentScreen === 'admin' && userData?.esAdmin && <AdminScreen userData={userData} darkMode={darkMode} />}
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
              userData={userData}
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