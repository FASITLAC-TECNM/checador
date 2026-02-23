/**
 * SyncManager — Orquestador de sincronización bidireccional (Mobile)
 * Gestiona el ciclo Pull → Push → Sessions → Incidencias → Events
 * Archivo .mjs — ES Module
 *
 * Adaptado de Desktop/syncManager.mjs para React Native/Expo
 * Usa NetInfo para detectar conectividad (en lugar de BrowserWindow en Desktop)
 */

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import sqliteManager from './sqliteManager.mjs';
import pullService from './pullService.mjs';
import pushService from './pushService.mjs';
import { detectarCambiosIncidencias, detectarAvisosNuevos } from '../localNotificationService';
import { getApiEndpoint } from '../../config/api.js';

// Estado interno
let authToken = null;
let storedEmpleadoId = null;
let isPushingSessions = false;
let isPushingIncidencias = false;
let isSyncing = false;

const API_URL = getApiEndpoint('/api');
const CLEANUP_KEY = '@sqlite_last_cleanup';

/**
 * Ejecuta la limpieza de registros sincronizados UNA VEZ POR DÍA.
 * Usa AsyncStorage para recordar cuándo fue la última limpieza.
 */
async function cleanupDiario() {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        const ultima = await AsyncStorage.getItem(CLEANUP_KEY);
        if (ultima === hoy) return; // Ya se limpió hoy

        await sqliteManager.cleanupSyncedRecords(7);
        await AsyncStorage.setItem(CLEANUP_KEY, hoy);
    } catch (e) {
        // No crítico — si falla no interrumpe el sync
    }
}

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
    // Android: isInternetReachable can be null initially. If connected to wifi/cell, assume online.
    return state.isConnected && (state.isInternetReachable === true || state.isInternetReachable === null);
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

                // Crear evento de sistema para la sesión (Login/Logout)
                // Buscar datos originales en pendiente porque el servidor puede no devolver todo
                const original = pending.find(p => p.local_id === s.local_id);
                const tipo = original ? original.tipo : s.tipo;
                const empleadoId = original ? original.empleado_id : s.empleado_id;
                const modo = original ? original.modo : s.modo;

                // REGLA DE NEGOCIO: Solo registrar eventos de LOGIN en la bitácora
                if (tipo === 'login') {
                    const isOffline = modo === 'offline';
                    let nombreEmpleado = 'Usuario';

                    try {
                        if (empleadoId) {
                            const emp = await sqliteManager.getEmpleado(empleadoId);
                            if (emp && emp.nombre) nombreEmpleado = emp.nombre;
                        }
                    } catch (e) {
                        // No crítico
                    }

                    // Formato solicitado: "Inicio de sesión" y "[Nombre] inicio sesión"
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
                // Eliminado else block para logout, ya no se registran.
            }
        }

        if (result.errores && result.errores.length > 0) {
            for (const e of result.errores) {
                await sqliteManager.markSessionSyncError(e.local_id, e.error);
            }
        }

        await pushService.pushEvents().catch(() => { });

        // Si enviamos 50, podría haber más. Retornamos count para que el caller decida si llamar de nuevo.
        return { success: true, count: result.sincronizados?.length };

    } catch (error) {
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
    if (isPushingIncidencias) {
        return { success: false, busy: true };
    }

    // 🔒 BLOQUEO INMEDIATO para evitar condiciones de carrera si se llama múltiples veces rápido
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
        const processedIds = new Set(); // Evitar procesar duplicados en el mismo ciclo

        for (const inc of pending) {
            // Safety check por si la query trajo duplicados o paso algo raro
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
        isPushingIncidencias = false; // Liberar lock
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
        return;
    }

    const online = await isOnline();
    if (!online && reason !== 'initial') {
        return;
    }

    isSyncing = true;

    try {
        // 0. Limpieza diaria de registros sincronizados (no-op si ya se hizo hoy)
        await cleanupDiario();

        // 1. Enviar sesiones SIEMPRE primero
        await pushSessions().catch(() => { });

        // 2. Enviar asistencias pendientes
        if (authToken) {
            await pushData().catch(() => { });
        }

        // 3. Enviar incidencias offline pendientes
        if (authToken) {
            await pushIncidencias().catch(() => { });
        }

        // 4. Enviar eventos offline pendientes
        if (authToken) {
            await pushService.pushEvents().catch(() => { });
        }

        // 5. Traer datos nuevos (pull)
        if (authToken && storedEmpleadoId) {
            const pullRes = await pullData(storedEmpleadoId).catch(() => null);

            // Si hubo éxito en incidencias, verificar cambios para notificar
            if (pullRes && pullRes.incidencias && pullRes.incidencias.success && pullRes.incidencias.data) {
                detectarCambiosIncidencias(pullRes.incidencias.data);
            }

            // Si hubo éxito en avisos, verificar nuevos para notificar
            if (pullRes && pullRes.avisos && pullRes.avisos.success && pullRes.avisos.data) {
                detectarAvisosNuevos(pullRes.avisos.data);
            }
        }

    } catch (error) {
        // Silencio en producción
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
    // Verificación inicial inmediata
    NetInfo.fetch().then(state => {
        if (state.isConnected && state.isInternetReachable) {
            setTimeout(() => performSync('initial'), 2000);
        }
    });

    // Suscripción a cambios de red (patrón Desktop: reconexión → sync)
    // Se usa DEBOUNCE para evitar múltiples llamadas simultáneas si la red parpadea
    let syncDebounceTimer = null;

    const unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && state.isInternetReachable) {
            if (syncDebounceTimer) clearTimeout(syncDebounceTimer);

            syncDebounceTimer = setTimeout(() => {
                performSync('reconnect');
                syncDebounceTimer = null;
            }, 2000);
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
