








import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import sqliteManager from './sqliteManager.mjs';
import pullService from './pullService.mjs';
import pushService from './pushService.mjs';
import { detectarCambiosIncidencias, detectarAvisosNuevos } from '../localNotificationService';
import { getApiEndpoint } from '../../config/api.js';


let authToken = null;
let storedEmpleadoId = null;
let isPushingSessions = false;
let isPushingIncidencias = false;
let isSyncing = false;
let isBackendDown = false;

const API_URL = getApiEndpoint('/api');
const CLEANUP_KEY = '@sqlite_last_cleanup';





async function cleanupDiario() {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const ultima = await AsyncStorage.getItem(CLEANUP_KEY);
    if (ultima === hoy) return;

    await sqliteManager.cleanupSyncedRecords(7);
    await AsyncStorage.setItem(CLEANUP_KEY, hoy);
  } catch (e) {

  }
}




export function setAuthToken(token, empleadoId = null) {
  authToken = token;
  if (empleadoId) storedEmpleadoId = empleadoId;


  pullService.configure(API_URL, token);
  pushService.configure(API_URL, token);
}




export async function isOnline() {
  const state = await NetInfo.fetch();

  return state.isConnected && (state.isInternetReachable === true || state.isInternetReachable === null);
}









export async function pullData(empleadoId = null) {
  const empId = empleadoId || storedEmpleadoId;
  if (!empId) return { success: false, error: 'empleadoId requerido' };
  if (!authToken) return { success: false, error: 'No hay token' };

  const online = await isOnline();
  if (!online) return { success: false, error: 'Sin conexión' };

  return await pullService.fullPull(empId);
}








export async function pushData() {
  if (!authToken) return { success: false, error: 'No token' };

  const online = await isOnline();
  if (!online) return { success: false, error: 'Offline' };

  return await pushService.pushPendingRecords();
}









export async function pushSessions() {
  if (isPushingSessions) {
    return { success: false, busy: true };
  }
  isPushingSessions = true;

  if (!authToken) {
    isPushingSessions = false;
    return { success: false, error: 'No hay token' };
  }

  const online = await isOnline();
  if (!online) { isPushingSessions = false; return { success: false, error: 'Offline' }; }

  try {
    const pending = await sqliteManager.getPendingSessions(50);

    if (pending.length === 0) {
      return { success: true, count: 0 };
    }

    const sesiones = pending.map((s) => ({
      local_id: s.local_id,
      usuario_id: s.usuario_id,
      empleado_id: s.empleado_id,
      tipo: s.tipo,
      modo: s.modo,
      fecha_evento: s.fecha_evento,
      dispositivo: s.dispositivo || 'movil'
    }));

    const url = `${API_URL}/movil/sync/sesiones`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ sesiones })
    });

    if (!response.ok) {
      await response.text();
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.sincronizados) {
      for (const s of result.sincronizados) {
        await sqliteManager.markSessionSynced(s.local_id);



        const original = pending.find((p) => p.local_id === s.local_id);
        const tipo = original ? original.tipo : s.tipo;
        const empleadoId = original ? original.empleado_id : s.empleado_id;
        const modo = original ? original.modo : s.modo;


        if (tipo === 'login') {
          const isOffline = modo === 'offline';
          let nombreEmpleado = 'Usuario';

          try {
            if (empleadoId) {
              const emp = await sqliteManager.getEmpleado(empleadoId);
              if (emp && emp.nombre) nombreEmpleado = emp.nombre;
            }
          } catch (e) {

          }


          const title = 'Inicio de sesión';
          const desc = `${nombreEmpleado} inicio sesión`;

          await pushService.postEvent(
            title,
            'autenticacion',
            desc,
            empleadoId,
            'baja'
          );
        }

      }
    }

    if (result.errores && result.errores.length > 0) {
      for (const e of result.errores) {
        await sqliteManager.markSessionSyncError(e.local_id, e.error);
      }
    }

    await pushService.pushEvents().catch(() => { });


    return { success: true, count: result.sincronizados?.length };

  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    isPushingSessions = false;
  }
}









export async function pushIncidencias() {
  if (isPushingIncidencias) {
    return { success: false, busy: true };
  }


  isPushingIncidencias = true;

  try {
    if (!authToken) {
      return { success: false, error: 'No token' };
    }

    const online = await isOnline();
    if (!online) {
      return { success: false, error: 'Offline' };
    }

    const pending = await sqliteManager.getPendingIncidencias(50);
    if (pending.length === 0) {
      return { success: true, count: 0 };
    }

    let sincronizadas = 0;
    const processedIds = new Set();

    for (const inc of pending) {

      if (processedIds.has(inc.local_id)) continue;
      processedIds.add(inc.local_id);

      try {
        const response = await fetch(`${API_URL}/incidencias`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            empleado_id: inc.empleado_id,
            tipo: inc.tipo,
            motivo: inc.motivo,
            fecha_inicio: inc.fecha_inicio,
            fecha_fin: inc.fecha_fin
          })
        });

        if (response.ok) {
          const data = await response.json();
          const serverId = data.data?.id || null;
          await sqliteManager.markIncidenciaSynced(inc.local_id, serverId);
          sincronizadas++;
        } else {
          const errText = await response.text();
          await sqliteManager.markIncidenciaSyncError(inc.local_id, `HTTP ${response.status}: ${errText}`);
        }
      } catch (e) {
        await sqliteManager.markIncidenciaSyncError(inc.local_id, e.message);
      }
    }

    return { success: true, count: sincronizadas };

  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    isPushingIncidencias = false;
  }
}









export async function performSync(reason = 'manual') {
  if (isSyncing) {
    return;
  }

  const online = await isOnline();
  if (!online && reason !== 'initial') {
    return;
  }

  // Si el backend está caído (según health check) y no es sync inicial, omitir
  if (isBackendDown && reason !== 'initial') {
    return;
  }

  isSyncing = true;

  try {

    await cleanupDiario();


    await pushSessions().catch(() => { });


    if (authToken) {
      await pushData().catch(() => { });
    }


    if (authToken) {
      await pushIncidencias().catch(() => { });
    }


    if (authToken) {
      await pushService.pushEvents().catch(() => { });
    }


    if (authToken && storedEmpleadoId) {
      const pullRes = await pullData(storedEmpleadoId).catch(() => null);


      if (pullRes && pullRes.incidencias && pullRes.incidencias.success && pullRes.incidencias.data) {
        detectarCambiosIncidencias(pullRes.incidencias.data);
      }


      if (pullRes && pullRes.avisos && pullRes.avisos.success && pullRes.avisos.data) {
        detectarAvisosNuevos(pullRes.avisos.data);
      }
    }

  } catch (error) {

  } finally {
    isSyncing = false;
  }
}

export function markBackendDown() {
  isBackendDown = true;
}

export function markBackendUp() {
  isBackendDown = false;
}

export function initAutoSync() {

  NetInfo.fetch().then((state) => {
    if (state.isConnected && state.isInternetReachable) {
      setTimeout(() => performSync('initial'), 2000);
    }
  });



  let syncDebounceTimer = null;

  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);

      syncDebounceTimer = setTimeout(() => {
        performSync('reconnect');
        syncDebounceTimer = null;
      }, 2000);
    }
  });


  setInterval(async () => {
    const state = await NetInfo.fetch();
    if (state.isConnected && state.isInternetReachable) {
      performSync('periodic');
    }
  }, 120000);

  return unsubscribe;
}

export default {
  setAuthToken,
  pullData,
  pushData,
  pushSessions,
  pushIncidencias,
  performSync,
  initAutoSync,
  isOnline,
  markBackendDown,
  markBackendUp
};