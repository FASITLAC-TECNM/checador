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
let isPushingIncidencias = false;
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

        // 🔥 FIX: Horario — el endpoint /mis-datos NO lo incluye, se obtiene por ruta
        // separada y se persiste en SQLite para uso offline
        try {
            const horarioUrl = `${API_URL}/empleados/${empleadoId}/horario`;
            console.log(`   🔄 [Sync] Cacheando horario desde ${horarioUrl}`);

            const horarioRes = await fetch(horarioUrl, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (horarioRes.ok) {
                const horarioData = await horarioRes.json();
                const horario = horarioData.data || horarioData.horario || horarioData;

                if (horario && horario.configuracion) {
                    await sqliteManager.upsertHorario(empleadoId, horario);
                    console.log(`   ✅ Horario cacheado en SQLite (id: ${horario.id || horario.horario_id})`);
                } else {
                    console.log(`   ⚠️ [Sync] Horario sin configuración válida, no se cachea`);
                }
            } else if (horarioRes.status === 404) {
                console.log(`   ℹ️ [Sync] Empleado sin horario asignado (404)`);
            } else {
                console.log(`   ⚠️ [Sync] No se pudo obtener horario (HTTP ${horarioRes.status})`);
            }
        } catch (horarioError) {
            // No es fatal — el resto del pull ya fue exitoso
            console.log(`   ⚠️ [Sync] Error cacheando horario: ${horarioError.message}`);
        }

        // Incidencias del empleado
        try {
            const incUrl = `${API_URL}/incidencias?empleado_id=${empleadoId}`;
            console.log(`   🔄 [Sync] Cacheando incidencias desde ${incUrl}`);

            const incRes = await fetch(incUrl, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (incRes.ok) {
                const incData = await incRes.json();
                const incidencias = incData.data || [];
                if (incidencias.length > 0) {
                    await sqliteManager.upsertIncidencias(empleadoId, incidencias);
                    console.log(`   ✅ ${incidencias.length} incidencias cacheadas`);
                } else {
                    console.log(`   ℹ️ [Sync] Sin incidencias para este empleado`);
                }
            } else {
                console.log(`   ⚠️ [Sync] No se pudieron obtener incidencias (HTTP ${incRes.status})`);
            }
        } catch (incError) {
            console.log(`   ⚠️ [Sync] Error cacheando incidencias: ${incError.message}`);
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
 * Helper para registrar eventos en el backend (POST /api/eventos)
 * Se usa para generar bitácora de acciones "Inicio de sesión", "Registro", etc.
 */
async function postEvent(titulo, tipo, descripcion, empleadoId, prioridad = 'media') {
    if (!authToken) return;
    try {
        console.log(`📝 [Sync] Creando evento: ${titulo} (${tipo}) para emp=${empleadoId}`);
        await fetch(`${API_URL}/eventos`, {
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
    } catch (e) {
        console.log(`⚠️ [Sync] No se pudo crear evento ${titulo}: ${e.message}`);
        // No lanzamos error para no detener el proceso de sync principal
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
                if (local) {
                    await sqliteManager.markAsSynced(local.local_id, s.id_servidor);

                    // ⭐ CREAR EVENTO DE SISTEMA
                    await postEvent(
                        `Registro de Asistencia (${local.tipo})`,
                        'ASISTENCIA',
                        `Registro de ${local.tipo} sincronizado desde móvil. Método: ${local.metodo_registro}`,
                        local.empleado_id,
                        'alta'
                    );
                }
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

                // ⭐ CREAR EVENTO DE SISTEMA
                // Buscamos info original para el título
                const original = pending.find(p => p.local_id === s.local_id);
                if (original && original.empleado_id) {
                    const titulo = original.tipo === 'login' ? 'Inicio de Sesión (Móvil)' : 'Cierre de Sesión (Móvil)';
                    const desc = `Sesión ${original.tipo} sincronizada. Modo: ${original.modo}`;
                    await postEvent(titulo, 'SISTEMA', desc, original.empleado_id, 'media');
                }
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

                    // ⭐ CREAR EVENTO DE SISTEMA
                    await postEvent(
                        `Nueva Incidencia (${inc.tipo})`,
                        'INCIDENCIA',
                        `Incidencia creada offline y sincronizada. Motivo: ${inc.motivo}`,
                        inc.empleado_id,
                        'media'
                    );

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

/**
 * Inicializa el monitor de red y sincronización automática
 */
export function initAutoSync() {
    console.log('🔄 [SyncManager] Iniciando servicio de autosincronización...');

    const syncAll = async () => {
        console.log('🔄 [SyncManager] Ejecutando SyncFull...');

        // 1. Enviar sesiones SIEMPRE primero
        await pushSessions().catch(e => console.log('Error pushSessions:', e.message));

        if (isPushing || isPulling) {
            console.log('🔄 [SyncManager] Push/Pull ya en curso, saltando asistencias y pull');
            return;
        }

        // 2. Enviar asistencias pendientes
        if (authToken) {
            await pushData().catch(e => console.log('Error pushData:', e.message));
        }

        // 2.5 Enviar incidencias offline pendientes
        if (authToken) {
            await pushIncidencias().catch(e => console.log('Error pushIncidencias:', e.message));
        }

        // 3. Traer datos nuevos (incluye horario e incidencias)
        if (authToken && storedEmpleadoId) {
            await pullData(storedEmpleadoId).catch(e => console.log('Error pullData:', e.message));
        }
    };

    // Verificación inicial inmediata
    NetInfo.fetch().then(state => {
        if (state.isConnected && state.isInternetReachable) {
            console.log('✅ [SyncManager] Red detectada al inicio. Sincronizando ahora...');
            setTimeout(() => syncAll(), 2000);
        }
    });

    // Suscripción a cambios de red
    const unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && state.isInternetReachable) {
            console.log('✅ [SyncManager] Conexión recuperada. Sincronizando...');
            syncAll();
        }
    });

    // Intervalo de seguridad (cada 2 min)
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
    pushIncidencias,
    initAutoSync,
    isOnline
};