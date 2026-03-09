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
        return { success: false, error: 'empleadoId requerido' };
    }

    if (!authToken) {
        return { success: false, error: 'Sin token' };
    }

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
                await sqliteManager.setLastFullSync('cache_empleados');
                results.empleado = { success: true, count: 1 };
            }
        } catch (empError) {
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
            }
        } catch (credError) {
            results.credenciales = { success: false, error: credError.message };
        }

        // ========== TOLERANCIA ==========
        // Incluye campos nuevos: minutos_retardo_a_max, minutos_retardo_b_max,
        // equivalencia_retardo_a, equivalencia_retardo_b, dias_aplica
        try {
            if (data.tolerancia) {
                // IMPORTANTE: Solo usamos defaults para campos que el servidor puede omitir.
                // minutos_anticipado_max NO tiene default — debe venir del servidor tal cual.
                // Si el servidor devuelve null/undefined para ese campo, se guarda 0 (sin anticipo).
                const toleranciaCompleta = {
                    minutos_retardo: data.tolerancia.minutos_retardo ?? 10,
                    minutos_falta: data.tolerancia.minutos_falta ?? 30,
                    minutos_retardo_a_max: data.tolerancia.minutos_retardo_a_max ?? 20,
                    minutos_retardo_b_max: data.tolerancia.minutos_retardo_b_max ?? 29,
                    equivalencia_retardo_a: data.tolerancia.equivalencia_retardo_a ?? 10,
                    equivalencia_retardo_b: data.tolerancia.equivalencia_retardo_b ?? 5,
                    permite_registro_anticipado: data.tolerancia.permite_registro_anticipado ?? true,
                    minutos_anticipado_max: data.tolerancia.minutos_anticipado_max ?? 0,
                    minutos_anticipo_salida: data.tolerancia.minutos_anticipo_salida ?? 0,
                    minutos_posterior_salida: data.tolerancia.minutos_posterior_salida ?? 0,
                    aplica_tolerancia_entrada: data.tolerancia.aplica_tolerancia_entrada ?? true,
                    aplica_tolerancia_salida: data.tolerancia.aplica_tolerancia_salida ?? false,
                    reglas: data.tolerancia.reglas ?? [],
                    dias_aplica: data.tolerancia.dias_aplica ?? {},
                    ...data.tolerancia, // los campos del servidor siempre tienen prioridad
                };
                await sqliteManager.upsertTolerancia(empleadoId, toleranciaCompleta);
                await sqliteManager.setLastFullSync('cache_tolerancias');
                results.tolerancia = { success: true, count: 1 };
            }
        } catch (tolError) {
            results.tolerancia = { success: false, error: tolError.message };
        }

        // ========== DEPARTAMENTOS ==========
        // El backend mete las coordenadas dentro del campo JSON 'ubicacion'.
        // Se extrae latitud/longitud/radio de ese objeto para el geofencing offline.
        try {
            if (data.departamentos && data.departamentos.length > 0) {
                const deptos = data.departamentos.map(d => {
                    // Extraer coordenadas del campo ubicacion (JSON o string)
                    let lat = null, lng = null, radio = null;
                    if (d.ubicacion) {
                        const ub = typeof d.ubicacion === 'string'
                            ? (() => { try { return JSON.parse(d.ubicacion); } catch { return {}; } })()
                            : d.ubicacion;
                        lat = ub.latitud ?? ub.lat ?? null;
                        lng = ub.longitud ?? ub.lng ?? null;
                        radio = ub.radio ?? null;
                    }

                    return {
                        id: d.departamento_id,
                        departamento_id: d.departamento_id,
                        es_activo: d.es_activo,
                        nombre: d.nombre,
                        // Guardar ubicacion raw para otros usos
                        ubicacion: d.ubicacion
                            ? (typeof d.ubicacion === 'string' ? d.ubicacion : JSON.stringify(d.ubicacion))
                            : null,
                        // Coordenadas aplanadas para el geofencing offline
                        latitud: lat,
                        longitud: lng,
                        radio: radio,
                    };
                });
                await sqliteManager.upsertDepartamentos(empleadoId, deptos);
                await sqliteManager.setLastFullSync('cache_departamentos');
                results.departamentos = { success: true, count: deptos.length };
            }
        } catch (deptError) {
            results.departamentos = { success: false, error: deptError.message };
        }

        // ========== HORARIO (endpoint separado) ==========
        try {
            const horarioUrl = `/empleados/${empleadoId}/horario`;
            const horarioData = await apiFetch(horarioUrl).catch(() => null);

            if (horarioData) {
                const horario = horarioData.data || horarioData.horario || horarioData;

                if (horario && horario.configuracion) {
                    await sqliteManager.upsertHorario(empleadoId, horario);
                    await sqliteManager.setLastFullSync('cache_horarios');
                    results.horario = { success: true, count: 1 };
                } else {
                    results.horario = { success: true, count: 0 };
                }
            } else {
                results.horario = { success: true, count: 0 };
            }
        } catch (horError) {
            results.horario = { success: false, error: horError.message };
        }

        // ========== INCIDENCIAS ==========
        try {
            const incUrl = `/incidencias?empleado_id=${empleadoId}`;
            const incData = await apiFetch(incUrl).catch(() => null);

            if (incData) {
                const incidencias = incData.data || [];
                if (incidencias.length > 0) {
                    await sqliteManager.upsertIncidencias(empleadoId, incidencias);
                    results.incidencias = { success: true, count: incidencias.length, data: incidencias };
                } else {
                    results.incidencias = { success: true, count: 0 };
                }
            }
        } catch (incError) {
            results.incidencias = { success: false, error: incError.message };
        }

        // ========== AVISOS ==========
        try {
            // 1. Avisos Globales
            const globUrl = `/avisos/globales`;
            const globData = await apiFetch(globUrl).catch(() => null);
            let avisosTotal = [];

            if (globData && globData.success && globData.data) {
                const globales = globData.data;
                await sqliteManager.upsertAvisosGlobales(globales);
                avisosTotal = [...avisosTotal, ...globales];
            }

            // 2. Avisos Personales (si es empleado)
            const empUrl = `/empleados/${empleadoId}/avisos`;
            const empData = await apiFetch(empUrl).catch(() => null);

            if (empData && empData.success && empData.data) {
                const personales = empData.data;
                await sqliteManager.upsertAvisosEmpleado(empleadoId, personales);
                avisosTotal = [...avisosTotal, ...personales];
            }

            if (avisosTotal.length > 0) {
                results.avisos = { success: true, count: avisosTotal.length, data: avisosTotal };
            } else {
                results.avisos = { success: true, count: 0, data: [] };
            }

        } catch (avisoError) {
            results.avisos = { success: false, error: avisoError.message };
        }

    } catch (error) {
        // Silencio en producción
    }

    results.duration = Date.now() - startTime;
    const allSuccess = results.empleado.success && results.credenciales.success;

    return { success: allSuccess, ...results };
}

export default {
    configure,
    fullPull,
};
