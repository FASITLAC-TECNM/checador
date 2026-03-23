







import sqliteManager from './sqliteManager.mjs';


let apiBaseUrl = '';
let authToken = '';




export function configure(baseUrl, token) {
  if (baseUrl !== undefined && baseUrl !== null) {
    apiBaseUrl = baseUrl;
  }
  if (token !== undefined) {
    authToken = token || '';
  }
}




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
      ...(options.headers || {})
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(fullUrl, {
      method: options.method || 'GET',
      headers,
      body: options.body || undefined,
      signal: controller.signal
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
    configuracion: { success: false, count: 0 },
    diasFestivos: { success: false, count: 0 },
    duration: 0
  };

  try {

    const data = await apiFetch(`/movil/sync/mis-datos?empleado_id=${empleadoId}`);

    if (!data.success) {
      throw new Error(data.error || 'Respuesta no exitosa');
    }


    try {
      if (data.empleado) {
        await sqliteManager.upsertEmpleados([data.empleado]);
        await sqliteManager.setLastFullSync('cache_empleados');
        results.empleado = { success: true, count: 1 };
      }
    } catch (empError) {
      results.empleado = { success: false, error: empError.message };
    }


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




    try {
      if (data.tolerancia) {
        const toleranciaCompleta = {
          minutos_retardo: data.tolerancia.minutos_retardo ?? 0,
          minutos_falta: data.tolerancia.minutos_falta ?? 0,
          minutos_retardo_a_max: data.tolerancia.minutos_retardo_a_max ?? 0,
          minutos_retardo_b_max: data.tolerancia.minutos_retardo_b_max ?? 0,
          equivalencia_retardo_a: data.tolerancia.equivalencia_retardo_a ?? 0,
          equivalencia_retardo_b: data.tolerancia.equivalencia_retardo_b ?? 0,
          permite_registro_anticipado: data.tolerancia.permite_registro_anticipado ?? true,
          minutos_anticipado_max: data.tolerancia.minutos_anticipado_max ?? 0,
          minutos_anticipo_salida: data.tolerancia.minutos_anticipo_salida ?? 0,
          minutos_posterior_salida: data.tolerancia.minutos_posterior_salida ?? 0,
          aplica_tolerancia_entrada: data.tolerancia.aplica_tolerancia_entrada ?? true,
          aplica_tolerancia_salida: data.tolerancia.aplica_tolerancia_salida ?? false,
          reglas: data.tolerancia.reglas ?? [],
          dias_aplica: data.tolerancia.dias_aplica ?? {},
          ...data.tolerancia
        };
        await sqliteManager.upsertTolerancia(empleadoId, toleranciaCompleta);
        await sqliteManager.setLastFullSync('cache_tolerancias');
        results.tolerancia = { success: true, count: 1 };
      } else {
        try { await sqliteManager.getDatabase().runAsync('DELETE FROM cache_tolerancias WHERE empleado_id = ?', [empleadoId]); } catch(e) {}
        results.tolerancia = { success: true, count: 0 };
      }
    } catch (tolError) {
      results.tolerancia = { success: false, error: tolError.message };
    }

    try {
      if (data.departamentos && data.departamentos.length > 0) {
        const deptos = data.departamentos.map((d) => {

          let lat = null, lng = null, radio = null;
          if (d.ubicacion) {
            const ub = typeof d.ubicacion === 'string' ?
              (() => { try { return JSON.parse(d.ubicacion); } catch { return {}; } })() :
              d.ubicacion;
            lat = ub.latitud ?? ub.lat ?? null;
            lng = ub.longitud ?? ub.lng ?? null;
            radio = ub.radio ?? null;
          }

          return {
            id: d.departamento_id,
            departamento_id: d.departamento_id,
            es_activo: d.es_activo,
            nombre: d.nombre,

            ubicacion: d.ubicacion ?
              typeof d.ubicacion === 'string' ? d.ubicacion : JSON.stringify(d.ubicacion) :
              null,

            latitud: lat,
            longitud: lng,
            radio: radio
          };
        });
        await sqliteManager.upsertDepartamentos(empleadoId, deptos);
        await sqliteManager.setLastFullSync('cache_departamentos');
        results.departamentos = { success: true, count: deptos.length };
      }
    } catch (deptError) {
      results.departamentos = { success: false, error: deptError.message };
    }


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


    try {

      const globUrl = `/avisos/globales`;
      const globData = await apiFetch(globUrl).catch(() => null);
      let avisosTotal = [];

      if (globData && globData.success && globData.data) {
        const globales = globData.data;
        await sqliteManager.upsertAvisosGlobales(globales);
        avisosTotal = [...avisosTotal, ...globales];
      }


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


    // ── Caché de configuración (orden y estado de credenciales) ──
    try {
      const cfgData = await apiFetch('/configuracion').catch(() => null);
      if (cfgData) {
        const cfg = cfgData.data || cfgData;
        let orden = cfg.orden_credenciales || cfg.credenciales_orden;
        if (typeof orden === 'string') {
          try { orden = JSON.parse(orden); } catch { orden = null; }
        }
        if (Array.isArray(orden)) {
          const ALIAS_MAP = { huella: 'dactilar', rostro: 'facial', codigo: 'pin' };
          const ordenNorm = orden.map((item, i) => {
            if (typeof item === 'string') return { metodo: ALIAS_MAP[item] || item, activo: true, nivel: i + 1 };
            return { metodo: ALIAS_MAP[item.metodo] || item.metodo || '', activo: item.activo !== false, nivel: item.nivel || i + 1 };
          });
          await sqliteManager.saveOrdenCredenciales(ordenNorm);
          results.configuracion = { success: true, count: 1 };
        }
      }
    } catch (cfgError) {
      results.configuracion = { success: false, error: cfgError.message };
    }

    // ── Descarga de Días Festivos ──
    try {
      const year = new Date().getFullYear();
      const festivosUrl = `/dias-festivos?year=${year}`;
      const festivosData = await apiFetch(festivosUrl).catch(() => null);

      if (festivosData && festivosData.success && festivosData.data) {
        // Filtrar solo los obligatorios y activos
        const festivosObligatorios = festivosData.data.filter(
          (f) => f.es_obligatorio && f.es_activo
        );

        if (festivosObligatorios.length > 0) {
          await sqliteManager.clearDiasFestivos(year.toString());
          await sqliteManager.upsertDiasFestivos(festivosObligatorios.map(f => ({
            fecha: f.fecha?.split('T')[0],
            nombre: f.nombre,
            tipo: f.tipo
          })));
          results.diasFestivos = { success: true, count: festivosObligatorios.length };
        } else {
          await sqliteManager.clearDiasFestivos(year.toString());
          results.diasFestivos = { success: true, count: 0 };
        }
      } else {
        results.diasFestivos = { success: true, count: 0 };
      }
    } catch (festivosError) {
      results.diasFestivos = { success: false, error: festivosError.message };
    }

  } catch (error) {

  }

  results.duration = Date.now() - startTime;
  const allSuccess = results.empleado.success && results.credenciales.success;

  return { success: allSuccess, ...results };
}

export default {
  configure,
  fullPull
};