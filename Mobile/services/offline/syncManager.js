/**
 * SyncManager — Gestor de sincronización Offline/Online (Mobile)
 * Usa endpoints dedicados para móvil: /api/movil/sync/
 */

import NetInfo from '@react-native-community/netinfo';
import sqliteManager from './sqliteManager';
import { getApiEndpoint } from '../../config/api';

// Estado interno
let isPushing = false;
let isPulling = false;
let isPushingSessions = false;
let authToken = null;
let storedEmpleadoId = null;

const API_URL = getApiEndpoint('/api');

/**
 * Configura el token de autenticación
 */
export function setAuthToken(token, empleadoId = null) {
    authToken = token;
    if (empleadoId) storedEmpleadoId = empleadoId;
}

/**
 * Verifica estado de red
 */
export async function isOnline() {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
}

/**
 * Realiza un Pull de datos del empleado logueado
 * Endpoint: GET /api/movil/sync/mis-datos?empleado_id=XX
 * Retorna: empleado, credencial, tolerancia, departamentos (sin horarios)
 * @param {string} empleadoId - ID del empleado logueado
 */
export async function pullData(empleadoId = null) {
    if (isPulling) return { success: false, error: 'Pull en progreso' };
    if (!authToken) return { success: false, error: 'No hay token' };
    if (!empleadoId) return { success: false, error: 'empleadoId requerido' };

    const online = await isOnline();
    if (!online) return { success: false, error: 'Sin conexión' };

    isPulling = true;
    console.log(`🔄 [Sync] Pull de datos para empleado: "${empleadoId}" (tipo: ${typeof empleadoId})`);
    console.log(`🔑 [Sync] Token disponible: ${authToken ? 'Sí (' + authToken.substring(0, 20) + '...)' : 'NO'}`);

    try {
        const url = `${API_URL}/movil/sync/mis-datos?empleado_id=${empleadoId}`;
        console.log(`🔌 [Sync] GET ${url}`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📡 [Sync] Response status: ${response.status}`);

        if (!response.ok) {
            const txt = await response.text();
            console.error(`❌ [Sync] Error completo del servidor: ${txt}`);
            console.error(`❌ [Sync] empleado_id enviado: "${empleadoId}"`);
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Respuesta no exitosa');
        }

        // ====== PROCESAR DATOS ======

        // Empleado
        if (data.empleado) {
            await sqliteManager.upsertEmpleados([data.empleado]);
            console.log(`   ✅ Empleado: ${data.empleado.nombre}`);
        }

        // Credenciales
        if (data.credencial) {
            const cred = {
                id: data.credencial.id,
                empleado_id: data.credencial.empleado_id,
                pin_hash: data.credencial.pin,
                dactilar_template: data.credencial.dactilar,
                facial_descriptor: data.credencial.facial
            };
            await sqliteManager.upsertCredenciales([cred]);
            console.log(`   ✅ Credenciales cargadas`);
        }

        // Tolerancia
        if (data.tolerancia) {
            await sqliteManager.upsertTolerancia(empleadoId, data.tolerancia);
            console.log(`   ✅ Tolerancia: ${data.tolerancia.nombre}`);
        }

        // Departamentos
        if (data.departamentos && data.departamentos.length > 0) {
            const deptos = data.departamentos.map(d => ({
                id: d.departamento_id,
                departamento_id: d.departamento_id,
                es_activo: d.es_activo,
                nombre: d.nombre,
                // ⭐ Persistir ubicacion (polígono de zona) para geofencing offline
                ubicacion: d.ubicacion
                    ? (typeof d.ubicacion === 'string' ? d.ubicacion : JSON.stringify(d.ubicacion))
                    : null,
                latitud: d.latitud,
                longitud: d.longitud,
                radio: d.radio
            }));
            await sqliteManager.upsertDepartamentos(empleadoId, deptos);
            console.log(`   ✅ Departamentos: ${deptos.length}`);
        }

        console.log('✅ [Sync] Pull completado.');
        return { success: true };

    } catch (error) {
        console.error('❌ [Sync] Error en Pull:', error);
        return { success: false, error: error.message };
    } finally {
        isPulling = false;
    }
}

/**
 * Push de asistencias pendientes
 * Endpoint: POST /api/movil/sync/asistencias
 */
export async function pushData() {
    if (isPushing) return { success: false, busy: true };
    if (!authToken) return { success: false, error: 'No token' };

    const online = await isOnline();
    if (!online) return { success: false, error: 'Offline' };

    try {
        const pending = await sqliteManager.getPendingAsistencias(50);
        if (pending.length === 0) return { success: true, count: 0 };

        isPushing = true;
        console.log(`⬆️ [Sync] Subiendo ${pending.length} registros...`);

        const registros = pending.map(r => ({
            id: r.idempotency_key,
            empleado_id: r.empleado_id,
            tipo: r.tipo,
            estado: r.estado,
            clasificacion: r.estado,
            departamento_id: r.departamento_id,
            metodo_registro: r.metodo_registro,
            dispositivo_origen: r.dispositivo_origen || 'movil',
            fecha_registro: new Date(r.fecha_registro).getTime(),
        }));

        const response = await fetch(`${API_URL}/movil/sync/asistencias`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ registros })
        });

        if (!response.ok) {
            const errText = await response.text();
            for (const p of pending) {
                await sqliteManager.markSyncError(p.local_id, `HTTP ${response.status}: ${errText}`);
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.sincronizados) {
            for (const s of result.sincronizados) {
                const local = pending.find(p => p.idempotency_key === s.id_local);
                if (local) await sqliteManager.markAsSynced(local.local_id, s.id_servidor);
            }
        }

        if (result.rechazados) {
            for (const r of result.rechazados) {
                const local = pending.find(p => p.idempotency_key === r.id_local);
                if (local) {
                    const definitivo = ['CAMPOS_FALTANTES', 'EMPLEADO_NO_EXISTE', 'DUPLICADO'].includes(r.codigo);
                    await sqliteManager.markSyncError(local.local_id, r.error, definitivo);
                }
            }
        }

        console.log(`✅ [Sync] Push: ${result.sincronizados?.length || 0} OK, ${result.rechazados?.length || 0} Error`);
        return { success: true, count: result.sincronizados?.length };

    } catch (error) {
        console.error('❌ [Sync] Error en Push:', error);
        return { success: false, error: error.message };
    } finally {
        isPushing = false;
    }
}

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
    // El endpoint /api/movil/sync/sesiones REQUIERE autenticación
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

        // Mostrar cada sesión pendiente
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
        console.log(`📤 [Sync] Body: ${JSON.stringify({ sesiones }, null, 2)}`);

        const headers = {
            'Content-Type': 'application/json'
        };
        // Agregar token si está disponible (no es obligatorio para este endpoint)
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


/**
 * Inicializa el monitor de red para auto-push
 */
/**
 * Inicializa el monitor de red y sincronización automática
 */
export function initAutoSync() {
    console.log('🔄 [SyncManager] Iniciando servicio de autosincronización...');

    const syncAll = async () => {
        console.log('🔄 [SyncManager] Ejecutando SyncFull...');

        // 1. Enviar sesiones SIEMPRE primero (no requiere token ni guard)
        await pushSessions().catch(e => console.log('Error pushSessions:', e.message));

        // 2-3: Solo si hay token y no hay otra sync en curso
        if (isPushing || isPulling) {
            console.log('🔄 [SyncManager] Push/Pull ya en curso, saltando asistencias y pull');
            return;
        }

        // 2. Enviar asistencias pendientes (requiere token)
        if (authToken) {
            await pushData().catch(e => console.log('Error pushData:', e.message));
        }

        // 3. Traer datos nuevos (si hay token)
        if (authToken && storedEmpleadoId) {
            await pullData(storedEmpleadoId).catch(e => console.log('Error pullData:', e.message));
        }
    };

    // 1. Verificación inicial inmediata
    NetInfo.fetch().then(state => {
        if (state.isConnected && state.isInternetReachable) {
            console.log('✅ [SyncManager] Red detectada al inicio. Sincronizando ahora...');
            setTimeout(() => syncAll(), 2000);
        }
    });

    // 2. Suscripción a cambios de red
    const unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && state.isInternetReachable) {
            console.log('✅ [SyncManager] Conexión recuperada. Sincronizando...');
            syncAll();
        }
    });

    // 3. Intervalo de seguridad (cada 2 min intenta si hay red)
    setInterval(async () => {
        const state = await NetInfo.fetch();
        if (state.isConnected && state.isInternetReachable) {
            syncAll();
        }
    }, 120000);

    return unsubscribe;
}

export default {
    setAuthToken,
    pullData,
    pushData,
    pushSessions,
    initAutoSync,
    isOnline
};
