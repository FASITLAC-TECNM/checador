/**
 * SyncManager — Orquestador de sincronización bidireccional (Mobile)
 * Gestiona el ciclo Pull → Push → Sessions → Incidencias → Events
 * Archivo .mjs — ES Module
 *
 * Adaptado de Desktop/syncManager.mjs para React Native/Expo
 * Usa NetInfo para detectar conectividad (en lugar de BrowserWindow en Desktop)
 */

import NetInfo from '@react-native-community/netinfo';
import sqliteManager from './sqliteManager.mjs';
import pullService from './pullService.mjs';
import pushService from './pushService.mjs';
import { getApiEndpoint } from '../../config/api.js';

// Estado interno
let authToken = null;
let storedEmpleadoId = null;
let isPushingSessions = false;
let isPushingIncidencias = false;
let isSyncing = false;

const API_URL = getApiEndpoint('/api');

/**
 * Configura el token de autenticación y el empleado ID
 */
export function setAuthToken(token, empleadoId = null) {
    authToken = token;
    if (empleadoId) storedEmpleadoId = empleadoId;

    // Propagar token a los servicios
    pullService.configure(API_URL, token);
    pushService.configure(API_URL, token);
}

/**
 * Verifica estado de red
 */
export async function isOnline() {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
}

// ============================================================
// PULL — Delegado a pullService
// ============================================================

/**
 * Realiza un Pull de datos del empleado logueado
 * @param {string} empleadoId - ID del empleado logueado
 */
export async function pullData(empleadoId = null) {
    const empId = empleadoId || storedEmpleadoId;
    if (!empId) return { success: false, error: 'empleadoId requerido' };
    if (!authToken) return { success: false, error: 'No hay token' };

    const online = await isOnline();
    if (!online) return { success: false, error: 'Sin conexión' };

    return await pullService.fullPull(empId);
}

// ============================================================
// PUSH — Delegado a pushService
// ============================================================

/**
 * Push de asistencias pendientes
 */
export async function pushData() {
    if (!authToken) return { success: false, error: 'No token' };

    const online = await isOnline();
    if (!online) return { success: false, error: 'Offline' };

    return await pushService.pushPendingRecords();
}

// ============================================================
// PUSH SESSIONS — Mantenido del original Mobile
// ============================================================

/**
 * Push de sesiones offline pendientes
 * Endpoint: POST /api/movil/sync/sesiones
 */
export async function pushSessions() {
    if (isPushingSessions) {
        console.log('📤 [Sync] pushSessions ya en curso, saltando...');
        return { success: false, busy: true };
    }
    isPushingSessions = true;
    console.log('📤 [Sync] === PUSH SESSIONS INICIO ===');

    if (!authToken) {
        console.log('📤 [Sync] ⚠️ Sin token de autenticación, sesiones se enviarán cuando haya token.');
        isPushingSessions = false;
        return { success: false, error: 'No hay token' };
    }

    const online = await isOnline();
    console.log(`📤 [Sync] Online: ${online}`);
    if (!online) { isPushingSessions = false; return { success: false, error: 'Offline' }; }

    try {
        const pending = await sqliteManager.getPendingSessions(50);
        console.log(`📤 [Sync] Sesiones pendientes encontradas: ${pending.length}`);

        if (pending.length === 0) {
            console.log('📤 [Sync] No hay sesiones pendientes. Nada que enviar.');
            return { success: true, count: 0 };
        }

        pending.forEach((s, i) => {
            console.log(`📤 [Sync] Sesión ${i + 1}: local_id=${s.local_id}, usuario=${s.usuario_id}, empleado=${s.empleado_id}, tipo=${s.tipo}, modo=${s.modo}, fecha=${s.fecha_evento}, is_synced=${s.is_synced}`);
        });

        const sesiones = pending.map(s => ({
            local_id: s.local_id,
            usuario_id: s.usuario_id,
            empleado_id: s.empleado_id,
            tipo: s.tipo,
            modo: s.modo,
            fecha_evento: s.fecha_evento,
            dispositivo: s.dispositivo || 'movil'
        }));

        const url = `${API_URL}/movil/sync/sesiones`;
        console.log(`📤 [Sync] POST ${url}`);

        const headers = {
            'Content-Type': 'application/json'
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ sesiones })
        });

        console.log(`📤 [Sync] Response status: ${response.status}`);

        if (!response.ok) {
            const errorTxt = await response.text();
            console.error(`📤 [Sync] ❌ Error del servidor: ${errorTxt}`);
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log(`📤 [Sync] Response body: ${JSON.stringify(result)}`);

        if (result.sincronizados) {
            for (const s of result.sincronizados) {
                console.log(`📤 [Sync] ✅ Marcando local_id=${s.local_id} como synced`);
                await sqliteManager.markSessionSynced(s.local_id);
            }
        }

        if (result.errores && result.errores.length > 0) {
            for (const e of result.errores) {
                console.error(`📤 [Sync] ❌ Error para local_id=${e.local_id}: ${e.error}`);
                await sqliteManager.markSessionSyncError(e.local_id, e.error);
            }
        }

        console.log(`📤 [Sync] === PUSH SESSIONS FIN: ${result.sincronizados?.length || 0} OK, ${result.errores?.length || 0} errores ===`);
        return { success: true, count: result.sincronizados?.length };

    } catch (error) {
        console.error(`📤 [Sync] ❌ Error en pushSessions: ${error.message}`);
        return { success: false, error: error.message };
    } finally {
        isPushingSessions = false;
    }
}

// ============================================================
// PUSH INCIDENCIAS — Mantenido del original Mobile
// ============================================================

/**
 * Push de incidencias offline pendientes
 * Endpoint: POST /api/incidencias
 */
export async function pushIncidencias() {
    if (isPushingIncidencias) return { success: false, busy: true };
    if (!authToken) return { success: false, error: 'No token' };

    const online = await isOnline();
    if (!online) return { success: false, error: 'Offline' };

    isPushingIncidencias = true;
    console.log('📤 [Sync] === PUSH INCIDENCIAS INICIO ===');

    try {
        const pending = await sqliteManager.getPendingIncidencias(50);
        if (pending.length === 0) {
            console.log('📤 [Sync] No hay incidencias pendientes.');
            return { success: true, count: 0 };
        }

        console.log(`📤 [Sync] ${pending.length} incidencias pendientes de enviar`);
        let sincronizadas = 0;

        for (const inc of pending) {
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
                    console.log(`📤 [Sync] ✅ Incidencia local_id=${inc.local_id} sincronizada (server_id=${serverId})`);
                } else {
                    const errText = await response.text();
                    await sqliteManager.markIncidenciaSyncError(inc.local_id, `HTTP ${response.status}: ${errText}`);
                    console.log(`📤 [Sync] ❌ Error incidencia local_id=${inc.local_id}: HTTP ${response.status}`);
                }
            } catch (e) {
                await sqliteManager.markIncidenciaSyncError(inc.local_id, e.message);
                console.log(`📤 [Sync] ❌ Error red incidencia local_id=${inc.local_id}: ${e.message}`);
            }
        }

        console.log(`📤 [Sync] === PUSH INCIDENCIAS FIN: ${sincronizadas}/${pending.length} OK ===`);
        return { success: true, count: sincronizadas };

    } catch (error) {
        console.error(`📤 [Sync] ❌ Error en pushIncidencias: ${error.message}`);
        return { success: false, error: error.message };
    } finally {
        isPushingIncidencias = false;
    }
}

// ============================================================
// SYNC COMPLETO — Orquestador (patrón Desktop)
// ============================================================

/**
 * Ejecuta un ciclo completo de sincronización (Push Sessions → Push → Push Incidencias → Push Events → Pull)
 * @param {string} reason - motivo del sync
 */
export async function performSync(reason = 'manual') {
    if (isSyncing) {
        console.log('⏳ [SyncManager] Sync ya en curso, omitiendo...');
        return;
    }

    const online = await isOnline();
    if (!online && reason !== 'initial') {
        console.log('🔌 [SyncManager] Sin conexión, omitiendo sync');
        return;
    }

    isSyncing = true;
    console.log(`🔄 [SyncManager] Iniciando sync completo (${reason})...`);

    try {
        // 1. Enviar sesiones SIEMPRE primero
        await pushSessions().catch(e => console.log('Error pushSessions:', e.message));

        // 2. Enviar asistencias pendientes
        if (authToken) {
            await pushData().catch(e => console.log('Error pushData:', e.message));
        }

        // 3. Enviar incidencias offline pendientes
        if (authToken) {
            await pushIncidencias().catch(e => console.log('Error pushIncidencias:', e.message));
        }

        // 4. Enviar eventos offline pendientes
        if (authToken) {
            await pushService.pushEvents().catch(e => console.log('Error pushEvents:', e.message));
        }

        // 5. Traer datos nuevos (pull)
        if (authToken && storedEmpleadoId) {
            await pullData(storedEmpleadoId).catch(e => console.log('Error pullData:', e.message));
        }

        console.log(`✅ [SyncManager] Sync completo (${reason}) finalizado`);
    } catch (error) {
        console.error(`❌ [SyncManager] Error en sync (${reason}):`, error.message);
    } finally {
        isSyncing = false;
    }
}

// ============================================================
// AUTO-SYNC — Monitor de red con NetInfo
// ============================================================

/**
 * Inicializa el monitor de red y sincronización automática
 */
export function initAutoSync() {
    console.log('🔄 [SyncManager] Iniciando servicio de autosincronización...');

    // Verificación inicial inmediata
    NetInfo.fetch().then(state => {
        if (state.isConnected && state.isInternetReachable) {
            console.log('✅ [SyncManager] Red detectada al inicio. Sincronizando ahora...');
            setTimeout(() => performSync('initial'), 2000);
        }
    });

    // Suscripción a cambios de red (patrón Desktop: reconexión → sync)
    const unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && state.isInternetReachable) {
            console.log('✅ [SyncManager] Conexión recuperada. Sincronizando...');
            performSync('reconnect');
        }
    });

    // Intervalo de seguridad (cada 2 min, como el original)
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
    isOnline
};
