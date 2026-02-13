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
  console.log('🔧 [Pull] Configurado: URL=', apiBaseUrl ? apiBaseUrl.substring(0, 40) + '...' : '(vacío!)');
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
  console.log('🔄 [Pull] Iniciando Pull completo...');
  const startTime = Date.now();

  const results = {
    empleados: { success: false, count: 0 },
    credenciales: { success: false, count: 0 },
    horarios: { success: false, count: 0 },
    tolerancias: { success: false, count: 0 },
    duration: 0,
  };

  if (!authToken) {
    console.warn('⚠️ [Pull] Sin token de autenticación, omitiendo Pull...');
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
        console.log(`✅ [Pull] ${mapped.length} empleados sincronizados`);
      } else {
        console.log('⚠️ [Pull] No se encontraron empleados');
        results.empleados = { success: true, count: 0 };
      }
    } catch (empError) {
      console.error('❌ [Pull] Error procesando empleados:', empError.message);
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
        console.log(`✅ [Pull] ${mapped.length} credenciales sincronizadas`);
      } else {
        console.log('⚠️ [Pull] No se encontraron credenciales');
        results.credenciales = { success: true, count: 0 };
      }
    } catch (credError) {
      console.error('❌ [Pull] Error procesando credenciales:', credError.message);
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
      console.log(`✅ [Pull] ${horariosCount} horarios sincronizados`);
    } catch (horError) {
      console.error('❌ [Pull] Error procesando horarios:', horError.message);
      results.horarios = { success: false, error: horError.message };
    }

    // ========== TOLERANCIAS ==========
    try {
      const tolerancias = data.tolerancias || [];
      if (tolerancias.length > 0) {
        sqliteManager.upsertToleranciasBulk(tolerancias);
        sqliteManager.setLastFullSync('cache_tolerancias');
        results.tolerancias = { success: true, count: tolerancias.length };
        console.log(`✅ [Pull] ${tolerancias.length} tolerancias sincronizadas`);
      } else {
        console.warn('⚠️ [Pull] El servidor no devolvió tolerancias');
        results.tolerancias = { success: true, count: 0 };
      }
    } catch (tolError) {
      console.error('❌ [Pull] Error procesando tolerancias:', tolError.message);
      results.tolerancias = { success: false, error: tolError.message };
    }

    // ========== ROLES + USUARIOS_ROLES ==========
    try {
      const usuarios_roles = data.usuarios_roles || [];

      if (usuarios_roles.length > 0) {
        // Extraer roles únicos de los datos joinados del servidor
        // El backend envía: {usuario_id, rol_id, tolerancia_id, posicion}
        const rolesMap = new Map();
        for (const ur of usuarios_roles) {
          if (!rolesMap.has(ur.rol_id)) {
            rolesMap.set(ur.rol_id, {
              id: ur.rol_id,
              nombre: null,
              tolerancia_id: ur.tolerancia_id || null,
              posicion: ur.posicion ?? 0,
            });
          }
        }
        const roles = Array.from(rolesMap.values());
        sqliteManager.upsertRoles(roles);
        sqliteManager.setLastFullSync('cache_roles');
        console.log(`✅ [Pull] ${roles.length} roles sincronizados`);

        // Insertar usuarios_roles
        const urMapped = usuarios_roles.map(ur => ({
          usuario_id: ur.usuario_id,
          rol_id: ur.rol_id,
          es_activo: true,
        }));
        sqliteManager.upsertUsuariosRoles(urMapped);
        sqliteManager.setLastFullSync('cache_usuarios_roles');
        console.log(`✅ [Pull] ${urMapped.length} usuarios_roles sincronizados`);
      }
    } catch (urError) {
      console.error('❌ [Pull] Error procesando roles/usuarios_roles:', urError.message);
    }

    // ========== DEPARTAMENTOS ==========
    try {
      const empDeptos = data.empleados_departamentos || [];
      if (empDeptos.length > 0) {
        // Agrupar por empleado
        const byEmpleado = {};
        for (const ed of empDeptos) {
          if (!byEmpleado[ed.empleado_id]) byEmpleado[ed.empleado_id] = [];
          byEmpleado[ed.empleado_id].push({
            id: ed.departamento_id,
            departamento_id: ed.departamento_id,
            nombre: null,
            es_activo: ed.es_activo,
          });
        }

        for (const [empId, deptos] of Object.entries(byEmpleado)) {
          sqliteManager.upsertDepartamentos(empId, deptos);
        }

        sqliteManager.setLastFullSync('cache_departamentos');
        console.log(`✅ [Pull] Departamentos sincronizados para ${Object.keys(byEmpleado).length} empleados`);
      }
    } catch (deptError) {
      console.error('❌ [Pull] Error procesando departamentos:', deptError.message);
    }

  } catch (error) {
    console.error('❌ [Pull] Error en Pull completo:', error.message);
    // Si falla la llamada principal, todos los resultados quedan como fallidos
  }

  results.duration = Date.now() - startTime;
  const allSuccess = results.empleados.success && results.credenciales.success;
  console.log(`${allSuccess ? '✅' : '⚠️'} [Pull] Pull completo finalizado en ${results.duration}ms`);

  return results;
}

export default {
  configure,
  fullPull,
};
