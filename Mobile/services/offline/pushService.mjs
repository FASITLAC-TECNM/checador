/**
 * PushService — Envía registros de asistencia pendientes al servidor en lotes (Mobile)
 * Usa endpoints dedicados para móvil: /api/movil/sync/asistencias
 * Archivo .mjs — ES Module
 *
 * Adaptado de Desktop/pushService.mjs para React Native/Expo
 */

import sqliteManager from './sqliteManager.mjs';

// Configuración
let apiBaseUrl = '';
let authToken = '';

// Guard de concurrencia (patrón Desktop)
let isPushing = false;

/**
 * Configura la URL base y token
 */
export function configure(baseUrl, token) {
    if (baseUrl !== undefined && baseUrl !== null) {
        apiBaseUrl = baseUrl;
    }
    if (token !== undefined) {
        authToken = token || '';
    }
}

/**
 * Actualiza solo el token (sin cambiar la URL)
 */
export function updateToken(token) {
    authToken = token || '';
}

/**
 * Helper para registrar eventos en el backend (POST /api/eventos)
 * Si no hay conexión, guarda el evento en la cola offline de SQLite.
 */
async function postEvent(titulo, tipo, descripcion, empleadoId, prioridad = 'media') {
    try {
        // Si no hay token, guardar en cola offline
        if (!authToken) {
            await sqliteManager.saveOfflineEvent({
                titulo, tipo_evento: tipo, descripcion,
                empleado_id: empleadoId, prioridad,
                detalles: { origen: 'movil_sync_offline' }
            });
            return;
        }

        console.log(`📝 [Push] Creando evento: ${titulo} (${tipo}) para emp=${empleadoId}`);
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
            // Si falla el envío, guardar en cola offline
            await sqliteManager.saveOfflineEvent({
                titulo, tipo_evento: tipo, descripcion,
                empleado_id: empleadoId, prioridad,
                detalles: { origen: 'movil_sync_offline' }
            });
        }
    } catch (e) {
        console.log(`⚠️ [Push] No se pudo crear evento ${titulo}: ${e.message}`);
        // Guardar en cola offline
        try {
            await sqliteManager.saveOfflineEvent({
                titulo, tipo_evento: tipo, descripcion,
                empleado_id: empleadoId, prioridad,
                detalles: { origen: 'movil_sync_offline' }
            });
        } catch (saveErr) {
            console.log(`⚠️ [Push] No se pudo guardar evento offline: ${saveErr.message}`);
        }
    }
}

/**
 * Envía un lote de registros pendientes al servidor
 * @param {Array} records - registros de offline_asistencias
 * @returns {Object} { success, sincronizados, rechazados }
 */
async function pushBatch(records) {
    const registros = records.map(record => ({
        id: record.idempotency_key || record.local_id.toString(),
        empleado_id: record.empleado_id,
        tipo: record.tipo,
        estado: record.estado,
        clasificacion: record.estado,
        departamento_id: record.departamento_id || null,
        metodo_registro: record.metodo_registro,
        dispositivo_origen: record.dispositivo_origen || 'movil',
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

        const response = await fetch(`${apiBaseUrl}/movil/sync/asistencias`, {
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

            // Auth errors — no tiene sentido reintentar sin nuevo token
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
 * (Adaptado de Desktop — con guard de concurrencia y procesamiento por lotes)
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
        const pending = await sqliteManager.getPendingAsistencias(50);

        if (pending.length === 0) {
            console.log('✅ [Push] No hay registros pendientes');
            return { total: 0, synced: 0, errors: 0, skipped: 0 };
        }

        console.log(`📤 [Push] ${pending.length} registros pendientes encontrados`);

        const result = await pushBatch(pending);

        if (!result.success) {
            console.error(`❌ [Push] Error en batch: ${result.error}`);

            // Marcar cada registro con error
            for (const record of pending) {
                await sqliteManager.markSyncError(record.local_id, result.error, result.authError || false);
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
                await sqliteManager.markAsSynced(record.local_id, sync.id_servidor);
                console.log(`  ✅ local_id=${record.local_id} → server_id=${sync.id_servidor}`);

                // Crear evento de sistema
                await postEvent(
                    `Registro de Asistencia (${record.tipo})`,
                    'ASISTENCIA',
                    `Registro de ${record.tipo} sincronizado desde móvil. Método: ${record.metodo_registro}`,
                    record.empleado_id,
                    'alta'
                );
            }
        }

        // Marcar rechazados (patrón Desktop — detectar definitivos)
        for (const rej of rechazados) {
            const record = pending.find(r =>
                (r.idempotency_key === rej.id_local) || (r.local_id.toString() === rej.id_local)
            );
            if (record) {
                const definitivo = ['CAMPOS_FALTANTES', 'EMPLEADO_NO_EXISTE', 'DUPLICADO'].includes(rej.codigo);
                await sqliteManager.markSyncError(record.local_id, rej.error, definitivo);
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
 * Push de eventos offline pendientes al servidor
 */
export async function pushEvents() {
    if (!authToken) return { success: false, error: 'No token' };

    try {
        const pending = await sqliteManager.getPendingEvents(100);
        if (pending.length === 0) return { success: true, count: 0 };

        console.log(`📤 [Push] ${pending.length} eventos offline pendientes`);
        let sincronizados = 0;

        for (const evt of pending) {
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

        console.log(`📊 [Push] Eventos: ${sincronizados}/${pending.length} sincronizados`);
        return { success: true, count: sincronizados };
    } catch (error) {
        console.error('❌ [Push] Error en pushEvents:', error.message);
        return { success: false, error: error.message };
    }
}

export default {
    configure,
    updateToken,
    pushPendingRecords,
    pushEvents,
};
