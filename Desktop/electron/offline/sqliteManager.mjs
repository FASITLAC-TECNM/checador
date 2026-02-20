/**
 * SQLiteManager — Módulo de persistencia local Offline-First
 * Gestiona la base de datos SQLite para cola de asistencias y caché de datos maestros.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

let db = null;

// Mapa de nombres reales a ofuscados para funciones dinámicas
const DB_MAP = {
  'offline_asistencias': 'kLoPs9',
  'cache_empleados': 'XyZam',
  'cache_credenciales': 'qWeRt1',
  'cache_horarios': 'mNoP',
  'cache_tolerancias': 'aBcD3',
  'cache_roles': 'ZzTop',
  'cache_usuarios_roles': 'uR_x2',
  'cache_departamentos': 'DpT_5',
  'sync_metadata': 'MeTaX'
};

function getObfuscatedTableName(realName) {
  return DB_MAP[realName] || realName;
}

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
    -- Cola de registros de asistencia pendientes (OFUSCADO)
    CREATE TABLE IF NOT EXISTS kLoPs9 (
      L_id1 INTEGER PRIMARY KEY AUTOINCREMENT,
      iK_99 TEXT NOT NULL UNIQUE,
      sRv_D TEXT,
      eMp_X TEXT NOT NULL,
      tYp_3 TEXT NOT NULL CHECK(tYp_3 IN ('IN_1', 'OUT_0')),
      st_5 TEXT NOT NULL,
      src_D TEXT DEFAULT 'dSk_T',
      mTh_R TEXT NOT NULL CHECK(mTh_R IN ('pN_Val', 'fP_Val', 'fC_Val')),
      dEp_I TEXT,
      dT_Rg TEXT NOT NULL,
      bIo_P TEXT,
      iS_yn INTEGER DEFAULT 0,
      s_AtM INTEGER DEFAULT 0,
      l_ErR TEXT,
      l_AtT TEXT,
      cR_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Caché de empleados (OFUSCADO)
    CREATE TABLE IF NOT EXISTS XyZam (
      eMp_K TEXT PRIMARY KEY,
      uSr_I TEXT NOT NULL,
      nM_b TEXT NOT NULL,
      uS_r TEXT,
      mAi_L TEXT,
      sT_aC TEXT NOT NULL DEFAULT 'aC_Tv',
      iS_eM INTEGER DEFAULT 1,
      pIc_T TEXT,
      uP_dt TEXT NOT NULL
    );

    -- Caché de credenciales para validación offline (OFUSCADO)
    CREATE TABLE IF NOT EXISTS qWeRt1 (
      cRd_D TEXT PRIMARY KEY,
      eM_p2 TEXT NOT NULL,
      pN_h TEXT,
      fP_tM BLOB,
      fC_dS BLOB,
      uP_d2 TEXT NOT NULL
    );

    -- Caché de horarios (OFUSCADO)
    CREATE TABLE IF NOT EXISTS mNoP (
      hR_iD TEXT PRIMARY KEY,
      eM_p3 TEXT NOT NULL,
      cF_g TEXT NOT NULL,
      iS_a2 INTEGER DEFAULT 1,
      uP_d3 TEXT NOT NULL
    );

    -- Caché de tolerancias (OFUSCADO)
    CREATE TABLE IF NOT EXISTS aBcD3 (
      tL_iD TEXT PRIMARY KEY,
      nM_t TEXT,
      m_Rt INTEGER DEFAULT 10,
      m_Ft INTEGER DEFAULT 30,
      p_Ra INTEGER DEFAULT 1,
      m_Am INTEGER DEFAULT 60,
      a_Te INTEGER DEFAULT 1,
      a_Ts INTEGER DEFAULT 0,
      d_Ap TEXT,
      uP_d4 TEXT NOT NULL
    );

    -- Caché de roles (OFUSCADO)
    CREATE TABLE IF NOT EXISTS ZzTop (
      rL_iD TEXT PRIMARY KEY,
      nM_r TEXT,
      tL_r2 TEXT,
      pOs_N INTEGER DEFAULT 0,
      uP_d5 TEXT NOT NULL
    );

    -- Caché de usuarios_roles (OFUSCADO)
    CREATE TABLE IF NOT EXISTS uR_x2 (
      uS_r2 TEXT NOT NULL,
      rL_i2 TEXT NOT NULL,
      iS_a3 INTEGER DEFAULT 1,
      uP_d6 TEXT NOT NULL,
      PRIMARY KEY (uS_r2, rL_i2)
    );

    -- Caché de departamentos del empleado (OFUSCADO)
    CREATE TABLE IF NOT EXISTS DpT_5 (
      eM_p4 TEXT NOT NULL,
      dP_iD TEXT NOT NULL,
      nM_d TEXT,
      iS_a4 INTEGER DEFAULT 1,
      uP_d7 TEXT NOT NULL,
      PRIMARY KEY (eM_p4, dP_iD)
    );

    -- Metadata de sincronización (OFUSCADO)
    CREATE TABLE IF NOT EXISTS MeTaX (
      tB_L TEXT PRIMARY KEY,
      l_Fs TEXT,
      l_Is TEXT,
      t_Rc INTEGER DEFAULT 0
    );

    -- Índices para rendimiento (OFUSCADO)
    CREATE INDEX IF NOT EXISTS idx_kLoPs9_synced
      ON kLoPs9(iS_yn);
    CREATE INDEX IF NOT EXISTS idx_kLoPs9_empleado
      ON kLoPs9(eMp_X, dT_Rg);
    CREATE INDEX IF NOT EXISTS idx_qWeRt1_empleado
      ON qWeRt1(eM_p2);
    CREATE INDEX IF NOT EXISTS idx_mNoP_empleado
      ON mNoP(eM_p3);
  `);

  // Inicializar MeTaX si están vacías
  const initMeta = db.prepare(`
    INSERT OR IGNORE INTO MeTaX (tB_L) VALUES (?)
  `);
  const tables = ['XyZam', 'qWeRt1', 'mNoP', 'aBcD3', 'ZzTop', 'uR_x2', 'DpT_5'];
  for (const t of tables) {
    initMeta.run(t);
  }

  // Migración: agregar columnas usuario y correo si no existen (OFUSCADO)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(XyZam)").all();
    const columns = tableInfo.map(col => col.name);
    if (!columns.includes('uS_r')) {
      db.exec("ALTER TABLE XyZam ADD COLUMN uS_r TEXT");
      console.log('🔄 [SQLite] Migración: columna "uS_r" (usuario) agregada a XyZam');
    }
    if (!columns.includes('mAi_L')) {
      db.exec("ALTER TABLE XyZam ADD COLUMN mAi_L TEXT");
      console.log('🔄 [SQLite] Migración: columna "mAi_L" (correo) agregada a XyZam');
    }
  } catch (alterError) {
    console.warn('⚠️ [SQLite] Error en migración de columnas:', alterError.message);
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
    INSERT INTO kLoPs9
      (iK_99, eMp_X, tYp_3, st_5, src_D, mTh_R,
       dEp_I, dT_Rg, bIo_P)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Mapeo inverso de ENUMs para guardar ofuscado
  const tipoMap = { 'entrada': 'IN_1', 'salida': 'OUT_0' };
  const metodoMap = { 'PIN': 'pN_Val', 'HUELLA': 'fP_Val', 'FACIAL': 'fC_Val' };
  const origenMap = { 'escritorio': 'dSk_T' };

  const result = stmt.run(
    idempotencyKey,
    data.empleado_id,
    tipoMap[data.tipo] || data.tipo,
    data.estado,
    origenMap[data.dispositivo_origen] || 'dSk_T',
    metodoMap[data.metodo_registro] || data.metodo_registro,
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
    SELECT 
      L_id1 AS local_id,
      iK_99 AS idempotency_key,
      sRv_D AS server_id,
      eMp_X AS empleado_id,
      CASE tYp_3 WHEN 'IN_1' THEN 'entrada' WHEN 'OUT_0' THEN 'salida' ELSE tYp_3 END AS tipo,
      st_5 AS estado,
      CASE src_D WHEN 'dSk_T' THEN 'escritorio' ELSE src_D END AS dispositivo_origen,
      CASE mTh_R WHEN 'pN_Val' THEN 'PIN' WHEN 'fP_Val' THEN 'HUELLA' WHEN 'fC_Val' THEN 'FACIAL' ELSE mTh_R END AS metodo_registro,
      dEp_I AS departamento_id,
      dT_Rg AS fecha_registro,
      bIo_P AS payload_biometrico,
      iS_yn AS is_synced,
      s_AtM AS sync_attempts,
      l_ErR AS last_sync_error,
      l_AtT AS last_sync_attempt,
      cR_at AS created_at
    FROM kLoPs9
    WHERE iS_yn = 0
    ORDER BY dT_Rg ASC
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
    UPDATE kLoPs9
    SET iS_yn = 1, sRv_D = ?, l_AtT = datetime('now', 'localtime')
    WHERE L_id1 = ?
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
    UPDATE kLoPs9
    SET iS_yn = CASE WHEN ? = 1 THEN -1 ELSE 0 END,
        s_AtM = s_AtM + 1,
        l_ErR = ?,
        l_AtT = datetime('now', 'localtime')
    WHERE L_id1 = ?
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
      SUM(CASE WHEN iS_yn = 0 THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN iS_yn = -1 THEN 1 ELSE 0 END) as errors,
      SUM(CASE WHEN iS_yn = 1 THEN 1 ELSE 0 END) as synced
    FROM kLoPs9
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
    SELECT 
      L_id1 AS local_id,
      iK_99 AS idempotency_key,
      sRv_D AS server_id,
      eMp_X AS empleado_id,
      CASE tYp_3 WHEN 'IN_1' THEN 'entrada' WHEN 'OUT_0' THEN 'salida' ELSE tYp_3 END AS tipo,
      st_5 AS estado,
      CASE src_D WHEN 'dSk_T' THEN 'escritorio' ELSE src_D END AS dispositivo_origen,
      CASE mTh_R WHEN 'pN_Val' THEN 'PIN' WHEN 'fP_Val' THEN 'HUELLA' WHEN 'fC_Val' THEN 'FACIAL' ELSE mTh_R END AS metodo_registro,
      dEp_I AS departamento_id,
      dT_Rg AS fecha_registro,
      bIo_P AS payload_biometrico,
      iS_yn AS is_synced,
      s_AtM AS sync_attempts,
      l_ErR AS last_sync_error,
      l_AtT AS last_sync_attempt,
      cR_at AS created_at
    FROM kLoPs9
    WHERE eMp_X = ? AND dT_Rg LIKE ? || '%'
    ORDER BY dT_Rg ASC
  `);
  return stmt.all(empleadoId, hoy);
}

/**
 * Obtiene registros de asistencia offline de un empleado en un rango de fechas
 * @param {string} empleadoId
 * @param {string} fechaInicio - formato YYYY-MM-DD
 * @param {string} fechaFin - formato YYYY-MM-DD
 * @returns {Array}
 */
export function getRegistrosByRange(empleadoId, fechaInicio, fechaFin) {
  const stmt = db.prepare(`
    SELECT 
      L_id1 AS local_id,
      iK_99 AS idempotency_key,
      sRv_D AS server_id,
      eMp_X AS empleado_id,
      CASE tYp_3 WHEN 'IN_1' THEN 'entrada' WHEN 'OUT_0' THEN 'salida' ELSE tYp_3 END AS tipo,
      st_5 AS estado,
      CASE src_D WHEN 'dSk_T' THEN 'escritorio' ELSE src_D END AS dispositivo_origen,
      CASE mTh_R WHEN 'pN_Val' THEN 'PIN' WHEN 'fP_Val' THEN 'HUELLA' WHEN 'fC_Val' THEN 'FACIAL' ELSE mTh_R END AS metodo_registro,
      dEp_I AS departamento_id,
      dT_Rg AS fecha_registro,
      bIo_P AS payload_biometrico,
      iS_yn AS is_synced,
      s_AtM AS sync_attempts,
      l_ErR AS last_sync_error,
      l_AtT AS last_sync_attempt,
      cR_at AS created_at
    FROM kLoPs9
    WHERE eMp_X = ?
      AND dT_Rg >= ?
      AND dT_Rg < date(?, '+1 day')
    ORDER BY dT_Rg DESC
  `);
  return stmt.all(empleadoId, fechaInicio, fechaFin);
}

/**
 * Obtiene registros con error definitivo para revisión administrativa
 * @returns {Array}
 */
export function getErrorRecords() {
  const stmt = db.prepare(`
    SELECT 
        L_id1 AS local_id,
        iK_99 AS idempotency_key,
        sRv_D AS server_id,
        eMp_X AS empleado_id,
        CASE tYp_3 WHEN 'IN_1' THEN 'entrada' WHEN 'OUT_0' THEN 'salida' ELSE tYp_3 END AS tipo,
        st_5 AS estado,
        CASE src_D WHEN 'dSk_T' THEN 'escritorio' ELSE src_D END AS dispositivo_origen,
        CASE mTh_R WHEN 'pN_Val' THEN 'PIN' WHEN 'fP_Val' THEN 'HUELLA' WHEN 'fC_Val' THEN 'FACIAL' ELSE mTh_R END AS metodo_registro,
        dEp_I AS departamento_id,
        dT_Rg AS fecha_registro,
        bIo_P AS payload_biometrico,
        iS_yn AS is_synced,
        s_AtM AS sync_attempts,
        l_ErR AS last_sync_error,
        l_AtT AS last_sync_attempt,
        cR_at AS created_at
    FROM kLoPs9
    WHERE iS_yn = -1
    ORDER BY dT_Rg ASC
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
    INSERT INTO XyZam(eMp_K, uSr_I, nM_b, uS_r, mAi_L, sT_aC, iS_eM, pIc_T, uP_dt)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(eMp_K) DO UPDATE SET
      uSr_I = excluded.uSr_I,
      nM_b = excluded.nM_b,
      uS_r = excluded.uS_r,
      mAi_L = excluded.mAi_L,
      sT_aC = excluded.sT_aC,
      iS_eM = excluded.iS_eM,
      pIc_T = excluded.pIc_T,
      uP_dt = excluded.uP_dt
  `);

  const upsertMany = db.transaction((items) => {
    for (const emp of items) {
      stmt.run(
        emp.empleado_id || emp.id,
        emp.usuario_id,
        emp.nombre,
        emp.usuario || null,
        emp.correo || null,
        (emp.estado_cuenta === 'activo' ? 'aC_Tv' : emp.estado_cuenta) || 'aC_Tv',
        emp.es_empleado ? 1 : 0,
        emp.foto || null
      );
    }
  });

  upsertMany(empleados);
  updateMetaCount('XyZam');
  console.log(`✅[SQLite] ${empleados.length} empleados cacheados`);
}

/**
 * Upsert masivo de credenciales
 * @param {Array} credenciales
 */
export function upsertCredenciales(credenciales) {
  /*
    // TODO: [SEGURIDAD] Este envío no está cifrado. Pendiente cifrar BD central.
    // La app descarga datos del servidor y los guarda aquí.
  */
  const stmt = db.prepare(`
    INSERT INTO qWeRt1(cRd_D, eM_p2, pN_h, fP_tM, fC_dS, uP_d2)
    VALUES(?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(cRd_D) DO UPDATE SET
      eM_p2 = excluded.eM_p2,
      pN_h = excluded.pN_h,
      fP_tM = excluded.fP_tM,
      fC_dS = excluded.fC_dS,
      uP_d2 = excluded.uP_d2
  `);

  const upsertMany = db.transaction((items) => {
    for (const cred of items) {
      // Serializar campos que puedan ser objetos (defensivo)
      let dactilar = cred.dactilar_template || cred.dactilar || null;
      let facial = cred.facial_descriptor || cred.facial || null;
      if (dactilar && typeof dactilar === 'object') {
        dactilar = JSON.stringify(dactilar);
      }
      if (facial && typeof facial === 'object') {
        facial = JSON.stringify(facial);
      }

      stmt.run(
        cred.id,
        cred.empleado_id,
        cred.pin_hash || cred.pin || null,
        dactilar,
        facial
      );
    }
  });

  upsertMany(credenciales);
  updateMetaCount('qWeRt1');
  console.log(`✅[SQLite] ${credenciales.length} credenciales cacheadas`);
}

/**
 * Upsert de horario para un empleado
 * @param {string} empleadoId
 * @param {Object} horario
 */
export function upsertHorario(empleadoId, horario) {
  const stmt = db.prepare(`
    INSERT INTO mNoP(hR_iD, eM_p3, cF_g, iS_a2, uP_d3)
    VALUES(?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(hR_iD) DO UPDATE SET
      eM_p3 = excluded.eM_p3,
      cF_g = excluded.cF_g,
      iS_a2 = excluded.iS_a2,
      uP_d3 = excluded.uP_d3
  `);

  stmt.run(
    horario.id || horario.horario_id,
    empleadoId,
    typeof horario.configuracion === 'string' ? horario.configuracion : JSON.stringify(horario.configuracion),
    horario.es_activo ? 1 : 0
  );
}

/**
 * Upsert masivo de tolerancias (espejo de tabla tolerancias del servidor)
 * @param {Array} tolerancias - [{id, nombre, minutos_retardo, ...}]
 */
export function upsertToleranciasBulk(tolerancias) {
  const stmt = db.prepare(`
    INSERT INTO aBcD3
    (tL_iD, nM_t, m_Rt, m_Ft, p_Ra, m_Am, a_Te, a_Ts, d_Ap, uP_d4)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(tL_iD) DO UPDATE SET
      nM_t = excluded.nM_t,
      m_Rt = excluded.m_Rt,
      m_Ft = excluded.m_Ft,
      p_Ra = excluded.p_Ra,
      m_Am = excluded.m_Am,
      a_Te = excluded.a_Te,
      a_Ts = excluded.a_Ts,
      d_Ap = excluded.d_Ap,
      uP_d4 = excluded.uP_d4
  `);

  const upsertMany = db.transaction((items) => {
    for (const tol of items) {
      const diasAplica = tol.dias_aplica
        ? (typeof tol.dias_aplica === 'string' ? tol.dias_aplica : JSON.stringify(tol.dias_aplica))
        : null;

      stmt.run(
        tol.id,
        tol.nombre || null,
        tol.minutos_retardo ?? 10,
        tol.minutos_falta ?? 30,
        tol.permite_registro_anticipado ? 1 : 0,
        tol.minutos_anticipado_max ?? 60,
        tol.aplica_tolerancia_entrada != null ? (tol.aplica_tolerancia_entrada ? 1 : 0) : 1,
        tol.aplica_tolerancia_salida ? 1 : 0,
        diasAplica
      );
    }
  });

  upsertMany(tolerancias);
  updateMetaCount('aBcD3');
  console.log(`✅[SQLite] ${tolerancias.length} tolerancias cacheadas`);
}

/**
 * Upsert masivo de roles (espejo de tabla roles del servidor)
 * @param {Array} roles - [{id, nombre, tolerancia_id, posicion}]
 */
export function upsertRoles(roles) {
  const stmt = db.prepare(`
    INSERT INTO ZzTop(rL_iD, nM_r, tL_r2, pOs_N, uP_d5)
    VALUES(?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(rL_iD) DO UPDATE SET
      nM_r = excluded.nM_r,
      tL_r2 = excluded.tL_r2,
      pOs_N = excluded.pOs_N,
      uP_d5 = excluded.uP_d5
  `);

  const upsertMany = db.transaction((items) => {
    for (const rol of items) {
      stmt.run(
        rol.id,
        rol.nombre || null,
        rol.tolerancia_id || null,
        rol.posicion ?? 0
      );
    }
  });

  upsertMany(roles);
  updateMetaCount('ZzTop');
  console.log(`✅[SQLite] ${roles.length} roles cacheados`);
}

/**
 * Upsert masivo de usuarios_roles (espejo de tabla usuarios_roles del servidor)
 * @param {Array} items - [{usuario_id, rol_id, es_activo}]
 */
export function upsertUsuariosRoles(items) {
  const stmt = db.prepare(`
    INSERT INTO uR_x2(uS_r2, rL_i2, iS_a3, uP_d6)
    VALUES(?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(uS_r2, rL_i2) DO UPDATE SET
      iS_a3 = excluded.iS_a3,
      uP_d6 = excluded.uP_d6
  `);

  const upsertMany = db.transaction((rows) => {
    for (const ur of rows) {
      stmt.run(
        ur.usuario_id,
        ur.rol_id,
        ur.es_activo != null ? (ur.es_activo ? 1 : 0) : 1
      );
    }
  });

  upsertMany(items);
  updateMetaCount('uR_x2');
  console.log(`✅[SQLite] ${items.length} usuarios_roles cacheados`);
}

/**
 * Upsert de departamentos para un empleado
 * @param {string} empleadoId
 * @param {Array} departamentos
 */
export function upsertDepartamentos(empleadoId, departamentos) {
  const stmt = db.prepare(`
    INSERT INTO DpT_5(eM_p4, dP_iD, nM_d, iS_a4, uP_d7)
    VALUES(?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(eM_p4, dP_iD) DO UPDATE SET
      nM_d = excluded.nM_d,
      iS_a4 = excluded.iS_a4,
      uP_d7 = excluded.uP_d7
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
  const stmt = db.prepare(`
    SELECT
      eMp_K AS empleado_id,
      uSr_I AS usuario_id,
      nM_b AS nombre,
      uS_r AS usuario,
      mAi_L AS correo,
      CASE sT_aC WHEN 'aC_Tv' THEN 'activo' ELSE sT_aC END AS estado_cuenta,
      iS_eM AS es_empleado,
      pIc_T AS foto,
      uP_dt AS updated_at
    FROM XyZam
    WHERE eMp_K = ? AND sT_aC = 'aC_Tv'
  `);
  return stmt.get(empleadoId);
}

/**
 * Obtiene TODOS los empleados activos desde la caché
 * @returns {Array}
 */
export function getAllEmpleados() {
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT
      eMp_K AS empleado_id,
      uSr_I AS usuario_id,
      nM_b AS nombre,
      uS_r AS usuario,
      mAi_L AS correo,
      CASE sT_aC WHEN 'aC_Tv' THEN 'activo' ELSE sT_aC END AS estado_cuenta,
      iS_eM AS es_empleado,
      pIc_T AS foto,
      uP_dt AS updated_at
    FROM XyZam
    WHERE sT_aC = 'aC_Tv'
  `);
  return stmt.all();
}

/**
 * Obtiene las credenciales de un empleado
 * @param {string} empleadoId
 * @returns {Object|undefined}
 */
export function getCredenciales(empleadoId) {
  const stmt = db.prepare(`
    SELECT 
      cRd_D AS id,
      eM_p2 AS empleado_id,
      pN_h AS pin_hash,
      fP_tM AS dactilar_template,
      fC_dS AS facial_descriptor,
      uP_d2 AS updated_at
    FROM qWeRt1
    WHERE eM_p2 = ?
  `);
  return stmt.get(empleadoId);
}

/**
 * Obtiene TODAS las credenciales (para matching 1:N offline)
 * @returns {Array}
 */
export function getAllCredenciales() {
  const stmt = db.prepare(`
    SELECT 
      cc.cRd_D AS id,
      cc.eM_p2 AS empleado_id,
      cc.pN_h AS pin_hash,
      cc.fP_tM AS dactilar_template,
      cc.fC_dS AS facial_descriptor,
      cc.uP_d2 AS updated_at,
      ce.nM_b AS nombre,
      CASE ce.sT_aC WHEN 'aC_Tv' THEN 'activo' ELSE ce.sT_aC END AS estado_cuenta
    FROM qWeRt1 cc
    INNER JOIN XyZam ce ON ce.eMp_K = cc.eM_p2
    WHERE ce.sT_aC = 'aC_Tv'
  `);
  return stmt.all();
}

/**
 * Obtiene el horario activo de un empleado
 * @param {string} empleadoId
 * @returns {Object|undefined}
 */
export function getHorario(empleadoId) {
  const stmt = db.prepare(`
    SELECT 
      hR_iD AS horario_id,
      eM_p3 AS empleado_id,
      cF_g AS configuracion,
      iS_a2 AS es_activo,
      uP_d3 AS updated_at
    FROM mNoP
    WHERE eM_p3 = ? AND iS_a2 = 1
  `);
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
  // JOIN: cache_empleados → cache_usuarios_roles → cache_roles → cache_tolerancias
  const stmt = db.prepare(`
    SELECT 
      t.tL_iD AS id,
      t.nM_t AS nombre,
      t.m_Rt AS minutos_retardo,
      t.m_Ft AS minutos_falta,
      t.p_Ra AS permite_registro_anticipado,
      t.m_Am AS minutos_anticipado_max,
      t.a_Te AS aplica_tolerancia_entrada,
      t.a_Ts AS aplica_tolerancia_salida,
      t.d_Ap AS dias_aplica,
      t.uP_d4 AS updated_at
    FROM XyZam e
    INNER JOIN uR_x2 ur ON ur.uS_r2 = e.uSr_I AND ur.iS_a3 = 1
    INNER JOIN ZzTop r ON r.rL_iD = ur.rL_i2
    INNER JOIN aBcD3 t ON t.tL_iD = r.tL_r2
    WHERE e.eMp_K = ?
    ORDER BY r.pOs_N ASC
    LIMIT 1
  `);
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
    permite_registro_anticipado: 1,
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
  const stmt = db.prepare(`
    SELECT 
      eM_p4 AS empleado_id,
      dP_iD AS departamento_id,
      nM_d AS nombre,
      iS_a4 AS es_activo,
      uP_d7 AS updated_at
    FROM DpT_5
    WHERE eM_p4 = ? AND iS_a4 = 1
    LIMIT 1
  `);
  return stmt.get(empleadoId);
}

// ============================================================
// METADATA DE SINCRONIZACIÓN
// ============================================================

/**
 * Actualiza el conteo de registros de una tabla
 * @param {string} tabla - nombre lógico o físico de la tabla
 */
function updateMetaCount(tabla) {
  const dbName = getObfuscatedTableName(tabla);
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${dbName}`);
  const count = countStmt.get().count;
  const updateStmt = db.prepare('UPDATE MeTaX SET t_Rc = ? WHERE tB_L = ?');
  updateStmt.run(count, dbName);
}

/**
 * Registra el timestamp de un full sync
 * @param {string} tabla - nombre lógico o físico de la tabla
 */
export function setLastFullSync(tabla) {
  const dbName = getObfuscatedTableName(tabla);
  const stmt = db.prepare(`
    UPDATE MeTaX SET l_Fs = datetime('now', 'localtime') WHERE tB_L = ?
  `);
  stmt.run(dbName);
}

/**
 * Registra el timestamp de un sync incremental
 * @param {string} tabla - nombre lógico o físico de la tabla
 */
export function setLastIncrementalSync(tabla) {
  const dbName = getObfuscatedTableName(tabla);
  const stmt = db.prepare(`
    UPDATE MeTaX SET l_Is = datetime('now', 'localtime') WHERE tB_L = ?
  `);
  stmt.run(dbName);
}

/**
 * Obtiene metadata de sync
 * @param {string} tabla - nombre lógico o físico de la tabla
 * @returns {Object|undefined}
 */
export function getSyncMetadata(tabla) {
  const dbName = getObfuscatedTableName(tabla);
  const stmt = db.prepare(`
    SELECT 
      tB_L AS tabla,
      l_Fs AS last_full_sync,
      l_Is AS last_incremental_sync,
      t_Rc AS total_records
    FROM MeTaX 
    WHERE tB_L = ?
  `);
  return stmt.get(dbName);
}

/**
 * Obtiene toda la metadata de sincronización
 * @returns {Array}
 */
export function getAllSyncMetadata() {
  const stmt = db.prepare(`
    SELECT 
      tB_L AS tabla,
      l_Fs AS last_full_sync,
      l_Is AS last_incremental_sync,
      t_Rc AS total_records
    FROM MeTaX
  `);
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
    UPDATE XyZam
    SET sT_aC = 'eliminado', uP_dt = datetime('now', 'localtime')
    WHERE eMp_K NOT IN(${placeholders}) AND sT_aC != 'eliminado'
  `);
  const result = stmt.run(...serverIds);
  if (result.changes > 0) {
    console.log(`⚠️[SQLite] ${result.changes} empleados marcados como eliminados`);
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
  upsertToleranciasBulk,
  upsertRoles,
  upsertUsuariosRoles,
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
