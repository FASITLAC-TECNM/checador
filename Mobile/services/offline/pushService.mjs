import * as Network from 'expo-network';
import NetInfo from '@react-native-community/netinfo';
import sqliteManager from './sqliteManager.mjs';


let apiBaseUrl = '';
let authToken = '';


let isPushing = false;




export function configure(baseUrl, token) {
  if (baseUrl !== undefined && baseUrl !== null) {
    apiBaseUrl = baseUrl;
  }
  if (token !== undefined) {
    authToken = token || '';
  }
}




export function updateToken(token) {
  authToken = token || '';
}





export async function postEvent(titulo, tipo, descripcion, empleadoId, prioridad = 'media') {
  (function () { })(`[DEBUG PUSH] postEvent Called: ${titulo}`);
  try {

    if (!authToken) {
      await sqliteManager.saveOfflineEvent({
        titulo, tipo_evento: tipo, descripcion,
        empleado_id: empleadoId, prioridad,
        detalles: { origen: 'movil_sync_offline' }
      });
      return;
    }

    const response = await fetch(`${apiBaseUrl}/eventos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        titulo,
        tipo_evento: tipo,
        descripcion,
        empleado_id: empleadoId,
        prioridad,
        detalles: { origen: 'movil_sync_offline' }
      })
    });

    if (!response.ok) {

      await sqliteManager.saveOfflineEvent({
        titulo, tipo_evento: tipo, descripcion,
        empleado_id: empleadoId, prioridad,
        detalles: { origen: 'movil_sync_offline' }
      });
    }
  } catch (e) {

    try {
      await sqliteManager.saveOfflineEvent({
        titulo, tipo_evento: tipo, descripcion,
        empleado_id: empleadoId, prioridad,
        detalles: { origen: 'movil_sync_offline' }
      });
    } catch (saveErr) {

    }
  }
}






async function pushBatch(records) {
  // Intentar obtener un empresa_id de respaldo desde el caché local por si algún registro no lo tiene
  let fallbackEmpresaId = null;
  try {
    const db = sqliteManager.getDatabase();
    if (db) {
      const row = await db.getFirstAsync('SELECT id FROM cache_empresa ORDER BY updated_at DESC LIMIT 1');
      if (row && row.id) {
        fallbackEmpresaId = row.id;
      }
    }
  } catch (err) {
    (function () { })('[DEBUG PUSH] Error getting fallback empresa_id', err);
  }

  // ========== NUEVO: Capturar red en el momento del sync (online) ============
  let currentIp = null;
  let currentWifi = null;
  try {
    const netState = await Network.getNetworkStateAsync();
    const netInfoObj = await NetInfo.fetch();
    currentIp = netInfoObj.details?.ipAddress || null;

    if (!currentIp) {
      currentIp = await Network.getIpAddressAsync();
    }

    if (netState.type === Network.NetworkStateType.WIFI) {
      currentWifi = { tipo: netState.type, isConnected: netState.isConnected };
    }
  } catch (err) {
    (function () { })('[DEBUG PUSH] Error getting current IP at sync time', err);
  }
  // ===========================================================================

  const registros = records.map((record) => {

    let ubicacion = null;
    if (record.ubicacion) {
      try {
        ubicacion = typeof record.ubicacion === 'string' ?
          JSON.parse(record.ubicacion) :
          record.ubicacion;
      } catch {
        ubicacion = null;
      }
    }


    let wifi = null;
    if (record.wifi) {
      try {
        wifi = typeof record.wifi === 'string' ?
          JSON.parse(record.wifi) :
          record.wifi;
      } catch {
        wifi = null;
      }
    }

    // Usar la IP del momento de la sincronicación en línea si está disponible
    const finalIp = currentIp || record.ip || null;
    const finalWifi = currentWifi || wifi || null;

    return {
      id: record.idempotency_key || record.local_id.toString(),
      empleado_id: record.empleado_id,
      empresa_id: record.empresa_id || fallbackEmpresaId,
      tipo: record.tipo,
      estado: record.estado,
      clasificacion: record.estado,
      departamento_id: record.departamento_id || null,
      metodo_registro: record.metodo_registro,
      dispositivo_origen: record.dispositivo_origen || 'movil',
      ubicacion,
      ip: finalIp,
      wifi: finalWifi,
      fecha_registro: new Date(record.fecha_registro).getTime(),
      fecha_captura: new Date(record.fecha_registro).toISOString(),
      imagen_base64: record.payload_biometrico ? JSON.parse(record.payload_biometrico) : null
    };
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const payloadBody = JSON.stringify({ registros });

    const response = await fetch(`${apiBaseUrl}/movil/sync/asistencias`, {
      method: 'POST',
      headers,
      body: payloadBody,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { message: responseText };
    }

    if (!response.ok) {
      const errorMsg = data.message || data.error || `HTTP ${response.status}`;


      if (response.status === 401 || response.status === 403) {
        return { success: false, error: `Auth error: ${errorMsg}`, authError: true };
      }

      return { success: false, error: errorMsg };
    }

    return {
      success: true,
      sincronizados: data.sincronizados || [],
      rechazados: data.rechazados || []
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const errorMsg = error.name === 'AbortError' ?
      'Timeout de conexión' :
      `Network error: ${error.message}`;
    return { success: false, error: errorMsg };
  }
}






export async function pushPendingRecords() {
  if (isPushing) {
    return { total: 0, synced: 0, errors: 0, skipped: 0, busy: true };
  }

  isPushing = true;

  try {
    const pending = await sqliteManager.getPendingAsistencias(50);

    if (pending.length === 0) {
      return { total: 0, synced: 0, errors: 0, skipped: 0 };
    }

    const result = await pushBatch(pending);

    if (!result.success) {

      for (const record of pending) {
        await sqliteManager.markSyncError(record.local_id, result.error, result.authError || false);
      }

      return { total: pending.length, synced: 0, errors: pending.length, skipped: 0 };
    }


    const { sincronizados, rechazados } = result;


    for (const sync of sincronizados) {
      const record = pending.find((r) =>
        r.idempotency_key === sync.id_local || r.local_id.toString() === sync.id_local
      );
      if (record) {
        await sqliteManager.markAsSynced(record.local_id, sync.id_servidor, sync.estado || null);

        let nombreGuardado = 'El empleado';
        try {
          const emp = await sqliteManager.getEmpleado(record.empleado_id);
          if (emp && emp.nombre) nombreGuardado = emp.nombre;
        } catch (e) { }

        (function () { })(`[DEBUG PUSH] Firing postEvent for record: ${record.local_id}`);


        const estadoSincronizado = sync.estado && sync.estado !== 'pendiente' ?
          sync.estado :
          record.estado && record.estado !== 'pendiente' ? record.estado : 'sincronizado';
        await postEvent(
          `Registro de ${record.tipo} - ${estadoSincronizado}`,
          'ASISTENCIA',
          `${nombreGuardado} registró ${record.tipo}`,
          record.empleado_id,
          'alta'
        );
      }
    }


    for (const rej of rechazados) {
      const record = pending.find((r) =>
        r.idempotency_key === rej.id_local || r.local_id.toString() === rej.id_local
      );
      if (record) {
        // Si el backend procesó el registro y lo incluyó en "rechazados" explícitamente, 
        // el rechazo es definitivo (ej: IP inválida, datos faltantes).
        // Mandar el mismo payload inmutable de SQLite nuevamente no cambiará la respuesta.
        const definitivo = true;
        await sqliteManager.markSyncError(record.local_id, rej.error, definitivo);
      }
    }

    const synced = sincronizados.length;
    const errors = rechazados.length;
    return { total: pending.length, synced, errors, skipped: 0 };
  } catch (error) {
    return { total: 0, synced: 0, errors: 0, skipped: 0, error: error.message };
  } finally {
    isPushing = false;
  }
}






let isPushingEvents = false;




export async function pushEvents() {
  if (isPushingEvents) return { success: false, busy: true };
  if (!authToken) return { success: false, error: 'No token' };

  isPushingEvents = true;

  try {
    const pending = await sqliteManager.getPendingEvents(100);
    if (pending.length === 0) return { success: true, count: 0 };

    let sincronizados = 0;
    const processedIds = new Set();

    for (const evt of pending) {
      if (processedIds.has(evt.local_id)) continue;
      processedIds.add(evt.local_id);

      try {
        const response = await fetch(`${apiBaseUrl}/eventos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            titulo: evt.titulo,
            tipo_evento: evt.tipo_evento,
            descripcion: evt.descripcion,
            empleado_id: evt.empleado_id,
            prioridad: evt.prioridad,
            detalles: evt.detalles ? JSON.parse(evt.detalles) : { origen: 'movil_sync_offline' }
          })
        });

        if (response.ok) {
          await sqliteManager.markEventSynced(evt.local_id);
          sincronizados++;
        } else {
          const errText = await response.text();
          await sqliteManager.markEventSyncError(evt.local_id, `HTTP ${response.status}: ${errText}`);
        }
      } catch (e) {
        await sqliteManager.markEventSyncError(evt.local_id, e.message);
      }
    }

    return { success: true, count: sincronizados };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    isPushingEvents = false;
  }
}

export default {
  configure,
  updateToken,
  pushPendingRecords,
  pushEvents,
  postEvent
};