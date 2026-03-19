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
} from
  './services/localNotificationService';
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
const DEVICE_VERIFICATION_INTERVAL = 15000;
const NOTIF_POLL_INTERVAL = 60000;
const NOTIF_DIARIA_KEY = '@notif_asistencia_disponible';
const API_URL_BASE = getApiEndpoint('/api');
const HEALTH_CONSECUTIVE_FAILURES_THRESHOLD = 2; // how many fails in a row before going offline

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
  const maintenanceInterval = useRef(null);
  const healthCheckInterval = useRef(null);
  const healthFailCount = useRef(0);
  const notifDiariaRef = useRef({ fecha: '', entrada: false, salida: false });
  const offlineDebounceTimer = useRef(null);


  useNavigationBarColor(darkMode);


  useEffect(() => {
    SystemUI.setBackgroundColorAsync(darkMode ? '#111827' : '#f3f4f6');
  }, [darkMode]);

  useEffect(() => {
    checkAppState();


    const initOffline = async () => {
      try {
        await sqliteManager.initDatabase();
        (function () { })('✅ Offline DB Initialized');
        syncManager.initAutoSync();
        await initNotifications();
      } catch (e) {
        (function () { })('❌ Failed to init offline DB', e);
      }
    };
    initOffline();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    maintenanceInterval.current = setInterval(async () => {
      try {
        if (await syncManager.isOnline()) {
          const { maintenance } = await getMaintenanceStatus();
          setIsMaintenance(maintenance);
        }
      } catch (e) { }
    }, 20000);

    // Health check liviano: solo informa a syncManager, nunca fuerza offline al usuario
    healthCheckInterval.current = setInterval(async () => {
      try {
        const netState = await syncManager.isOnline();
        if (!netState) {
          // Sin red → no tiene sentido pinchar el backend
          healthFailCount.current = 0;
          syncManager.markBackendUp();
          return;
        }

        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 5000);
        let ok = false;
        try {
          const res = await fetch(`${API_URL_BASE}/health`, {
            method: 'GET',
            signal: controller.signal
          });
          ok = res.ok || res.status < 500; // 4xx = backend responde aunque sea con error de auth
        } catch (_) {
          ok = false;
        } finally {
          clearTimeout(tid);
        }

        if (ok) {
          healthFailCount.current = 0;
          syncManager.markBackendUp();
        } else {
          healthFailCount.current += 1;
          if (healthFailCount.current >= HEALTH_CONSECUTIVE_FAILURES_THRESHOLD) {
            syncManager.markBackendDown();
          }
        }
      } catch (_) {
        // Error inesperado → no hacer nada, no penalizar
      }
    }, 20000);

    return () => {
      subscription?.remove();
      clearInterval(verificationInterval.current);
      clearInterval(userDataRefreshInterval.current);
      clearInterval(maintenanceInterval.current);
      clearInterval(healthCheckInterval.current);
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
      deviceRegistered) {
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





  const startNotifPoll = () => {
    // NO ejecutar inmediatamente al login — esperar 2 minutos para evitar
    // notificaciones falsas justo al arrancar cuando todavia no es hora
    notifPollInterval.current = setInterval(notifPoll, NOTIF_POLL_INTERVAL);
  };

  const stopNotifPoll = () => {
    if (notifPollInterval.current) {
      clearInterval(notifPollInterval.current);
      notifPollInterval.current = null;
    }
  };

  // Verifica si la hora actual cae dentro de la ventana permitida para notificar
  // Solo notifica en un rango de [-15 min, +30 min] respecto a la hora del horario
  const estaEnVentanaTiempo = async (empleadoId, tipo) => {
    try {
      const horarioLocal = await sqliteManager.getHorario(empleadoId);
      if (!horarioLocal?.configuracion) return true; // Sin horario, permitir

      let config = typeof horarioLocal.configuracion === 'string'
        ? JSON.parse(horarioLocal.configuracion)
        : horarioLocal.configuracion;

      const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const diaHoy = dias[new Date().getDay()];
      const keyHoy = Object.keys(config.configuracion_semanal || {}).find(
        k => k.toLowerCase() === diaHoy
      );
      if (!keyHoy) return false; // No trabaja hoy

      const turnos = (config.configuracion_semanal[keyHoy] || []).map(t => ({
        entrada: t.inicio || t.entrada,
        salida: t.fin || t.salida
      }));
      if (turnos.length === 0) return false;

      const ahora = new Date();
      const minsAhora = ahora.getHours() * 60 + ahora.getMinutes();

      const parseMinutos = (hhMM) => {
        if (!hhMM) return null;
        const [h, m] = hhMM.split(':').map(Number);
        return h * 60 + m;
      };

      // Buscar si algún turno tiene una hora de entrada/salida cercana
      for (const turno of turnos) {
        const minsTurno = tipo === 'entrada'
          ? parseMinutos(turno.entrada)
          : parseMinutos(turno.salida);
        if (minsTurno === null) continue;

        // Ventana: 5 min antes hasta 5 min despues de la hora programada
        if (minsAhora >= minsTurno - 5 && minsAhora <= minsTurno + 5) {
          return { enVentana: true, turnoClave: `${tipo}_${minsTurno}` };
        }
      }
      return { enVentana: false, turnoClave: null };
    } catch {
      return { enVentana: true, turnoClave: `${tipo}_fallback` }; // En caso de error, permitir la notificacion
    }
  };

  const notifPoll = async () => {
    try {
      const [storedUserData, token] = await Promise.all([
        AsyncStorage.getItem('@user_data'),
        AsyncStorage.getItem('userToken')]
      );
      if (!storedUserData || !token) return;
      const user = JSON.parse(storedUserData);
      const empleadoId = user.empleado_id;
      if (!empleadoId) return;

      const online = await syncManager.isOnline();
      const hoy = new Date().toISOString().split('T')[0];

      const guardRaw = await AsyncStorage.getItem(NOTIF_DIARIA_KEY).catch(() => null);
      const guard = guardRaw ? JSON.parse(guardRaw) : { fecha: '', notificados: [] };
      if (guard.fecha !== hoy || !Array.isArray(guard.notificados)) {
        notifDiariaRef.current = { fecha: hoy, notificados: [] };
        await AsyncStorage.setItem(NOTIF_DIARIA_KEY, JSON.stringify(notifDiariaRef.current)).catch(() => { });
      } else {
        notifDiariaRef.current = guard;
      }

      if (online) {
        try {
          const preflightRes = await fetch(
            `${API_URL_BASE}/asistencias/movil/estado-boton/${empleadoId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (preflightRes.ok) {
            const pf = await preflightRes.json();
            if (pf.success && pf.habilitado) {
              const tipo = pf.tipo;
              // Solo notificar si estamos cerca de la hora programada
              const ventana = await estaEnVentanaTiempo(empleadoId, tipo);
              if (ventana.enVentana) {
                if (!notifDiariaRef.current.notificados.includes(ventana.turnoClave)) {
                  notifDiariaRef.current.notificados.push(ventana.turnoClave);
                  await AsyncStorage.setItem(NOTIF_DIARIA_KEY, JSON.stringify(notifDiariaRef.current)).catch(() => { });
                  await notificarEstadoAsistencia(tipo);
                }
              }
            }
          }
        } catch (_) { }


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





        try {
          const avisosParaNotificar = [];


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
      } else {
        // Offline: verificar si es momento de notificar usando el horario local
        try {
          const registrosHoy = await sqliteManager.getRegistrosHoy(empleadoId);
          const ultimoRegistro = registrosHoy.length > 0 ? registrosHoy[registrosHoy.length - 1] : null;
          const tipoFaltante = !ultimoRegistro || ultimoRegistro.tipo === 'salida' ? 'entrada' : 'salida';

          if (tipoFaltante) {
            const ventana = await estaEnVentanaTiempo(empleadoId, tipoFaltante);
            if (ventana.enVentana) {
              if (!notifDiariaRef.current.notificados.includes(ventana.turnoClave)) {
                notifDiariaRef.current.notificados.push(ventana.turnoClave);
                await AsyncStorage.setItem(NOTIF_DIARIA_KEY, JSON.stringify(notifDiariaRef.current)).catch(() => { });
                await notificarEstadoAsistencia(tipoFaltante);
              }
            }
          }
        } catch (_) { }
      }
    } catch (e) {

    }
  };

  const refreshUserData = async () => {
    try {
      const [storedUserData, token] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN)]
      );

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

    }
  };

  const verificarEstadoDispositivo = async () => {
    (function () { })('🔍 [App] verificandoEstadoDispositivo INICIO');
    try {
      const online = await syncManager.isOnline();
      (function () { })('🔍 [App] isOnline:', online);

      if (!online) {
        (function () { })('🔍 [App] Offline -> Saltando verificación periódica de servidor');
        return;
      }

      const [storedUserData, storedToken, onboardingCompleted] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)]
      );

      if (onboardingCompleted !== 'true') {
        (function () { })('🔍 [App] Onboarding no completado.');
        return;
      }

      if (!storedUserData || !storedToken) {
        (function () { })('🔍 [App] Faltan datos de sesión para verificar estado del servidor');
        return;
      }

      const parsedUser = JSON.parse(storedUserData);
      const empleadoId = parsedUser.empleado_id || parsedUser.empleadoInfo?.id || (parsedUser.es_empleado ? parsedUser.id : null);

      if (!empleadoId) {

        return;
      }

      (function () { })('🔍 [App] Verificando dispositivo periódicamente por empleado en servidor...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      let dispositivoEnBD = null;

      try {
        dispositivoEnBD = await Promise.race([
          verificarDispositivoPorEmpleado(empleadoId, storedToken),
          new Promise((_, reject) => {
            const id = setTimeout(() => reject(new Error('Timeout')), 5000);
            controller.signal.addEventListener('abort', () => clearTimeout(id));
          })
        ]);
        clearTimeout(timeoutId);
      } catch (err) {
        clearTimeout(timeoutId);
        (function () { })('⚠️ [App] Timeout/Error verificando dispositivo periódicamente. Asumiendo estado local.');
        return; // Mantiene el estado validado offline
      }

      if (dispositivoEnBD.existe && dispositivoEnBD.activo) {
        (function () { })('✅ [App] Dispositivo verificado periódicamente en nube: ACTIVO');
        return;
      } else if (dispositivoEnBD.existe && !dispositivoEnBD.activo) {
        (function () { })('⛔ [App] Dispositivo periódico: INACTIVO en nube.');
        await handleDeviceInvalidated('Tu dispositivo fue desactivado por el administrador', true);
      } else {
        (function () { })('ℹ️ [App] Dispositivo periódico: No encontrado en nube.');
        await handleDeviceInvalidated('Tu registro de dispositivo fue eliminado del servidor', false);
      }

    } catch (error) {
      (function () { })('❌ [App] Error consultando estado periódico del servidor:', error);


    }
  };

  const handleDeviceInvalidated = async (mensaje, isDisabled = false) => {
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    stopDeviceVerification();
    stopUserDataRefresh();
    setDeviceRegistered(false);

    if (isDisabled) {

      setDeviceDisabled(true);
    } else {

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


    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.SOLICITUD_ID),
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN_SOLICITUD),
      AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED)]
    );
    setDeviceDisabled(false);
    setDeviceRegistered(false);

  };

  const checkAppState = async () => {
    try {

      const online = await syncManager.isOnline() && !syncManager.getIsBackendDown();
      if (online) {
        try {
          const { maintenance } = await getMaintenanceStatus();
          if (maintenance) {
            (function () { })('🔧 [App] Modo mantenimiento activo');
            setIsMaintenance(true);
          }
        } catch (e) {
          (function () { })('[App] No se pudo verificar estado de mantenimiento');
        }
      }

      const [deviceCompleted, savedDarkMode, storedUserData, storedToken] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED),
        AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE),
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN)]
      );

      setDarkMode(savedDarkMode === 'true');
      setIsLoggedIn(false);
      setCurrentScreen('home');
      (function () { })('🔒 [App] Login screen enforced on startup');



      if (deviceCompleted === 'true' && online && storedUserData && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUserData);
          const empleadoId = parsedUser.empleado_id || parsedUser.empleadoInfo?.id;

          if (empleadoId) {
            (function () { })('🔍 [App] Verificando estado del dispositivo en servidor al arrancar...');
            
            // Si el backend se sabe que está caído por el healthcheck previo
            // O si queremos evitar que se trabe, metemos un timeout
            let dispositivoEnBD = null;
            if (syncManager.getIsBackendDown()) {
               throw new Error("Backend caído");
            } else {
               const controller = new AbortController();
               const timeoutId = setTimeout(() => controller.abort(), 5000);
               try {
                  dispositivoEnBD = await Promise.race([
                    verificarDispositivoPorEmpleado(empleadoId, storedToken),
                    new Promise((_, reject) => {
                       const id = setTimeout(() => reject(new Error('Timeout de 5s')), 5000);
                       controller.signal.addEventListener('abort', () => clearTimeout(id));
                    })
                  ]);
               } catch (e) {
                  throw new Error(e.message || "Error al verificar");
               } finally {
                  clearTimeout(timeoutId);
               }
            }

            if (dispositivoEnBD.existe && dispositivoEnBD.activo) {
              (function () { })('✅ [App] Dispositivo activo en servidor. Onboarding OK.');
              setDeviceRegistered(true);
            } else if (dispositivoEnBD.existe && !dispositivoEnBD.activo) {
              (function () { })('⛔ [App] Dispositivo DESACTIVADO en servidor. Limpiando onboarding.');
              await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
              setDeviceRegistered(false);

            } else {
              (function () { })('ℹ️ [App] Dispositivo no encontrado en servidor. Limpiando onboarding.');
              await AsyncStorage.multiRemove([
                STORAGE_KEYS.ONBOARDING_COMPLETED,
                STORAGE_KEYS.SOLICITUD_ID,
                STORAGE_KEYS.TOKEN_SOLICITUD]
              );
              setDeviceRegistered(false);
            }
          } else {

            setDeviceRegistered(true);
          }
        } catch (verifyError) {

          (function () { })('⚠️ [App] No se pudo verificar dispositivo al arrancar, usando estado local:', verifyError.message);
          setDeviceRegistered(deviceCompleted === 'true');
        }
      } else {

        setDeviceRegistered(deviceCompleted === 'true');
      }

    } catch (error) {
      (function () { })('CheckAppState error:', error);
      setIsLoggedIn(false);
      setDeviceRegistered(false);
    } finally {
      // Ya no forzamos un delay fijo de 2500ms al final si hay red caida, 
      // lo quitamos o dejamos solo 500ms para evitar parpadeos
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };

  const handleToggleDarkMode = async () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    await AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE, String(newValue));
  };


  const handleLoginSuccess = async (data, isOffline = false) => {
    try {
      setIsOfflineSession(isOffline);

      if (data.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, data.token);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
      setUserData(data);


      const empleadoId = data.empleado_id || data.empleadoInfo?.id || (data.es_empleado ? data.id : null);

      if (data.token) {
        syncManager.setAuthToken(data.token, empleadoId?.toString());
        syncManager.pullData(empleadoId).catch((e) => function () { }('Initial pull failed:', e.message));
      }


      if (!empleadoId) {
        (function () { })('⚠️ [App] Usuario no es empleado, no requiere dispositivo');
        setDeviceRegistered(true);
        setIsLoggedIn(true);
        return;
      }



      const currentlyOnline = await syncManager.isOnline();
      const treatAsOnline = !isOffline && currentlyOnline;

      (function () { })(`🔍 [App] Login Mode: ${isOffline ? 'OFFLINE' : 'ONLINE'}, Net: ${currentlyOnline}`);

      if (treatAsOnline && data.token && !syncManager.getIsBackendDown()) {
        try {
          (function () { })('🔍 [App] ☁️ ONLINE: Verificando dispositivo estrictamente en servidor...');
          
          let dispositivoEnBD = null;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          try {
             dispositivoEnBD = await Promise.race([
                verificarDispositivoPorEmpleado(empleadoId, data.token),
                new Promise((_, reject) => {
                   const id = setTimeout(() => reject(new Error('Timeout 5s')), 5000);
                   controller.signal.addEventListener('abort', () => clearTimeout(id));
                })
             ]);
          } finally {
             clearTimeout(timeoutId);
          }


          if (dispositivoEnBD.existe && dispositivoEnBD.activo) {
            (function () { })('✅ [App] Dispositivo verificado en nube y ACTIVO');


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
          } else


            if (dispositivoEnBD.existe && !dispositivoEnBD.activo) {
              (function () { })('⛔ [App] Dispositivo INACTIVO en nube. Mostrando DeviceDisabledScreen.');
              await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
              setDeviceDisabled(true);
              setDeviceRegistered(false);
              setIsLoggedIn(true);
              return;
            } else {
              (function () { })('ℹ️ [App] No se encontró dispositivo registrado. Primera afiliación.');
              await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
              await AsyncStorage.removeItem(STORAGE_KEYS.SOLICITUD_ID);
              await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN_SOLICITUD);
              setDeviceRegistered(false);
              setDeviceDisabled(false);
              setIsLoggedIn(true);
              return;
            }

        } catch (error) {
          (function () { })('❌ [App] Error verificando en nube:', error);
















          Alert.alert(
            'Error de Verificación',
            'No se pudo verificar el estado del dispositivo en el servidor. Intenta nuevamente.',
            [{ text: 'Reintentar', onPress: () => handleLogout() }],
            { cancelable: false }
          );
          return;
        }
      }





      (function () { })('📴 [App] Modo OFFLINE detectado. Usando validación local.');
      const deviceCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);

      if (deviceCompleted === 'true') {
        setDeviceRegistered(true);
      } else {
        setDeviceRegistered(false);
      }

      setCurrentScreen('home');
      setIsLoggedIn(true);

    } catch (error) {
      (function () { })('[App] Error FATAL en handleLoginSuccess:', error);


      Alert.alert(
        'Error',
        'Ocurrió un problema al iniciar sesión. Intenta nuevamente.',
        [{ text: 'OK', onPress: () => handleLogout() }]
      );
    }
  };






  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && (state.isInternetReachable === true || state.isInternetReachable === null);

      if (connected) {
        // Cancelar cualquier timer de desconexión pendiente
        if (offlineDebounceTimer.current) {
          clearTimeout(offlineDebounceTimer.current);
          offlineDebounceTimer.current = null;
        }

        if (isLoggedIn && isOfflineSession) {
          // Se recuperó la conexión: marcar online y refrescar datos
          setIsOfflineSession(false);
          syncManager.markBackendUp();
          healthFailCount.current = 0;
          // Disparar sync y refresh de datos en background
          syncManager.performSync('reconnect').catch(() => {});
          refreshUserData().catch(() => {});
        }
      } else {
        // Sin conexión: esperar 4 segundos antes de marcar offline
        // (evita falsos positivos por cambios momentáneos de red)
        if (!offlineDebounceTimer.current) {
          offlineDebounceTimer.current = setTimeout(() => {
            offlineDebounceTimer.current = null;
            if (isLoggedIn) {
              handleLogout();
            }
          }, 4000);
        }
      }
    });
    return () => {
      unsubscribe();
      if (offlineDebounceTimer.current) {
        clearTimeout(offlineDebounceTimer.current);
      }
    };
  }, [isLoggedIn, isOfflineSession, handleLogout]);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    setDeviceRegistered(true);
  };

  const handleLogout = async () => {
    stopDeviceVerification();
    stopUserDataRefresh();

    if (userData) {


      (function () { })('🚪 [App] Cerrando sesión (sin registrar evento logout)');
    }

    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA)]
    );

    setIsLoggedIn(false);
    setCurrentScreen('home');
    setUserData(null);
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <SplashScreen />
      </SafeAreaProvider>);

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

            }
          }} />

      </SafeAreaProvider>);

  }

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={darkMode ? "#1e40af" : "#2563eb"} />
        <LoginScreen onLoginSuccess={handleLoginSuccess} darkMode={darkMode} />
      </SafeAreaProvider>);

  }

  const handleDeviceReEnabled = async () => {

    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    setDeviceDisabled(false);
    setDeviceRegistered(true);

  };

  if (isLoggedIn && deviceDisabled) {
    return (
      <SafeAreaProvider>
        <DeviceDisabledScreen
          darkMode={darkMode}
          onReRequest={handleReRequest}
          onReEnabled={handleDeviceReEnabled} />

      </SafeAreaProvider>);

  }

  if (isLoggedIn && !deviceRegistered && userData) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
        <OnboardingNavigator
          onComplete={handleOnboardingComplete}
          userData={userData}
          onLogout={handleLogout} />

      </SafeAreaProvider>);

  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={darkMode ? "#1e40af" : "#2563eb"} />

      <SafeAreaView
        style={[styles.safeArea, darkMode && styles.safeAreaDark]}
        edges={['top']}>

        <View style={[styles.container, darkMode && styles.containerDark]}>
          {currentScreen === 'home' && <HomeScreen userData={userData} darkMode={darkMode} onOpenAvisos={() => setCurrentScreen('avisos')} />}
          {currentScreen === 'avisos' && <NotifyScreen userData={userData} darkMode={darkMode} onGoBack={() => setCurrentScreen('home')} />}
          {currentScreen === 'history' && <HistoryScreen darkMode={darkMode} userData={userData} />}
          {currentScreen === 'schedule' && <ScheduleScreen userData={userData} darkMode={darkMode} />}
          {currentScreen === 'admin' && userData?.esAdmin && <AdminScreen userData={userData} darkMode={darkMode} />}
          {currentScreen === 'settings' &&
            <SettingsScreen
              userData={userData}
              email={userData.correo}
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
              onLogout={handleLogout} />

          }

          {currentScreen !== 'avisos' &&
            <BottomNavigation
              currentScreen={currentScreen}
              onScreenChange={setCurrentScreen}
              darkMode={darkMode}
              userData={userData} />

          }
        </View>
      </SafeAreaView>
    </SafeAreaProvider>);

}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2563eb'
  },
  safeAreaDark: {
    backgroundColor: '#1e40af'
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  containerDark: {
    backgroundColor: '#111827'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb'
  }
});