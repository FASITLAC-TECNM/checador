/**
 * PullService — Descarga datos del servidor al caché local SQLite (Mobile)
 * Usa endpoints dedicados para móvil: /api/movil/sync/
 * Archivo .mjs — ES Module
 *
 * Adaptado de Desktop/pullService.mjs para React Native/Expo
 */

import sqliteManager from './sqliteManager.mjs';

// Configuración — se inyecta desde SyncManager
let apiBaseUrl = '';
let authToken = '';

/**
 * Configura la URL base y token para las peticiones
 */
export function configure(baseUrl, token) {
    if (baseUrl !== undefined && baseUrl !== null) {
        apiBaseUrl = baseUrl;
    }
    if (token !== undefined) {
        authToken = token || '';
    }
    // console.log('🔧 [Pull] Configurado: URL=', apiBaseUrl ? apiBaseUrl.substring(0, 40) + '...' : '(vacío!)');
}

/**
 * Helper para hacer fetch con timeout y autenticación (React Native fetch)
 */
async function apiFetch(endpoint, options = {}) {
    if (!apiBaseUrl) {
        throw new Error(`URL base no configurada. No se puede hacer fetch de ${endpoint}`);
    }

    const fullUrl = `${apiBaseUrl}${endpoint}`;
    const timeoutMs = options.timeoutMs || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(fullUrl, {
            method: options.method || 'GET',
            headers,
            body: options.body || undefined,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`HTTP ${response.status}: ${txt}`);
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Timeout de conexión');
        }
        throw error;
    }
}

// ============================================================
// PULL COMPLETO — DATOS DEL EMPLEADO LOGUEADO
// ============================================================

/**
 * Ejecuta un Pull completo de datos del empleado logueado.
 * Endpoint principal: GET /api/movil/sync/mis-datos?empleado_id=XX
 * Endpoints adicionales: horario, incidencias
 *
 * @param {string} empleadoId - ID del empleado logueado
 * @returns {Object} resumen del sync
 */
export async function fullPull(empleadoId) {
    if (!empleadoId) {
        console.warn('⚠️ [Pull] empleadoId requerido para fullPull');
        return { success: false, error: 'empleadoId requerido' };
    }

    if (!authToken) {
        console.warn('⚠️ [Pull] Sin token de autenticación, omitiendo Pull...');
        return { success: false, error: 'Sin token' };
    }

    console.log(`🔄 [Pull] Iniciando Pull completo para empleado: "${empleadoId}"`);
    const startTime = Date.now();

    const results = {
        empleado: { success: false, count: 0 },
        credenciales: { success: false, count: 0 },
        tolerancia: { success: false, count: 0 },
        departamentos: { success: false, count: 0 },
        horario: { success: false, count: 0 },
        incidencias: { success: false, count: 0 },
        duration: 0,
    };

    try {
        // ========== DATOS PRINCIPALES (una sola llamada) ==========
        const data = await apiFetch(`/movil/sync/mis-datos?empleado_id=${empleadoId}`);

        if (!data.success) {
            throw new Error(data.error || 'Respuesta no exitosa');
        }

        // ========== EMPLEADO ==========
        try {
            if (data.empleado) {
                await sqliteManager.upsertEmpleados([data.empleado]);

                // Marcar empleados eliminados (patrón Desktop)
                const serverIds = [data.empleado.empleado_id || data.empleado.id];
                // Nota: En mobile solo cacheamos al empleado logueado, no hay marcado masivo
                // pero dejamos la función disponible por si se usa multiusuario

                await sqliteManager.setLastFullSync('cache_empleados');
                results.empleado = { success: true, count: 1 };
                // console.log(`   ✅ Empleado: ${data.empleado.nombre}`);
            }
        } catch (empError) {
            console.error('❌ [Pull] Error procesando empleado:', empError.message);
            results.empleado = { success: false, error: empError.message };
        }

        // ========== CREDENCIALES ==========
        try {
            if (data.credencial) {
                const cred = {
                    id: data.credencial.id,
                    empleado_id: data.credencial.empleado_id,
                    pin_hash: data.credencial.pin,
                    dactilar_template: data.credencial.dactilar,
                    facial_descriptor: data.credencial.facial
                };
                await sqliteManager.upsertCredenciales([cred]);
                await sqliteManager.setLastFullSync('cache_credenciales');
                results.credenciales = { success: true, count: 1 };
                // console.log(`   ✅ Credenciales cargadas`);
            }
        } catch (credError) {
            console.error('❌ [Pull] Error procesando credenciales:', credError.message);
            results.credenciales = { success: false, error: credError.message };
        }

        // ========== TOLERANCIA ==========
        try {
            if (data.tolerancia) {
                await sqliteManager.upsertTolerancia(empleadoId, data.tolerancia);
                await sqliteManager.setLastFullSync('cache_tolerancias');
                results.tolerancia = { success: true, count: 1 };
                // console.log(`   ✅ Tolerancia: ${data.tolerancia.nombre}`);
            }
        } catch (tolError) {
            console.error('❌ [Pull] Error procesando tolerancia:', tolError.message);
            results.tolerancia = { success: false, error: tolError.message };
        }

        // ========== DEPARTAMENTOS ==========
        try {
            if (data.departamentos && data.departamentos.length > 0) {
                const deptos = data.departamentos.map(d => ({
                    id: d.departamento_id,
                    departamento_id: d.departamento_id,
                    es_activo: d.es_activo,
                    nombre: d.nombre,
                    ubicacion: d.ubicacion
                        ? (typeof d.ubicacion === 'string' ? d.ubicacion : JSON.stringify(d.ubicacion))
                        : null,
                    latitud: d.latitud,
                    longitud: d.longitud,
                    radio: d.radio
                }));
                await sqliteManager.upsertDepartamentos(empleadoId, deptos);
                await sqliteManager.setLastFullSync('cache_departamentos');
                results.departamentos = { success: true, count: deptos.length };
                // console.log(`   ✅ Departamentos: ${deptos.length}`);
            }
        } catch (deptError) {
            console.error('❌ [Pull] Error procesando departamentos:', deptError.message);
            results.departamentos = { success: false, error: deptError.message };
        }

        // ========== HORARIO (endpoint separado) ==========
        try {
            const horarioUrl = `/empleados/${empleadoId}/horario`;
            console.log(`   🔄 [Pull] Cacheando horario desde API${horarioUrl}`);

            const horarioData = await apiFetch(horarioUrl).catch(() => null);

            if (horarioData) {
                const horario = horarioData.data || horarioData.horario || horarioData;

                if (horario && horario.configuracion) {
                    await sqliteManager.upsertHorario(empleadoId, horario);
                    await sqliteManager.setLastFullSync('cache_horarios');
                    results.horario = { success: true, count: 1 };
                    // console.log(`   ✅ Horario cacheado en SQLite (id: ${horario.id || horario.horario_id})`);
                } else {
                    console.log(`   ⚠️ [Pull] Horario sin configuración válida, no se cachea`);
                    results.horario = { success: true, count: 0 };
                }
            } else {
                console.log(`   ℹ️ [Pull] Empleado sin horario asignado`);
                results.horario = { success: true, count: 0 };
            }
        } catch (horError) {
            console.log(`   ⚠️ [Pull] Error cacheando horario: ${horError.message}`);
            results.horario = { success: false, error: horError.message };
        }

        // ========== INCIDENCIAS ==========
        try {
            const incUrl = `/incidencias?empleado_id=${empleadoId}`;
            console.log(`   🔄 [Pull] Cacheando incidencias...`);

            const incData = await apiFetch(incUrl).catch(() => null);

            if (incData) {
                const incidencias = incData.data || [];
                if (incidencias.length > 0) {
                    await sqliteManager.upsertIncidencias(empleadoId, incidencias);
                    results.incidencias = { success: true, count: incidencias.length };
                    // console.log(`   ✅ ${incidencias.length} incidencias cacheadas`);
                } else {
                    console.log(`   ℹ️ [Pull] Sin incidencias para este empleado`);
                    results.incidencias = { success: true, count: 0 };
                }
            }
        } catch (incError) {
            console.log(`   ⚠️ [Pull] Error cacheando incidencias: ${incError.message}`);
            results.incidencias = { success: false, error: incError.message };
        }

    } catch (error) {
        console.error('❌ [Pull] Error en Pull completo:', error.message);
    }

    results.duration = Date.now() - startTime;
    const allSuccess = results.empleado.success && results.credenciales.success;
    console.log(`${allSuccess ? '✅' : '⚠️'} [Pull] Pull completo finalizado en ${results.duration}ms`);

    return { success: allSuccess, ...results };
}

export default {
    configure,
    fullPull,
};
