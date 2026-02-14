/**
 * OfflineAuthService — Servicio de autenticación contra la caché local SQLite
 * Valida PIN, huella y facial cuando no hay conexión al servidor.
 */

// ============================================================
// HELPERS
// ============================================================

/**
 * Verifica si estamos en Electron con offlineDB disponible
 */
function hasOfflineDB() {
  return !!(window.electronAPI && window.electronAPI.offlineDB);
}

/**
 * Calcula distancia euclidiana entre dos descriptores faciales
 * Réplica de la función del servidor (credenciales.controller.js)
 * @param {Array|Float32Array} desc1
 * @param {Array|Float32Array} desc2
 * @returns {number}
 */
function calcularDistanciaEuclidiana(desc1, desc2) {
  if (desc1.length !== desc2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Convierte un BYTEA/Buffer a Float32Array
 * Para descriptores faciales almacenados como BLOB en SQLite
 * @param {ArrayBuffer|Uint8Array|Array} data
 * @returns {Float32Array}
 */
function bufferToFloat32Array(data) {
  if (!data) return null;

  try {
    // Si ya es un Float32Array
    if (data instanceof Float32Array) return data;

    // Si es un ArrayBuffer
    if (data instanceof ArrayBuffer) {
      return new Float32Array(data);
    }

    // Si es un Uint8Array o Buffer de Node
    if (data instanceof Uint8Array || Buffer.isBuffer(data)) {
      return new Float32Array(data.buffer, data.byteOffset, data.byteLength / 4);
    }

    // Si es un array de números (descriptor serializado como JSON)
    if (Array.isArray(data)) {
      return new Float32Array(data);
    }

    // Si es base64
    if (typeof data === 'string') {
      // Intentar parsear como JSON primero
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return new Float32Array(parsed);
      } catch {
        // No es JSON, intentar como base64
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new Float32Array(bytes.buffer);
      }
    }

    return null;
  } catch (error) {
    console.error('[OfflineAuth] Error convirtiendo a Float32Array:', error);
    return null;
  }
}

// ============================================================
// IDENTIFICACIÓN OFFLINE POR PIN
// ============================================================

/**
 * Identifica un empleado por PIN contra la caché local
 * NOTA: La verificación real de Argon2id requiere librería crypto del servidor.
 * En modo offline, comparamos el PIN ingresado contra un hash almacenado.
 * Para una implementación segura con argon2, se necesitaría importar argon2 en Electron.
 *
 * Alternativa práctica: almacenar un hash SHA-256 del PIN localmente como fallback offline.
 *
 * @param {string} pinIngresado - PIN de 6 dígitos
 * @returns {Promise<Object|null>} empleado identificado o null
 */
export async function identificarPorPinOffline(pinIngresado) {
  if (!hasOfflineDB()) {
    console.warn('[OfflineAuth] offlineDB no disponible');
    return null;
  }

  try {
    const credenciales = await window.electronAPI.offlineDB.getAllCredenciales();

    if (!credenciales || credenciales.length === 0) {
      console.warn('[OfflineAuth] No hay credenciales en caché');
      return null;
    }

    // Buscar por PIN
    // NOTA: El PIN en el servidor está hasheado con Argon2id
    // Para validación offline, tenemos dos opciones:
    // 1. Almacenar un hash SHA-256 adicional del PIN durante el Pull
    // 2. Hacer matching directo si el PIN se almacena como hash verificable localmente
    // La implementación actual usa el pin_hash tal cual viene del servidor

    for (const cred of credenciales) {
      if (!cred.pin_hash) continue;

      // Comparación simple: Si el pin_hash coincide con el PIN ingresado
      // En producción, usar argon2.verify() via IPC al main process
      // Por ahora, verificamos si el hash contiene el PIN (formato Argon2id)
      if (cred.pin_hash === pinIngresado || await verificarPinLocal(pinIngresado, cred.pin_hash)) {
        const empleado = await window.electronAPI.offlineDB.getEmpleado(cred.empleado_id);
        if (empleado && empleado.estado_cuenta === 'activo') {
          console.log(`✅ [OfflineAuth] PIN match → empleado ${cred.empleado_id}`);
          return {
            empleado_id: cred.empleado_id,
            nombre: empleado.nombre || cred.nombre,
            usuario_id: empleado.usuario_id,
            metodo: 'PIN',
          };
        }
      }
    }

    console.log('❌ [OfflineAuth] PIN no coincide con ningún empleado');
    return null;
  } catch (error) {
    console.error('[OfflineAuth] Error en identificación por PIN:', error);
    return null;
  }
}

/**
 * Verificación local de PIN contra hash Argon2id
 * NOTA: Esto es un placeholder. Para verificación real de Argon2id offline,
 * se necesita el módulo argon2 compilado para Electron.
 * @param {string} pin
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verificarPinLocal(pin, hash) {
  // Si el hash parece ser Argon2id (comienza con $argon2id$)
  if (hash && hash.startsWith('$argon2id$')) {
    // Necesita el módulo argon2 nativo
    // TODO: Implementar verificación Argon2id via IPC al main process
    // Por ahora retornamos false y el PIN solo funciona con conexión
    console.warn('[OfflineAuth] Verificación Argon2id offline requiere módulo nativo');
    return false;
  }

  // Hash simple (fallback): comparación directa
  return pin === hash;
}

// ============================================================
// IDENTIFICACIÓN OFFLINE POR HUELLA DACTILAR
// ============================================================

/**
 * Identifica un empleado por template de huella contra la caché local
 * NOTA: El matching de huellas requiere el SDK de DigitalPersona.
 * La comparación se delega al BiometricMiddleware via WebSocket local.
 *
 * @param {string} templateBase64 - Template de huella en Base64
 * @returns {Promise<Object|null>} empleado identificado o null
 */
export async function identificarPorHuellaOffline(templateBase64) {
  if (!hasOfflineDB()) {
    console.warn('[OfflineAuth] offlineDB no disponible');
    return null;
  }

  try {
    const credenciales = await window.electronAPI.offlineDB.getAllCredenciales();
    const conHuella = credenciales.filter(c => c.dactilar_template);

    if (conHuella.length === 0) {
      console.warn('[OfflineAuth] No hay templates de huella en caché');
      return null;
    }

    // El matching de huellas requiere el SDK de DigitalPersona
    // que corre en el BiometricMiddleware (C#) localmente.
    // El middleware sigue funcionando offline (es un proceso local).
    // Delegamos la comparación al middleware via su WebSocket local.
    console.log(`🔍 [OfflineAuth] ${conHuella.length} huellas en caché para matching offline`);

    // La comparación se hace template vs template usando el BiometricMiddleware
    // que opera localmente sin necesidad de internet
    // El renderer ya maneja esto via useBiometricWebSocket

    return {
      templates: conHuella,
      count: conHuella.length,
      metodo: 'HUELLA',
    };
  } catch (error) {
    console.error('[OfflineAuth] Error en identificación por huella:', error);
    return null;
  }
}

// ============================================================
// IDENTIFICACIÓN OFFLINE POR FACIAL
// ============================================================

/**
 * Identifica un empleado por descriptor facial contra la caché local
 * Usa distancia euclidiana, misma lógica que el servidor.
 *
 * @param {Array|Float32Array} descriptorCapturado - Descriptor de 128 dimensiones
 * @param {number} umbral - Umbral máximo de distancia (default 0.45)
 * @returns {Promise<Object|null>} empleado identificado o null
 */
export async function identificarPorFacialOffline(descriptorCapturado, umbral = 0.45) {
  if (!hasOfflineDB()) {
    console.warn('[OfflineAuth] offlineDB no disponible');
    return null;
  }

  try {
    const credenciales = await window.electronAPI.offlineDB.getAllCredenciales();
    const conFacial = credenciales.filter(c => c.facial_descriptor);

    if (conFacial.length === 0) {
      console.warn('[OfflineAuth] No hay descriptores faciales en caché');
      return null;
    }

    console.log(`🔍 [OfflineAuth] Comparando rostro contra ${conFacial.length} descriptores en caché...`);

    let bestMatch = null;
    let bestDistance = Infinity;

    for (const cred of conFacial) {
      const storedDescriptor = bufferToFloat32Array(cred.facial_descriptor);
      if (!storedDescriptor || storedDescriptor.length === 0) continue;

      const distance = calcularDistanciaEuclidiana(
        Array.from(descriptorCapturado),
        Array.from(storedDescriptor)
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = cred;
      }
    }

    if (bestMatch && bestDistance < umbral) {
      const empleado = await window.electronAPI.offlineDB.getEmpleado(bestMatch.empleado_id);

      console.log(`✅ [OfflineAuth] Facial match → empleado ${bestMatch.empleado_id} (distancia: ${bestDistance.toFixed(4)})`);

      return {
        empleado_id: bestMatch.empleado_id,
        nombre: empleado?.nombre || bestMatch.nombre,
        usuario_id: empleado?.usuario_id,
        distancia: bestDistance,
        metodo: 'FACIAL',
      };
    }

    console.log(`❌ [OfflineAuth] No se encontró match facial (mejor distancia: ${bestDistance.toFixed(4)}, umbral: ${umbral})`);
    return null;
  } catch (error) {
    console.error('[OfflineAuth] Error en identificación facial:', error);
    return null;
  }
}

// ============================================================
// CÁLCULO DE ESTADO OFFLINE
// ============================================================

import {
  calcularEstadoRegistro,
  getDiaSemana,
  agruparTurnosConcatenados,
  getEntradaSalidaGrupo
} from './asistenciaLogicService';

// Variables para control de duplicados (en memoria)
let lastRequestTimestamp = 0;
let lastRequestEmpleadoId = null;
const MIN_REQUEST_INTERVAL_MS = 5000; // 5 segundos

/**
 * Normaliza un registro offline para que coincida con el formato esperado por asistenciaLogicService
 * @param {Object} reg - Registro offline
 * @param {Array} todosRegistros - Array completo para calcular total
 */
function normalizarRegistroOffline(reg, todosRegistros) {
  if (!reg) return null;
  return {
    tipo: reg.tipo,
    estado: reg.estado,
    fecha_registro: new Date(reg.fecha_registro),
    hora: new Date(reg.fecha_registro).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    totalRegistrosHoy: todosRegistros.length
  };
}

/**
 * Carga datos necesarios para el cálculo de estado desde la caché local
 * Y calcula el estado actual usando la lógica compartida
 * @param {string} empleadoId
 * @returns {Promise<Object>} { horario, tolerancia, registrosHoy, departamento, estado, ultimo }
 */
export async function cargarDatosOffline(empleadoId) {
  if (!hasOfflineDB()) {
    return { horario: null, tolerancia: null, registrosHoy: [], departamento: null, estado: null };
  }

  try {
    const [horarioRaw, toleranciaRaw, registrosHoyRaw] = await Promise.all([
      window.electronAPI.offlineDB.getHorario(empleadoId),
      window.electronAPI.offlineDB.getTolerancia(empleadoId),
      window.electronAPI.offlineDB.getRegistrosHoy(empleadoId),
    ]);

    // 1. Procesar Horario
    const horario = horarioRaw ? {
      id: horarioRaw.horario_id,
      horario_id: horarioRaw.horario_id,
      configuracion: horarioRaw.configuracion, // Ya viene parseado u objeto desde sqliteManager
      es_activo: horarioRaw.es_activo,
      trabaja: true // Asumimos true si existe, asistenciaLogic lo validará a fondo
    } : null;

    // asistenciaLogic espera un objeto con 'turnos', 'gruposTurnos' ya procesados.
    // PERO obtenerHorario en asistenciaLogic hace fetch y procesa. 
    // Aquí tenemos el raw config. Debemos procesarlo similar a obtenerHorario.
    // Reutilizaremos logic de obtenerHorario parseando la config aqui mismo o
    // simulando la estructura si asistenciaLogic exporta el procesador.
    // Revisando asistenciaLogic, 'obtenerHorario' hace todo el trabajo.
    // Como no exporta la función de procesar config aislada (está dentro de obtenerHorario),
    // vamos a replicar la parte de extracción de turnos aquí para pasarle un objeto compatible.

    // Helpers importados arriba
    // const { getDiaSemana, agruparTurnosConcatenados, getEntradaSalidaGrupo } = require('./asistenciaLogicService');

    let horarioProcesado = null;
    if (horario && horario.configuracion) {
      let config = typeof horario.configuracion === 'string'
        ? JSON.parse(horario.configuracion)
        : horario.configuracion;

      const diaHoy = getDiaSemana(); // "lunes", "martes"...
      let turnosHoy = [];

      if (config.configuracion_semanal?.[diaHoy]) {
        turnosHoy = config.configuracion_semanal[diaHoy].map(t => ({
          entrada: t.inicio,
          salida: t.fin
        }));
      } else if (config.dias?.includes(diaHoy)) {
        turnosHoy = config.turnos || [];
      }

      if (turnosHoy && Array.isArray(turnosHoy) && turnosHoy.length > 0) {
        const gruposTurnos = agruparTurnosConcatenados(turnosHoy);
        const primerGrupo = gruposTurnos[0];
        const ultimoGrupo = gruposTurnos[gruposTurnos.length - 1];
        const entradaGeneral = getEntradaSalidaGrupo(primerGrupo).entrada;
        const salidaGeneral = getEntradaSalidaGrupo(ultimoGrupo).salida;

        horarioProcesado = {
          trabaja: true,
          turnos: turnosHoy,
          gruposTurnos: gruposTurnos,
          turnosOriginales: turnosHoy,
          entrada: entradaGeneral,
          salida: salidaGeneral,
          tipo: gruposTurnos.length > 1 ? 'quebrado' : 'continuo',
          configuracion: config
        };
      } else {
        horarioProcesado = { trabaja: false, turnos: [], gruposTurnos: [] };
      }
    }

    // 2. Procesar Tolerancia
    const tolerancia = toleranciaRaw || {
      minutos_retardo: 10,
      minutos_falta: 30,
      permite_registro_anticipado: true,
      minutos_anticipado_max: 60,
      aplica_tolerancia_entrada: true,
      aplica_tolerancia_salida: true,
      minutos_anticipado_salida: 10
    };

    // 3. Procesar Registros
    const registrosHoy = registrosHoyRaw || [];
    // Ordenar para encontrar el último (descendiente)
    const registrosOrdenados = [...registrosHoy].sort((a, b) => {
      return new Date(b.fecha_registro) - new Date(a.fecha_registro);
    });

    const ultimoRaw = registrosOrdenados[0];
    const ultimo = ultimoRaw ? normalizarRegistroOffline(ultimoRaw, registrosOrdenados) : null;

    // 4. Calcular Estado
    let estado = null;
    if (horarioProcesado && tolerancia) {
      estado = calcularEstadoRegistro(ultimo, horarioProcesado, tolerancia, registrosHoy);
    }

    return {
      horario: horarioProcesado, // Devolvemos el procesado
      tolerancia: tolerancia,
      registrosHoy: registrosOrdenados,
      ultimo: ultimo,
      estado: estado,
      departamento: null,
    };
  } catch (error) {
    console.error('[OfflineAuth] Error cargando datos offline:', error);
    return { horario: null, tolerancia: null, registrosHoy: [], departamento: null, estado: null };
  }
}

/**
 * Guarda un registro de asistencia en la cola offline con validaciones estrictas
 * @param {Object} data - { empleadoId, metodo_registro, payload_biometrico, ... }
 * @returns {Promise<Object>}
 */
export async function guardarAsistenciaOffline(data) {
  if (!hasOfflineDB()) {
    throw new Error('Sistema offline no disponible');
  }

  const empleadoId = data.empleadoId || data.empleado_id;

  // 1. Validación Anti-Duplicados (Memoria)
  const now = Date.now();
  if (
    lastRequestEmpleadoId === empleadoId &&
    now - lastRequestTimestamp < MIN_REQUEST_INTERVAL_MS
  ) {
    const segundosRestantes = Math.ceil((MIN_REQUEST_INTERVAL_MS - (now - lastRequestTimestamp)) / 1000);
    console.warn(`⚠️ [Offline] Solicitud duplicada bloqueada. Espera ${segundosRestantes}s`);
    throw new Error(`Por favor espera ${segundosRestantes} segundos antes de intentar nuevamente`);
  }

  // 2. Validación de Reglas de Negocio (Horario, Tolerancia)
  console.log(`[OfflineAuth] Validando reglas de asistencia para ${empleadoId}...`);
  const datosValidacion = await cargarDatosOffline(empleadoId);
  const estadoCalculado = datosValidacion.estado;

  if (!estadoCalculado) {
    throw new Error('No se pudo validar el horario del empleado');
  }

  // Si no puede registrar (fuera de horario, muy temprano, etc.), bloquear
  if (!estadoCalculado.puedeRegistrar) {
    console.warn(`❌ [OfflineAuth] Registro bloqueado: ${estadoCalculado.mensaje}`);
    throw new Error(estadoCalculado.mensaje || 'No puedes registrar asistencia en este momento');
  }

  // Actualizar tracking
  lastRequestTimestamp = now;
  lastRequestEmpleadoId = empleadoId;

  // 3. Guardar en SQLite usando los datos CALCULADOS para integridad
  try {
    const result = await window.electronAPI.offlineDB.saveAsistencia({
      empleado_id: empleadoId,
      tipo: estadoCalculado.tipoRegistro || 'entrada',
      estado: estadoCalculado.clasificacion || estadoCalculado.estadoHorario || 'puntual',
      dispositivo_origen: 'escritorio',
      metodo_registro: data.metodoRegistro || data.metodo_registro || 'PIN',
      departamento_id: data.departamentoId || data.departamento_id || datosValidacion.departamento?.id || null, // Intentar obtener depto
      fecha_registro: new Date().toISOString(),
      payload_biometrico: data.payload_biometrico || null,
    });

    if (!result.success) {
      throw new Error(result.error || 'Error guardando asistencia offline');
    }

    console.log('📝 [OfflineAuth] Asistencia guardada en cola offline:', result.data);
    return {
      ...result.data,
      ...estadoCalculado // Devolver info calculada para la UI
    };
  } catch (err) {
    console.error('[OfflineAuth] Error en guardarAsistenciaOffline:', err);
    throw err;
  }
}

// ============================================================
// EXPORTACIÓN
// ============================================================

export default {
  identificarPorPinOffline,
  identificarPorHuellaOffline,
  identificarPorFacialOffline,
  cargarDatosOffline,
  guardarAsistenciaOffline,
  hasOfflineDB,
};
