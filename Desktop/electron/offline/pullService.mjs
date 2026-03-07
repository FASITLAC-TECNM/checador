/**
 * PullService — Descarga datos maestros del servidor al caché local SQLite
 * Usa el endpoint dedicado /api/escritorio/sync/datos-referencia
 */

import sqliteManager from './sqliteManager.mjs';

// Configuración — se inyectará desde SyncManager
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
  console.log('[PullService] Initialization: Configurado URL =', apiBaseUrl ? apiBaseUrl.substring(0, 40) + '...' : '(vacio!)');
}

/**
 * Helper para hacer fetch con timeout y autenticación
 */
async function apiFetch(endpoint, timeoutMs = 30000) {
  if (!apiBaseUrl) {
    throw new Error(`URL base no configurada. No se puede hacer fetch de ${endpoint}`);
  }

  const fullUrl = `${apiBaseUrl}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================
// PULL COMPLETO USANDO ENDPOINT DEDICADO
// ============================================================

/**
 * Ejecuta un Pull completo usando /api/escritorio/sync/datos-referencia
 * Este endpoint devuelve TODOS los datos de referencia en una sola llamada.
 * @returns {Object} resumen del sync
 */
export async function fullPull() {
  console.log('[PullService] Action: Starting full data pull...');
  const startTime = Date.now();

  const results = {
    empleados: { success: false, count: 0 },
    credenciales: { success: false, count: 0 },
    horarios: { success: false, count: 0 },
    duration: 0,
  };

  if (!authToken) {
    console.warn('[PullService] Warning: Sin token de autenticacion, omitiendo Pull...');
    results.duration = Date.now() - startTime;
    return results;
  }

  try {
    // Una sola llamada al endpoint dedicado
    const data = await apiFetch('/api/escritorio/sync/datos-referencia');

    // ========== EMPLEADOS ==========
    try {
      const empleados = data.empleados || [];
      if (empleados.length > 0) {
        const mapped = empleados.map(emp => ({
          empleado_id: emp.id || emp.empleado_id,
          usuario_id: emp.usuario_id,
          nombre: emp.nombre,
          usuario: emp.usuario || null,
          correo: emp.correo || null,
          estado_cuenta: emp.es_activo ? 'activo' : 'inactivo',
          es_empleado: true,
          foto: emp.foto || null,
        }));

        sqliteManager.upsertEmpleados(mapped);

        // Marcar empleados eliminados
        const serverIds = mapped.map(e => e.empleado_id);
        sqliteManager.markDeletedEmpleados(serverIds);
        sqliteManager.setLastFullSync('cache_empleados');

        results.empleados = { success: true, count: mapped.length };
        console.log(`[PullService] Status: ${mapped.length} empleados sincronizados`);
      } else {
        console.log('[PullService] Info: No se encontraron empleados');
        results.empleados = { success: true, count: 0 };
      }
    } catch (empError) {
      console.error('[PullService] Error: Error procesando empleados:', empError.message);
      results.empleados = { success: false, error: empError.message };
    }

    // ========== CREDENCIALES ==========
    try {
      const credenciales = data.credenciales || [];
      if (credenciales.length > 0) {
        // Serializar campos que pueden venir como objetos desde PostgreSQL
        // better-sqlite3 interpreta objetos planos como named parameters,
        // causando "You cannot specify named parameters in two different objects"
        const mapped = credenciales.map(cred => {
          let dactilar = cred.dactilar || null;
          let facial = cred.facial || null;
          let pin = cred.pin || null;

          // Si son objetos, serializarlos a JSON string
          if (dactilar && typeof dactilar === 'object') {
            dactilar = JSON.stringify(dactilar);
          }
          if (facial && typeof facial === 'object') {
            facial = JSON.stringify(facial);
          }

          return {
            id: cred.id,
            empleado_id: cred.empleado_id,
            pin_hash: pin,
            dactilar_template: dactilar,
            facial_descriptor: facial,
          };
        });

        sqliteManager.upsertCredenciales(mapped);
        sqliteManager.setLastFullSync('cache_credenciales');

        results.credenciales = { success: true, count: mapped.length };
        console.log(`[PullService] Status: ${mapped.length} credenciales sincronizadas`);
      } else {
        console.log('[PullService] Info: No se encontraron credenciales');
        results.credenciales = { success: true, count: 0 };
      }
    } catch (credError) {
      console.error('[PullService] Error: Error procesando credenciales:', credError.message);
      results.credenciales = { success: false, error: credError.message };
    }

    // ========== HORARIOS ==========
    try {
      const horarios = data.horarios || [];
      const empleados = data.empleados || [];

      // Mapear horarios a empleados usando horario_id
      let horariosCount = 0;
      for (const emp of empleados) {
        if (emp.horario_id) {
          const horario = horarios.find(h => h.id === emp.horario_id);
          if (horario) {
            sqliteManager.upsertHorario(emp.id, horario);
            horariosCount++;
          }
        }
      }

      sqliteManager.setLastFullSync('cache_horarios');
      results.horarios = { success: true, count: horariosCount };
      console.log(`[PullService] Status: ${horariosCount} horarios sincronizados`);
    } catch (horError) {
      console.error('[PullService] Error: Error procesando horarios:', horError.message);
      results.horarios = { success: false, error: horError.message };
    }

    // Eliminadas las llamadas y tablas de Tolerancias, Roles y Departamentos

  } catch (error) {
    console.error('[PullService] Error: Error en Pull completo:', error.message);
    // Si falla la llamada principal, todos los resultados quedan como fallidos
  }

  results.duration = Date.now() - startTime;
  const allSuccess = results.empleados.success && results.credenciales.success;
  console.log(`[PullService] Status: Pull completo ${allSuccess ? 'exitoso' : 'con advertencias'} en ${results.duration}ms`);

  return results;
}

export default {
  configure,
  fullPull,
};
