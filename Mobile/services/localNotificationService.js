// services/localNotificationService.js
// Servicio de notificaciones locales para Android usando expo-notifications

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  LAST_INCIDENCIAS_ESTADOS: '@notif_incidencias_estados',
  LAST_AVISOS_IDS: '@notif_avisos_ids',
};

// Configurar comportamiento cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Inicializar notificaciones: permisos + canales Android
export const initNotifications = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Permisos de notificaciones no otorgados');
      return false;
    }

    // Crear canales Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('asistencia', {
        name: 'Asistencia',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('incidencias', {
        name: 'Incidencias',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('avisos', {
        name: 'Avisos',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#3b82f6',
        sound: 'default',
      });
    }

    console.log('✅ Notificaciones inicializadas');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando notificaciones:', error);
    return false;
  }
};

// Notificar registro de asistencia exitoso
export const notificarRegistro = async (tipo, estado) => {
  try {
    const esSalida = tipo === 'salida';
    let titulo = esSalida ? 'Salida Registrada' : 'Entrada Registrada';
    let cuerpo = '';
    let emoji = '';

    if (esSalida) {
      emoji = '👋';
      cuerpo = 'Tu salida ha sido registrada correctamente';
    } else {
      switch (estado) {
        case 'puntual':
          emoji = '✅';
          cuerpo = 'Entrada registrada - Puntual';
          break;
        case 'retardo_a':
          emoji = '⚠️';
          cuerpo = 'Entrada registrada - Retardo tipo A (hasta 20 min)';
          break;
        case 'retardo_b':
          emoji = '⚠️';
          cuerpo = 'Entrada registrada - Retardo tipo B (hasta 29 min)';
          break;
        case 'falta_por_retardo':
          emoji = '❌';
          cuerpo = 'Entrada registrada - Falta por retardo mayor';
          break;
        case 'falta':
          emoji = '❌';
          cuerpo = 'Entrada registrada - Fuera de tolerancia';
          break;
        default:
          emoji = '📋';
          cuerpo = `Entrada registrada - ${estado}`;
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji} ${titulo}`,
        body: cuerpo,
        data: { type: 'asistencia', tipo, estado },
      },
      trigger: null, // Inmediata
      ...(Platform.OS === 'android' && { channelId: 'asistencia' }),
    });
  } catch (error) {
    console.error('Error enviando notificación de registro:', error);
  }
};

// Notificar estado de asistencia ("Listo para registrar entrada/salida")
export const notificarEstadoAsistencia = async (tipoRegistro) => {
  try {
    const esEntrada = tipoRegistro === 'entrada';
    const titulo = esEntrada
      ? '🕐 Listo para registrar entrada'
      : '🕐 Listo para registrar salida';
    const cuerpo = esEntrada
      ? 'Ya puedes registrar tu entrada de asistencia'
      : 'Ya puedes registrar tu salida';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: cuerpo,
        data: { type: 'estado_asistencia', tipoRegistro },
      },
      trigger: null,
      ...(Platform.OS === 'android' && { channelId: 'asistencia' }),
    });
  } catch (error) {
    console.error('Error enviando notificación de estado asistencia:', error);
  }
};

// Notificar cambio de estado de incidencia
export const notificarIncidencia = async (tipoIncidencia, estado) => {
  try {
    let titulo = '';
    let cuerpo = '';

    const tipoLabel = {
      retardo: 'Retardo',
      justificante: 'Justificante',
      permiso: 'Permiso',
      vacaciones: 'Vacaciones',
      falta_justificada: 'Falta Justificada',
    }[tipoIncidencia] || tipoIncidencia;

    if (estado === 'aprobado') {
      titulo = '✅ Incidencia Aprobada';
      cuerpo = `Tu ${tipoLabel} ha sido aprobada`;
    } else if (estado === 'rechazado') {
      titulo = '❌ Incidencia Rechazada';
      cuerpo = `Tu ${tipoLabel} ha sido rechazada`;
    } else {
      return; // Solo notificar aprobado/rechazado
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: cuerpo,
        data: { type: 'incidencia', tipoIncidencia, estado },
      },
      trigger: null,
      ...(Platform.OS === 'android' && { channelId: 'incidencias' }),
    });
  } catch (error) {
    console.error('Error enviando notificación de incidencia:', error);
  }
};

// Notificar nuevo aviso
export const notificarAviso = async (titulo) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📢 Nuevo Aviso',
        body: titulo,
        data: { type: 'aviso' },
      },
      trigger: null,
      ...(Platform.OS === 'android' && { channelId: 'avisos' }),
    });
  } catch (error) {
    console.error('Error enviando notificación de aviso:', error);
  }
};

// Detectar cambios de estado en incidencias y notificar
export const detectarCambiosIncidencias = async (incidenciasActuales) => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_INCIDENCIAS_ESTADOS);
    const estadosPrevios = stored ? JSON.parse(stored) : {};

    // Guardar estados actuales
    const estadosActuales = {};
    for (const inc of incidenciasActuales) {
      if (inc.id && !inc.is_offline) {
        estadosActuales[inc.id] = inc.estado;
      }
    }
    await AsyncStorage.setItem(
      STORAGE_KEYS.LAST_INCIDENCIAS_ESTADOS,
      JSON.stringify(estadosActuales)
    );

    // Solo comparar si hay estados previos (no es la primera carga)
    if (Object.keys(estadosPrevios).length === 0) return;

    // Detectar cambios a aprobado/rechazado
    for (const inc of incidenciasActuales) {
      if (!inc.id || inc.is_offline) continue;
      const estadoPrevio = estadosPrevios[inc.id];
      if (
        estadoPrevio &&
        estadoPrevio !== inc.estado &&
        (inc.estado === 'aprobado' || inc.estado === 'rechazado')
      ) {
        await notificarIncidencia(inc.tipo, inc.estado);
      }
    }
  } catch (error) {
    console.error('Error detectando cambios de incidencias:', error);
  }
};

// Detectar avisos nuevos y notificar
export const detectarAvisosNuevos = async (avisosActuales) => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_AVISOS_IDS);
    const idsPrevios = stored ? JSON.parse(stored) : [];

    // Guardar IDs actuales
    const idsActuales = avisosActuales.map(a => a.id).filter(Boolean);
    await AsyncStorage.setItem(
      STORAGE_KEYS.LAST_AVISOS_IDS,
      JSON.stringify(idsActuales)
    );

    // Solo comparar si hay IDs previos (no es la primera carga)
    if (idsPrevios.length === 0) return;

    // Detectar nuevos
    const prevSet = new Set(idsPrevios);
    const nuevos = avisosActuales.filter(a => a.id && !prevSet.has(a.id));

    for (const aviso of nuevos) {
      await notificarAviso(aviso.titulo || 'Tienes un nuevo aviso');
    }
  } catch (error) {
    console.error('Error detectando avisos nuevos:', error);
  }
};

export default {
  initNotifications,
  notificarRegistro,
  notificarEstadoAsistencia,
  notificarIncidencia,
  notificarAviso,
  detectarCambiosIncidencias,
  detectarAvisosNuevos,
};
