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

/**
 * Carga datos necesarios para el cálculo de estado desde la caché local
 * @param {string} empleadoId
 * @returns {Promise<Object>} { horario, tolerancia, registrosHoy, departamento }
 */
export async function cargarDatosOffline(empleadoId) {
  if (!hasOfflineDB()) {
    return { horario: null, tolerancia: null, registrosHoy: [], departamento: null };
  }

  try {
    const [horario, tolerancia, registrosHoy] = await Promise.all([
      window.electronAPI.offlineDB.getHorario(empleadoId),
      window.electronAPI.offlineDB.getTolerancia(empleadoId),
      window.electronAPI.offlineDB.getRegistrosHoy(empleadoId),
    ]);

    return {
      horario: horario ? {
        id: horario.horario_id,
        configuracion: horario.configuracion,
        es_activo: horario.es_activo,
      } : null,
      tolerancia: tolerancia || {
        minutos_retardo: 10,
        minutos_falta: 30,
        permite_registro_anticipado: tolerancia?.permite_registro_anticipado ?? true,
        minutos_anticipado_max: tolerancia?.minutos_anticipado_max ?? 60,
        aplica_tolerancia_salida: tolerancia?.aplica_tolerancia_salida ?? false,
      },
      registrosHoy: registrosHoy || [],
      departamento: null, // Se puede obtener si es necesario
    };
  } catch (error) {
    console.error('[OfflineAuth] Error cargando datos offline:', error);
    return { horario: null, tolerancia: null, registrosHoy: [], departamento: null };
  }
}

/**
 * Guarda un registro de asistencia en la cola offline
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function guardarAsistenciaOffline(data) {
  if (!hasOfflineDB()) {
    throw new Error('Sistema offline no disponible');
  }

  const result = await window.electronAPI.offlineDB.saveAsistencia({
    empleado_id: data.empleadoId || data.empleado_id,
    tipo: data.tipoRegistro || data.tipo || 'entrada',
    estado: data.estado || data.clasificacion || 'puntual',
    dispositivo_origen: 'escritorio',
    metodo_registro: data.metodoRegistro || data.metodo_registro || 'PIN',
    departamento_id: data.departamentoId || data.departamento_id || null,
    fecha_registro: new Date().toISOString(),
    payload_biometrico: data.payload_biometrico || null,
  });

  if (!result.success) {
    throw new Error(result.error || 'Error guardando asistencia offline');
  }

  console.log('📝 [OfflineAuth] Asistencia guardada en cola offline');
  return result.data;
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
