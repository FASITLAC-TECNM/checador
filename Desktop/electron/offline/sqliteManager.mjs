/**
 * SQLiteManager — Módulo de persistencia local Offline-First
 * Gestiona la base de datos SQLite para cola de asistencias y caché de datos maestros.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

let db = null;

// ============================================================
// INICIALIZACIÓN Y MIGRACIONES
// ============================================================

/**
 * Obtiene la ruta del archivo SQLite en la carpeta de datos de usuario
 */
function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'checador_offline.db');
}

/**
 * Inicializa la base de datos SQLite y ejecuta migraciones
 * @returns {Database} instancia de better-sqlite3
 */
export function initDatabase() {
  if (db) return db;

  const dbPath = getDbPath();
  console.log('📦 [SQLite] Inicializando base de datos en:', dbPath);

  try {
    db = new Database(dbPath);
  } catch (error) {
    console.error('❌ [SQLite] Error abriendo base de datos:', error.message);
    console.error('💡 [SQLite] Si ves un error de módulo nativo, ejecuta:');
    console.error('   npx electron-rebuild -f -w better-sqlite3');
    db = null;
    return null;
  }

  // Optimizaciones para rendimiento
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  try {
    runMigrations();
  } catch (migError) {
    console.error('❌ [SQLite] Error en migraciones:', migError.message);
  }

  console.log('✅ [SQLite] Base de datos inicializada correctamente');
  return db;
}

/**
 * Ejecuta las migraciones para crear/actualizar las tablas
 */
function runMigrations() {
  console.log('🔄 [SQLite] Ejecutando migraciones...');

  db.exec(`
    -- Cola de registros de asistencia pendientes
    CREATE TABLE IF NOT EXISTS offline_asistencias (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotency_key TEXT NOT NULL UNIQUE,
      server_id TEXT,
      empleado_id TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida')),
      estado TEXT NOT NULL,
      dispositivo_origen TEXT DEFAULT 'escritorio',
      metodo_registro TEXT NOT NULL CHECK(metodo_registro IN ('PIN', 'HUELLA', 'FACIAL')),
      departamento_id TEXT,
      fecha_registro TEXT NOT NULL,
      payload_biometrico TEXT,
      is_synced INTEGER DEFAULT 0,
      sync_attempts INTEGER DEFAULT 0,
      last_sync_error TEXT,
      last_sync_attempt TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Caché de empleados
    CREATE TABLE IF NOT EXISTS cache_empleados (
      empleado_id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      nombre TEXT NOT NULL,
      usuario TEXT,
      correo TEXT,
      estado_cuenta TEXT NOT NULL DEFAULT 'activo',
      es_empleado INTEGER DEFAULT 1,
      foto TEXT,
      updated_at TEXT NOT NULL
    );

    -- Caché de credenciales para validación offline
    CREATE TABLE IF NOT EXISTS cache_credenciales (
      id TEXT PRIMARY KEY,
      empleado_id TEXT NOT NULL,
      pin_hash TEXT,
      dactilar_template BLOB,
      facial_descriptor BLOB,
      updated_at TEXT NOT NULL
    );

    -- Caché de horarios
    CREATE TABLE IF NOT EXISTS cache_horarios (
      horario_id TEXT PRIMARY KEY,
      empleado_id TEXT NOT NULL,
      configuracion TEXT NOT NULL,
      es_activo INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    -- Caché de tolerancias por empleado
    CREATE TABLE IF NOT EXISTS cache_tolerancias (
      empleado_id TEXT PRIMARY KEY,
      nombre TEXT,
      minutos_retardo INTEGER DEFAULT 10,
      minutos_falta INTEGER DEFAULT 30,
      permite_anticipado INTEGER DEFAULT 1,
      minutos_anticipado_max INTEGER DEFAULT 60,
      aplica_tolerancia_entrada INTEGER DEFAULT 1,
      aplica_tolerancia_salida INTEGER DEFAULT 0,
      dias_aplica TEXT,
      updated_at TEXT NOT NULL
    );

    -- Caché de departamentos del empleado
    CREATE TABLE IF NOT EXISTS cache_departamentos (
      empleado_id TEXT NOT NULL,
      departamento_id TEXT NOT NULL,
      nombre TEXT,
      es_activo INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (empleado_id, departamento_id)
    );

    -- Metadata de sincronización
    CREATE TABLE IF NOT EXISTS sync_metadata (
      tabla TEXT PRIMARY KEY,
      last_full_sync TEXT,
      last_incremental_sync TEXT,
      total_records INTEGER DEFAULT 0
    );

    -- Índices para rendimiento
    CREATE INDEX IF NOT EXISTS idx_offline_asistencias_synced
      ON offline_asistencias(is_synced);
    CREATE INDEX IF NOT EXISTS idx_offline_asistencias_empleado
      ON offline_asistencias(empleado_id, fecha_registro);
    CREATE INDEX IF NOT EXISTS idx_cache_credenciales_empleado
      ON cache_credenciales(empleado_id);
    CREATE INDEX IF NOT EXISTS idx_cache_horarios_empleado
      ON cache_horarios(empleado_id);
  `);

  // Inicializar sync_metadata si están vacías
  const initMeta = db.prepare(`
    INSERT OR IGNORE INTO sync_metadata (tabla) VALUES (?)
  `);
  const tables = ['cache_empleados', 'cache_credenciales', 'cache_horarios', 'cache_tolerancias', 'cache_departamentos'];
  for (const t of tables) {
    initMeta.run(t);
  }

  // Migración: agregar columnas usuario y correo si no existen
  try {
    const tableInfo = db.prepare("PRAGMA table_info(cache_empleados)").all();
    const columns = tableInfo.map(col => col.name);
    if (!columns.includes('usuario')) {
      db.exec("ALTER TABLE cache_empleados ADD COLUMN usuario TEXT");
      console.log('🔄 [SQLite] Migración: columna "usuario" agregada a cache_empleados');
    }
    if (!columns.includes('correo')) {
      db.exec("ALTER TABLE cache_empleados ADD COLUMN correo TEXT");
      console.log('🔄 [SQLite] Migración: columna "correo" agregada a cache_empleados');
    }
  } catch (alterError) {
    console.warn('⚠️ [SQLite] Error en migración de columnas:', alterError.message);
  }

  // Migración: agregar columnas faltantes a cache_tolerancias
  try {
    const tolInfo = db.prepare("PRAGMA table_info(cache_tolerancias)").all();
    const tolCols = tolInfo.map(col => col.name);
    if (!tolCols.includes('nombre')) {
      db.exec("ALTER TABLE cache_tolerancias ADD COLUMN nombre TEXT");
      console.log('🔄 [SQLite] Migración: columna "nombre" agregada a cache_tolerancias');
    }
    if (!tolCols.includes('aplica_tolerancia_entrada')) {
      db.exec("ALTER TABLE cache_tolerancias ADD COLUMN aplica_tolerancia_entrada INTEGER DEFAULT 1");
      console.log('🔄 [SQLite] Migración: columna "aplica_tolerancia_entrada" agregada a cache_tolerancias');
    }
    if (!tolCols.includes('dias_aplica')) {
      db.exec("ALTER TABLE cache_tolerancias ADD COLUMN dias_aplica TEXT");
      console.log('🔄 [SQLite] Migración: columna "dias_aplica" agregada a cache_tolerancias');
    }
  } catch (tolAlterError) {
    console.warn('⚠️ [SQLite] Error en migración de cache_tolerancias:', tolAlterError.message);
  }

  console.log('✅ [SQLite] Migraciones completadas');
}

// ============================================================
// CRUD — COLA DE ASISTENCIAS OFFLINE
// ============================================================

/**
 * Guarda un registro de asistencia en la cola local
 * @param {Object} data
 * @returns {Object} registro insertado con local_id e idempotency_key
 */
export function saveOfflineAsistencia(data) {
  const idempotencyKey = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO offline_asistencias
      (idempotency_key, empleado_id, tipo, estado, dispositivo_origen, metodo_registro,
       departamento_id, fecha_registro, payload_biometrico)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    idempotencyKey,
    data.empleado_id,
    data.tipo,
    data.estado,
    data.dispositivo_origen || 'escritorio',
    data.metodo_registro,
    data.departamento_id || null,
    data.fecha_registro || new Date().toISOString(),
    data.payload_biometrico ? JSON.stringify(data.payload_biometrico) : null
  );

  console.log(`📝 [SQLite] Asistencia offline guardada: local_id=${result.lastInsertRowid}, key=${idempotencyKey}`);

  return {
    local_id: result.lastInsertRowid,
    idempotency_key: idempotencyKey,
    ...data
  };
}

/**
 * Obtiene todos los registros pendientes de sincronización, ordenados cronológicamente
 * @param {number} limit - máximo de registros (default 50)
 * @returns {Array}
 */
export function getPendingAsistencias(limit = 50) {
  const stmt = db.prepare(`
    SELECT * FROM offline_asistencias
    WHERE is_synced = 0
    ORDER BY fecha_registro ASC
    LIMIT ?
  `);
  return stmt.all(limit);
}

/**
 * Marca un registro como sincronizado exitosamente
 * @param {number} localId
 * @param {string} serverId - ID asignado por el servidor
 */
export function markAsSynced(localId, serverId) {
  const stmt = db.prepare(`
    UPDATE offline_asistencias
    SET is_synced = 1, server_id = ?, last_sync_attempt = datetime('now', 'localtime')
    WHERE local_id = ?
  `);
  stmt.run(serverId, localId);
}

/**
 * Marca un registro con error de sincronización
 * @param {number} localId
 * @param {string} error - mensaje de error
 * @param {boolean} definitivo - si es un error definitivo (no reintentar)
 */
export function markSyncError(localId, error, definitivo = false) {
  const stmt = db.prepare(`
    UPDATE offline_asistencias
    SET is_synced = CASE WHEN ? = 1 THEN -1 ELSE 0 END,
        sync_attempts = sync_attempts + 1,
        last_sync_error = ?,
        last_sync_attempt = datetime('now', 'localtime')
    WHERE local_id = ?
  `);
  stmt.run(definitivo ? 1 : 0, error, localId);
}

/**
 * Obtiene el conteo de registros pendientes
 * @returns {Object} { pending, errors, synced }
 */
export function getPendingCount() {
  const stmt = db.prepare(`
    SELECT
      SUM(CASE WHEN is_synced = 0 THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN is_synced = -1 THEN 1 ELSE 0 END) as errors,
      SUM(CASE WHEN is_synced = 1 THEN 1 ELSE 0 END) as synced
    FROM offline_asistencias
  `);
  const row = stmt.get();
  return {
    pending: row.pending || 0,
    errors: row.errors || 0,
    synced: row.synced || 0
  };
}

/**
 * Obtiene registros de asistencia del día actual para un empleado
 * (usado para calcular entrada/salida offline)
 * @param {string} empleadoId
 * @returns {Array}
 */
export function getRegistrosHoy(empleadoId) {
  const hoy = new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    SELECT * FROM offline_asistencias
    WHERE empleado_id = ? AND fecha_registro LIKE ? || '%'
    ORDER BY fecha_registro ASC
  `);
  return stmt.all(empleadoId, hoy);
}

/**
 * Obtiene registros con error definitivo para revisión administrativa
 * @returns {Array}
 */
export function getErrorRecords() {
  const stmt = db.prepare(`
    SELECT * FROM offline_asistencias
    WHERE is_synced = -1
    ORDER BY fecha_registro ASC
  `);
  return stmt.all();
}

// ============================================================
// CRUD — CACHÉ DE DATOS MAESTROS
// ============================================================

/**
 * Upsert masivo de empleados desde el servidor
 * @param {Array} empleados - lista de empleados del servidor
 */
export function upsertEmpleados(empleados) {
  const stmt = db.prepare(`
    INSERT INTO cache_empleados (empleado_id, usuario_id, nombre, usuario, correo, estado_cuenta, es_empleado, foto, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(empleado_id) DO UPDATE SET
      usuario_id = excluded.usuario_id,
      nombre = excluded.nombre,
      usuario = excluded.usuario,
      correo = excluded.correo,
      estado_cuenta = excluded.estado_cuenta,
      es_empleado = excluded.es_empleado,
      foto = excluded.foto,
      updated_at = excluded.updated_at
  `);

  const upsertMany = db.transaction((items) => {
    for (const emp of items) {
      stmt.run(
        emp.empleado_id || emp.id,
        emp.usuario_id,
        emp.nombre,
        emp.usuario || null,
        emp.correo || null,
        emp.estado_cuenta || 'activo',
        emp.es_empleado ? 1 : 0,
        emp.foto || null
      );
    }
  });

  upsertMany(empleados);
  updateMetaCount('cache_empleados');
  console.log(`✅ [SQLite] ${empleados.length} empleados cacheados`);
}

/**
 * Upsert masivo de credenciales
 * @param {Array} credenciales
 */
export function upsertCredenciales(credenciales) {
  const stmt = db.prepare(`
    INSERT INTO cache_credenciales (id, empleado_id, pin_hash, dactilar_template, facial_descriptor, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(id) DO UPDATE SET
      empleado_id = excluded.empleado_id,
      pin_hash = excluded.pin_hash,
      dactilar_template = excluded.dactilar_template,
      facial_descriptor = excluded.facial_descriptor,
      updated_at = excluded.updated_at
  `);

  const upsertMany = db.transaction((items) => {
    for (const cred of items) {
      stmt.run(
        cred.id,
        cred.empleado_id,
        cred.pin_hash || cred.pin || null,
        cred.dactilar_template || cred.dactilar || null,
        cred.facial_descriptor || cred.facial || null
      );
    }
  });

  upsertMany(credenciales);
  updateMetaCount('cache_credenciales');
  console.log(`✅ [SQLite] ${credenciales.length} credenciales cacheadas`);
}

/**
 * Upsert de horario para un empleado
 * @param {string} empleadoId
 * @param {Object} horario
 */
export function upsertHorario(empleadoId, horario) {
  const stmt = db.prepare(`
    INSERT INTO cache_horarios (horario_id, empleado_id, configuracion, es_activo, updated_at)
    VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(horario_id) DO UPDATE SET
      empleado_id = excluded.empleado_id,
      configuracion = excluded.configuracion,
      es_activo = excluded.es_activo,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    horario.id || horario.horario_id,
    empleadoId,
    typeof horario.configuracion === 'string' ? horario.configuracion : JSON.stringify(horario.configuracion),
    horario.es_activo ? 1 : 0
  );
}

/**
 * Upsert de tolerancia para un empleado
 * @param {string} empleadoId
 * @param {Object} tolerancia
 */
export function upsertTolerancia(empleadoId, tolerancia) {
  const stmt = db.prepare(`
    INSERT INTO cache_tolerancias
      (empleado_id, nombre, minutos_retardo, minutos_falta, permite_anticipado, minutos_anticipado_max, aplica_tolerancia_entrada, aplica_tolerancia_salida, dias_aplica, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(empleado_id) DO UPDATE SET
      nombre = excluded.nombre,
      minutos_retardo = excluded.minutos_retardo,
      minutos_falta = excluded.minutos_falta,
      permite_anticipado = excluded.permite_anticipado,
      minutos_anticipado_max = excluded.minutos_anticipado_max,
      aplica_tolerancia_entrada = excluded.aplica_tolerancia_entrada,
      aplica_tolerancia_salida = excluded.aplica_tolerancia_salida,
      dias_aplica = excluded.dias_aplica,
      updated_at = excluded.updated_at
  `);

  const diasAplica = tolerancia.dias_aplica
    ? (typeof tolerancia.dias_aplica === 'string' ? tolerancia.dias_aplica : JSON.stringify(tolerancia.dias_aplica))
    : null;

  stmt.run(
    empleadoId,
    tolerancia.nombre || null,
    tolerancia.minutos_retardo ?? 10,
    tolerancia.minutos_falta ?? 30,
    tolerancia.permite_registro_anticipado ? 1 : 0,
    tolerancia.minutos_anticipado_max ?? 60,
    tolerancia.aplica_tolerancia_entrada != null ? (tolerancia.aplica_tolerancia_entrada ? 1 : 0) : 1,
    tolerancia.aplica_tolerancia_salida ? 1 : 0,
    diasAplica
  );
}

/**
 * Upsert de departamentos para un empleado
 * @param {string} empleadoId
 * @param {Array} departamentos
 */
export function upsertDepartamentos(empleadoId, departamentos) {
  const stmt = db.prepare(`
    INSERT INTO cache_departamentos (empleado_id, departamento_id, nombre, es_activo, updated_at)
    VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(empleado_id, departamento_id) DO UPDATE SET
      nombre = excluded.nombre,
      es_activo = excluded.es_activo,
      updated_at = excluded.updated_at
  `);

  const upsertMany = db.transaction((items) => {
    for (const dept of items) {
      stmt.run(
        empleadoId,
        dept.id || dept.departamento_id,
        dept.nombre || null,
        dept.es_activo ? 1 : 0
      );
    }
  });

  upsertMany(departamentos);
}

// ============================================================
// LECTURAS — Para autenticación y lógica offline
// ============================================================

/**
 * Obtiene un empleado por su ID desde la caché
 * @param {string} empleadoId
 * @returns {Object|undefined}
 */
export function getEmpleado(empleadoId) {
  const stmt = db.prepare('SELECT * FROM cache_empleados WHERE empleado_id = ? AND estado_cuenta = ?');
  return stmt.get(empleadoId, 'activo');
}

/**
 * Obtiene TODOS los empleados activos desde la caché
 * @returns {Array}
 */
export function getAllEmpleados() {
  if (!db) return [];
  const stmt = db.prepare("SELECT * FROM cache_empleados WHERE estado_cuenta = 'activo'");
  return stmt.all();
}

/**
 * Obtiene las credenciales de un empleado
 * @param {string} empleadoId
 * @returns {Object|undefined}
 */
export function getCredenciales(empleadoId) {
  const stmt = db.prepare('SELECT * FROM cache_credenciales WHERE empleado_id = ?');
  return stmt.get(empleadoId);
}

/**
 * Obtiene TODAS las credenciales (para matching 1:N offline)
 * @returns {Array}
 */
export function getAllCredenciales() {
  const stmt = db.prepare(`
    SELECT cc.*, ce.nombre, ce.estado_cuenta
    FROM cache_credenciales cc
    INNER JOIN cache_empleados ce ON ce.empleado_id = cc.empleado_id
    WHERE ce.estado_cuenta = 'activo'
  `);
  return stmt.all();
}

/**
 * Obtiene el horario activo de un empleado
 * @param {string} empleadoId
 * @returns {Object|undefined}
 */
export function getHorario(empleadoId) {
  const stmt = db.prepare('SELECT * FROM cache_horarios WHERE empleado_id = ? AND es_activo = 1');
  const row = stmt.get(empleadoId);
  if (row && row.configuracion) {
    try {
      row.configuracion = JSON.parse(row.configuracion);
    } catch (e) {
      // Ya es un objeto
    }
  }
  return row;
}

/**
 * Obtiene la tolerancia de un empleado
 * @param {string} empleadoId
 * @returns {Object}
 */
export function getTolerancia(empleadoId) {
  const stmt = db.prepare('SELECT * FROM cache_tolerancias WHERE empleado_id = ?');
  const row = stmt.get(empleadoId);
  if (row && row.dias_aplica) {
    try {
      row.dias_aplica = JSON.parse(row.dias_aplica);
    } catch (e) {
      // Already parsed or invalid
    }
  }
  return row || {
    minutos_retardo: 10,
    minutos_falta: 30,
    permite_anticipado: 1,
    minutos_anticipado_max: 60,
    aplica_tolerancia_entrada: 1,
    aplica_tolerancia_salida: 0,
    dias_aplica: null
  };
}

/**
 * Obtiene el departamento activo de un empleado
 * @param {string} empleadoId
 * @returns {Object|undefined}
 */
export function getDepartamento(empleadoId) {
  const stmt = db.prepare('SELECT * FROM cache_departamentos WHERE empleado_id = ? AND es_activo = 1 LIMIT 1');
  return stmt.get(empleadoId);
}

// ============================================================
// METADATA DE SINCRONIZACIÓN
// ============================================================

/**
 * Actualiza el conteo de registros de una tabla
 * @param {string} tabla
 */
function updateMetaCount(tabla) {
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${tabla}`);
  const count = countStmt.get().count;
  const updateStmt = db.prepare('UPDATE sync_metadata SET total_records = ? WHERE tabla = ?');
  updateStmt.run(count, tabla);
}

/**
 * Registra el timestamp de un full sync
 * @param {string} tabla
 */
export function setLastFullSync(tabla) {
  const stmt = db.prepare(`
    UPDATE sync_metadata SET last_full_sync = datetime('now', 'localtime') WHERE tabla = ?
  `);
  stmt.run(tabla);
}

/**
 * Registra el timestamp de un sync incremental
 * @param {string} tabla
 */
export function setLastIncrementalSync(tabla) {
  const stmt = db.prepare(`
    UPDATE sync_metadata SET last_incremental_sync = datetime('now', 'localtime') WHERE tabla = ?
  `);
  stmt.run(tabla);
}

/**
 * Obtiene metadata de sync
 * @param {string} tabla
 * @returns {Object|undefined}
 */
export function getSyncMetadata(tabla) {
  const stmt = db.prepare('SELECT * FROM sync_metadata WHERE tabla = ?');
  return stmt.get(tabla);
}

/**
 * Obtiene toda la metadata de sincronización
 * @returns {Array}
 */
export function getAllSyncMetadata() {
  const stmt = db.prepare('SELECT * FROM sync_metadata');
  return stmt.all();
}

/**
 * Elimina empleados del caché que ya no existen en el servidor
 * @param {Array} serverIds - IDs de empleados que existen en el servidor
 * @returns {number} cantidad de empleados marcados como eliminados
 */
export function markDeletedEmpleados(serverIds) {
  if (!serverIds || serverIds.length === 0) return 0;

  const placeholders = serverIds.map(() => '?').join(',');
  const stmt = db.prepare(`
    UPDATE cache_empleados
    SET estado_cuenta = 'eliminado', updated_at = datetime('now', 'localtime')
    WHERE empleado_id NOT IN (${placeholders}) AND estado_cuenta != 'eliminado'
  `);
  const result = stmt.run(...serverIds);
  if (result.changes > 0) {
    console.log(`⚠️ [SQLite] ${result.changes} empleados marcados como eliminados`);
  }
  return result.changes;
}

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Cierra la conexión a la base de datos
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('🔒 [SQLite] Base de datos cerrada');
  }
}

/**
 * Obtiene la instancia de la base de datos
 * @returns {Database|null}
 */
export function getDatabase() {
  return db;
}

export default {
  initDatabase,
  closeDatabase,
  getDatabase,
  // Asistencias offline
  saveOfflineAsistencia,
  getPendingAsistencias,
  markAsSynced,
  markSyncError,
  getPendingCount,
  getRegistrosHoy,
  getErrorRecords,
  // Caché de datos maestros
  upsertEmpleados,
  upsertCredenciales,
  upsertHorario,
  upsertTolerancia,
  upsertDepartamentos,
  markDeletedEmpleados,
  // Lecturas
  getEmpleado,
  getAllEmpleados,
  getCredenciales,
  getAllCredenciales,
  getHorario,
  getTolerancia,
  getDepartamento,
  // Sync metadata
  setLastFullSync,
  setLastIncrementalSync,
  getSyncMetadata,
  getAllSyncMetadata,
};
