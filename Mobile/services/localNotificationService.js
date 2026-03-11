


import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  LAST_INCIDENCIAS_ESTADOS: '@notif_incidencias_estados',
  LAST_AVISOS_IDS: '@notif_avisos_ids'
};

const NOTIF_CONFIG_KEY = '@notificaciones_config';
const NOTIF_DEFAULTS = {
  incidencias: true,
  asistencia_entrada: true,
  asistencia_salida: true,
  asistencia_proxima: true,
  avisos: true
};


const getNotifConfig = async () => {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_CONFIG_KEY);
    return raw ? { ...NOTIF_DEFAULTS, ...JSON.parse(raw) } : NOTIF_DEFAULTS;
  } catch {
    return NOTIF_DEFAULTS;
  }
};


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});


export const initNotifications = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }


    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('asistencia', {
        name: 'Asistencia',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
        sound: 'default'
      });

      await Notifications.setNotificationChannelAsync('incidencias', {
        name: 'Incidencias',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
        sound: 'default'
      });

      await Notifications.setNotificationChannelAsync('avisos', {
        name: 'Avisos',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#3b82f6',
        sound: 'default'
      });
    }

    return true;
  } catch (error) {
    return false;
  }
};


export const notificarRegistro = async (tipo, estado) => {
  try {
    const cfg = await getNotifConfig();
    const key = tipo === 'salida' ? 'asistencia_salida' : 'asistencia_entrada';
    if (!cfg[key]) return;

    const esSalida = tipo === 'salida';
    let titulo = esSalida ? 'Salida Registrada' : 'Entrada Registrada';
    let cuerpo = '';

    if (esSalida) {
      switch (estado) {
        case 'salida_temprana':
          cuerpo = 'Salida anticipada registrada';
          break;
        case 'salida_tarde':
          cuerpo = 'Salida tardía registrada';
          break;
        case 'salida_puntual':
        default:
          cuerpo = 'Salida registrada correctamente';
      }
    } else {
      switch (estado) {
        case 'entrada_temprana':
          cuerpo = 'Entrada anticipada registrada';
          break;
        case 'puntual':
          cuerpo = 'Entrada registrada - Puntual';
          break;
        case 'falta_por_retardo':
          cuerpo = 'Entrada registrada - Falta por retardo';
          break;
        case 'falta':
          cuerpo = 'Entrada registrada - Fuera de tolerancia';
          break;
        case 'pendiente':
          cuerpo = 'Registro pendiente de sincronización';
          break;
        default:
          if (estado?.startsWith('retardo')) {
            cuerpo = `Entrada con retardo registrada (${estado.replace('_', ' ')})`;
          } else {
            cuerpo = `Registro: ${estado?.replace(/_/g, ' ') || 'completado'}`;
          }
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: cuerpo,
        data: { type: 'asistencia', tipo, estado }
      },
      trigger: null,
      ...(Platform.OS === 'android' && { channelId: 'asistencia' })
    });
  } catch (error) {

  }
};


export const notificarEstadoAsistencia = async (tipoRegistro) => {
  try {
    const cfg = await getNotifConfig();
    if (!cfg.asistencia_proxima) return;

    const esEntrada = tipoRegistro === 'entrada';
    const titulo = esEntrada ? 'Listo para registrar entrada' : 'Listo para registrar salida';
    const cuerpo = esEntrada ?
      'Ya puedes registrar tu entrada de asistencia' :
      'Ya puedes registrar tu salida';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: cuerpo,
        data: { type: 'estado_asistencia', tipoRegistro }
      },
      trigger: null,
      ...(Platform.OS === 'android' && { channelId: 'asistencia' })
    });
  } catch (error) {

  }
};


export const notificarIncidencia = async (tipoIncidencia, estado) => {
  try {
    const cfg = await getNotifConfig();
    if (!cfg.incidencias) return;

    let titulo = '';
    let cuerpo = '';

    const tipoLabel = {
      retardo: 'Retardo',
      justificante: 'Justificante',
      permiso: 'Permiso',
      vacaciones: 'Vacaciones',
      falta_justificada: 'Falta Justificada'
    }[tipoIncidencia] || tipoIncidencia;

    if (estado === 'aprobado') {
      titulo = 'Incidencia Aprobada';
      cuerpo = `Tu ${tipoLabel} ha sido aprobada`;
    } else if (estado === 'rechazado') {
      titulo = 'Incidencia Rechazada';
      cuerpo = `Tu ${tipoLabel} ha sido rechazada`;
    } else {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: cuerpo,
        data: { type: 'incidencia', tipoIncidencia, estado }
      },
      trigger: null,
      ...(Platform.OS === 'android' && { channelId: 'incidencias' })
    });
  } catch (error) {

  }
};


export const notificarAviso = async (titulo) => {
  try {
    const cfg = await getNotifConfig();
    if (!cfg.avisos) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nuevo Aviso',
        body: titulo,
        data: { type: 'aviso' }
      },
      trigger: null,
      ...(Platform.OS === 'android' && { channelId: 'avisos' })
    });
  } catch (error) {

  }
};


export const detectarCambiosIncidencias = async (incidenciasActuales) => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_INCIDENCIAS_ESTADOS);
    const estadosPrevios = stored ? JSON.parse(stored) : {};


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


    if (Object.keys(estadosPrevios).length === 0) return;


    for (const inc of incidenciasActuales) {
      if (!inc.id || inc.is_offline) continue;
      const estadoPrevio = estadosPrevios[inc.id];
      if (
      estadoPrevio &&
      estadoPrevio !== inc.estado && (
      inc.estado === 'aprobado' || inc.estado === 'rechazado'))
      {
        await notificarIncidencia(inc.tipo, inc.estado);
      }
    }
  } catch (error) {

  }
};


export const detectarAvisosNuevos = async (avisosActuales) => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_AVISOS_IDS);
    const idsPrevios = stored ? JSON.parse(stored) : [];


    const idsActuales = avisosActuales.map((a) => a.id).filter(Boolean);
    await AsyncStorage.setItem(
      STORAGE_KEYS.LAST_AVISOS_IDS,
      JSON.stringify(idsActuales)
    );


    if (idsPrevios.length === 0) return;


    const prevSet = new Set(idsPrevios);
    const nuevos = avisosActuales.filter((a) => a.id && !prevSet.has(a.id));

    for (const aviso of nuevos) {
      await notificarAviso(aviso.titulo || 'Tienes un nuevo aviso');
    }
  } catch (error) {

  }
};

export default {
  initNotifications,
  notificarRegistro,
  notificarEstadoAsistencia,
  notificarIncidencia,
  notificarAviso,
  detectarCambiosIncidencias,
  detectarAvisosNuevos
};