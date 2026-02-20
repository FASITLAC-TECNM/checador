/**
 * PushService — Envía registros de asistencia pendientes al servidor en lotes
 * Usa el endpoint dedicado /api/escritorio/sync/asistencias-pendientes
 */

import sqliteManager from './sqliteManager.mjs';

// Configuración
let apiBaseUrl = '';
let authToken = '';

// Track de último push para evitar concurrencia
let isPushing = false;

/**
 * Configura la URL base y token
 */
export function configure(baseUrl, token) {
  apiBaseUrl = baseUrl;
  authToken = token || '';
}

/**
 * Actualiza solo el token (sin cambiar la URL)
 */
export function updateToken(token) {
  authToken = token || '';
}

/**
 * Envía un lote de registros pendientes al servidor
 * @param {Array} records - registros de offline_asistencias
 * @returns {Object} { sincronizados, rechazados }
 */
async function pushBatch(records) {
  // Transformar registros al formato que espera el endpoint
  const registros = records.map(record => ({
    id: record.idempotency_key || record.local_id.toString(),
    empleado_id: record.empleado_id,
    tipo: record.tipo,
    estado: record.estado,
    clasificacion: record.estado,
    departamento_id: record.departamento_id || null,
    metodo_registro: record.metodo_registro,
    dispositivo_origen: record.dispositivo_origen || 'escritorio',
    ubicacion: null,
    fecha_registro: new Date(record.fecha_registro).getTime(),
  }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${apiBaseUrl}/api/escritorio/sync/asistencias-pendientes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ registros }),
      signal: controller.signal,
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
      console.log(`  📋 [Push] Respuesta del servidor (${response.status}):`, JSON.stringify(data).substring(0, 300));

      // Auth errors — no point retrying without new token
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: `Auth error: ${errorMsg}`, authError: true };
      }

      return { success: false, error: errorMsg };
    }

    return {
      success: true,
      sincronizados: data.sincronizados || [],
      rechazados: data.rechazados || [],
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const errorMsg = error.name === 'AbortError'
      ? 'Timeout de conexión'
      : `Network error: ${error.message}`;
    return { success: false, error: errorMsg };
  }
}

/**
 * Ejecuta el Push de todos los registros pendientes
 * @returns {Object} { total, synced, errors, skipped }
 */
export async function pushPendingRecords() {
  if (isPushing) {
    console.log('⏳ [Push] Ya hay un push en curso, omitiendo...');
    return { total: 0, synced: 0, errors: 0, skipped: 0, busy: true };
  }

  isPushing = true;
  console.log('⬆️ [Push] Iniciando push de registros pendientes...');

  try {
    const pending = sqliteManager.getPendingAsistencias(50); // Máximo 50

    if (pending.length === 0) {
      console.log('✅ [Push] No hay registros pendientes');
      return { total: 0, synced: 0, errors: 0, skipped: 0 };
    }

    console.log(`📤 [Push] ${pending.length} registros pendientes encontrados`);

    const result = await pushBatch(pending);

    if (!result.success) {
      // Error general (network, auth, etc.)
      console.error(`❌ [Push] Error en batch: ${result.error}`);

      // Marcar cada registro con error
      for (const record of pending) {
        sqliteManager.markSyncError(record.local_id, result.error, result.authError || false);
      }

      return { total: pending.length, synced: 0, errors: pending.length, skipped: 0 };
    }

    // Procesar resultados individuales
    const { sincronizados, rechazados } = result;

    // Marcar sincronizados
    for (const sync of sincronizados) {
      const record = pending.find(r =>
        (r.idempotency_key === sync.id_local) || (r.local_id.toString() === sync.id_local)
      );
      if (record) {
        sqliteManager.markAsSynced(record.local_id, sync.id_servidor);
        console.log(`  ✅ local_id=${record.local_id} → server_id=${sync.id_servidor}`);
      }
    }

    // Marcar rechazados
    for (const rej of rechazados) {
      const record = pending.find(r =>
        (r.idempotency_key === rej.id_local) || (r.local_id.toString() === rej.id_local)
      );
      if (record) {
        const definitivo = ['CAMPOS_FALTANTES', 'EMPLEADO_NO_EXISTE', 'DUPLICADO'].includes(rej.codigo);
        sqliteManager.markSyncError(record.local_id, rej.error, definitivo);
        console.log(`  ❌ local_id=${record.local_id}: ${rej.error} (${rej.codigo})${definitivo ? ' DEFINITIVO' : ''}`);
      }
    }

    const synced = sincronizados.length;
    const errors = rechazados.length;
    console.log(`📊 [Push] Resultado: ${synced} sincronizados, ${errors} rechazados`);
    return { total: pending.length, synced, errors, skipped: 0 };
  } catch (error) {
    console.error('❌ [Push] Error general en push:', error.message);
    return { total: 0, synced: 0, errors: 0, skipped: 0, error: error.message };
  } finally {
    isPushing = false;
  }
}

/**
 * Fuerza el push de un registro específico
 * @param {number} localId
 * @returns {Object}
 */
export async function forcePushRecord(localId) {
  const db = sqliteManager.getDatabase();
  if (!db) return { success: false, error: 'Database not initialized' };

  const stmt = db.prepare(`
    SELECT 
      L_id1 AS local_id,
      iK_99 AS idempotency_key,
      sRv_D AS server_id,
      eMp_X AS empleado_id,
      CASE tYp_3 WHEN 'IN_1' THEN 'entrada' WHEN 'OUT_0' THEN 'salida' ELSE tYp_3 END AS tipo,
      st_5 AS estado,
      CASE src_D WHEN 'dSk_T' THEN 'escritorio' ELSE src_D END AS dispositivo_origen,
      CASE mTh_R WHEN 'pN_Val' THEN 'PIN' WHEN 'fP_Val' THEN 'HUELLA' WHEN 'fC_Val' THEN 'FACIAL' ELSE mTh_R END AS metodo_registro,
      dEp_I AS departamento_id,
      dT_Rg AS fecha_registro,
      bIo_P AS payload_biometrico,
      iS_yn AS is_synced,
      s_AtM AS sync_attempts,
      l_ErR AS last_sync_error,
      l_AtT AS last_sync_attempt,
      cR_at AS created_at
    FROM kLoPs9 
    WHERE L_id1 = ?
  `);
  const record = stmt.get(localId);

  if (!record) {
    return { success: false, error: 'Registro no encontrado' };
  }

  const result = await pushBatch([record]);

  if (result.success) {
    const synced = result.sincronizados?.[0];
    if (synced) {
      sqliteManager.markAsSynced(record.local_id, synced.id_servidor);
      return { success: true, serverId: synced.id_servidor };
    }
    const rejected = result.rechazados?.[0];
    if (rejected) {
      sqliteManager.markSyncError(record.local_id, rejected.error, true);
      return { success: false, error: rejected.error };
    }
  }

  return { success: false, error: result.error || 'Unknown error' };
}

export default {
  configure,
  updateToken,
  pushPendingRecords,
  forcePushRecord,
};
