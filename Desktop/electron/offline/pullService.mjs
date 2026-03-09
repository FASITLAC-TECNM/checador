/**
 * PullService — Descarga datos maestros del servidor al caché local SQLite
 * Usa los endpoints reales que existen en el backend.
 *
 * Endpoints usados:
 *   GET /api/empleados/                  → lista empleados activos
 *   GET /api/credenciales/descriptores   → descriptores faciales (array de números, campo descriptor_facial)
 *   GET /api/horarios/                   → horarios (si existe)
 */

import sqliteManager from './sqliteManager.mjs';
import crypto from 'crypto';

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
// PULL COMPLETO USANDO ENDPOINTS REALES DEL BACKEND
// ============================================================

/**
 * Ejecuta un Pull completo descargando desde los endpoints reales.
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

  // ========== EMPLEADOS ==========
  try {
    const data = await apiFetch('/api/empleados/');
    const empleados = Array.isArray(data) ? data : (data.empleados || data.data || []);

    if (empleados.length > 0) {
      const mapped = empleados.map(emp => ({
        empleado_id: emp.id || emp.empleado_id,
        usuario_id: emp.id_usuario || emp.usuario_id,
        nombre: emp.nombre,
        usuario: emp.usuario || null,
        correo: emp.correo || null,
        estado_cuenta: (emp.es_activo !== false && emp.estado !== 'inactivo') ? 'activo' : 'inactivo',
        es_empleado: true,
        foto: emp.foto || null,
      }));

      sqliteManager.upsertEmpleados(mapped);
      const serverIds = mapped.map(e => e.empleado_id);
      sqliteManager.markDeletedEmpleados(serverIds);
      sqliteManager.setLastFullSync('cache_empleados');

      results.empleados = { success: true, count: mapped.length };
      console.log(`[PullService] Status: ${mapped.length} empleados sincronizados`);
    } else {
      results.empleados = { success: true, count: 0 };
      console.log('[PullService] Info: No se encontraron empleados');
    }
  } catch (empError) {
    console.error('[PullService] Error: Error procesando empleados:', empError.message);
    results.empleados = { success: false, error: empError.message };
  }

  // ========== CREDENCIALES (descriptores faciales) ==========
  // Endpoint real: GET /api/credenciales/descriptores
  // Devuelve: [{ id, empleado_id, descriptor_facial: number[], nombre, telefono }]
  try {
    const descriptores = await apiFetch('/api/credenciales/descriptores');
    const lista = Array.isArray(descriptores) ? descriptores : (descriptores.data || []);

    if (lista.length > 0) {
      const mapped = lista.map(cred => {
        // descriptor_facial viene como array de números desde el backend
        let facial = cred.descriptor_facial || cred.facial || null;

        if (facial) {
          if (Array.isArray(facial)) {
            // Convertir array de números a JSON string para almacenar en SQLite BLOB
            // bufferToFloat32Array en offlineAuthService maneja el formato JSON array
            facial = JSON.stringify(facial);
            console.log(`[PullService] Debug: facial_descriptor empleado ${cred.empleado_id} — ${JSON.parse(facial).length} dimensiones`);
          } else if (typeof facial === 'object' && !Buffer.isBuffer(facial)) {
            facial = JSON.stringify(facial);
          }
          // Si es string (base64 o JSON), lo dejamos tal cual
        }

        return {
          id: cred.id,
          empleado_id: cred.empleado_id,
          pin_hash: null,             // El PIN se actualiza por separado si es necesario
          dactilar_template: null,    // La huella se actualiza por separado
          facial_descriptor: facial,
        };
      });

      // Upsert usando SOLO facial_descriptor para no sobrescribir PIN/huella
      upsertSoloFacial(mapped);
      sqliteManager.setLastFullSync('cache_credenciales');

      results.credenciales = { success: true, count: mapped.length };
      console.log(`[PullService] Status: ${mapped.length} descriptores faciales sincronizados`);
    } else {
      results.credenciales = { success: true, count: 0 };
      console.log('[PullService] Info: No se encontraron descriptores faciales');
    }
  } catch (credError) {
    console.error('[PullService] Error: Error procesando credenciales faciales:', credError.message);
    results.credenciales = { success: false, error: credError.message };
  }

  // ========== PIN de empleados (endpoint de credenciales) ==========
  // Intentamos también obtener PINs para completar la cache
  try {
    // Nota: no hay endpoint bulk para PINs. Se omite hash aquí para no exponer PINs en texto plano.
    // Si el servidor devuelve hashes de PIN en el sync, se procesarían aquí.
  } catch { /* opcional */ }

  results.duration = Date.now() - startTime;
  const allSuccess = results.empleados.success && results.credenciales.success;
  console.log(`[PullService] Status: Pull completo ${allSuccess ? 'exitoso' : 'con advertencias'} en ${results.duration}ms`);

  return results;
}

/**
 * Inserta o actualiza SOLO el campo facial_descriptor en cache_credenciales.
 * No toca pin_hash ni dactilar_template para no perder datos previos.
 * @param {Array} items — [{ id, empleado_id, facial_descriptor }]
 */
function upsertSoloFacial(items) {
  // Obtener la instancia de DB directamente para preparar un statement personalizado
  const db = sqliteManager.getDatabase();
  if (!db) {
    console.error('[PullService] Error: DB no inicializada para upsertSoloFacial');
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO cache_credenciales (id, empleado_id, pin_hash, dactilar_template, facial_descriptor, updated_at)
    VALUES (?, ?, NULL, NULL, ?, datetime('now', 'localtime'))
    ON CONFLICT(id) DO UPDATE SET
      facial_descriptor = excluded.facial_descriptor,
      updated_at = excluded.updated_at
  `);

  const upsertMany = db.transaction((rows) => {
    for (const item of rows) {
      stmt.run(item.id, item.empleado_id, item.facial_descriptor);
    }
  });

  upsertMany(items);
  console.log(`[PullService] Status: ${items.length} facial_descriptor guardados en cache_credenciales`);
}

export default {
  configure,
  fullPull,
};
