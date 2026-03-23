







import * as SQLite from 'expo-sqlite';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

let db = null;
let initializationPromise = null;
const DB_NAME = 'checador_offline.db';










export async function initDatabase() {
  if (db) return db;


  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const database = await SQLite.openDatabaseAsync(DB_NAME);


      try {
        await database.execAsync('SELECT 1');
      } catch (e) {
        throw new Error('Database verification failed');
      }


      await database.execAsync('PRAGMA journal_mode = WAL');
      await database.execAsync('PRAGMA synchronous = NORMAL');
      await database.execAsync('PRAGMA foreign_keys = ON');

      db = database;
      await runMigrations();

      return db;
    } catch (error) {
      db = null;
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}




async function runMigrations() {

  await db.execAsync(`
    -- Cola de registros de asistencia pendientes
    CREATE TABLE IF NOT EXISTS offline_asistencias (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotency_key TEXT NOT NULL UNIQUE,
      server_id TEXT,
      empleado_id TEXT NOT NULL,
      empresa_id TEXT,
      tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida')),
      estado TEXT NOT NULL,
      dispositivo_origen TEXT DEFAULT 'movil',
      metodo_registro TEXT NOT NULL CHECK(metodo_registro IN ('PIN', 'HUELLA', 'FACIAL')),
      departamento_id TEXT,
      fecha_registro TEXT NOT NULL,
      payload_biometrico TEXT,
      ubicacion TEXT,
      ip TEXT,
      wifi TEXT,
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
      minutos_retardo INTEGER DEFAULT 0,
      minutos_falta INTEGER DEFAULT 0,
      permite_anticipado INTEGER DEFAULT 1,
      minutos_anticipado_max INTEGER DEFAULT 60,
      aplica_tolerancia_entrada INTEGER DEFAULT 2,
      aplica_tolerancia_salida INTEGER DEFAULT 0,
      max_retardos INTEGER DEFAULT 0,
      dias_aplica TEXT,
      reglas TEXT,
      segmentos_red TEXT,
      intervalo_bloques_minutos INTEGER DEFAULT 60,
      updated_at TEXT NOT NULL
    );

    -- Caché de departamentos del empleado
    CREATE TABLE IF NOT EXISTS cache_departamentos (
      empleado_id TEXT NOT NULL,
      departamento_id TEXT NOT NULL,
      nombre TEXT,
      ubicacion TEXT,
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

    -- Cola de eventos de sesión (login/logout offline)
    CREATE TABLE IF NOT EXISTS sesiones_offline (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT NOT NULL,
      empleado_id TEXT,
      tipo TEXT NOT NULL CHECK(tipo IN ('login', 'logout')),
      modo TEXT NOT NULL DEFAULT 'offline',
      fecha_evento TEXT NOT NULL,
      dispositivo TEXT DEFAULT 'movil',
      is_synced INTEGER DEFAULT 0,
      sync_error TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Caché de datos de empresa
    CREATE TABLE IF NOT EXISTS cache_empresa (
      id TEXT PRIMARY KEY,
      nombre TEXT,
      logo TEXT,
      telefono TEXT,
      correo TEXT,
      es_activo INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    -- Caché de asistencias (historial descargado del servidor)
    CREATE TABLE IF NOT EXISTS cache_asistencias (
      id TEXT PRIMARY KEY,
      empleado_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      estado TEXT,
      fecha_registro TEXT NOT NULL,
      dispositivo_origen TEXT,
      departamento_id TEXT,
      departamento_nombre TEXT,
      mes_key TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Caché de avisos (globales y personales)
    CREATE TABLE IF NOT EXISTS cache_avisos (
      id TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'global',
      empleado_id TEXT,
      titulo TEXT,
      contenido TEXT,
      fecha_registro TEXT,
      fecha_asignacion TEXT,
      remitente_nombre TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (id, tipo)
    );

    -- Caché de incidencias (descargadas del servidor)
    CREATE TABLE IF NOT EXISTS cache_incidencias (
      id TEXT PRIMARY KEY,
      empleado_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      motivo TEXT,
      observaciones TEXT,
      fecha_inicio TEXT,
      fecha_fin TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      empleado_nombre TEXT,
      updated_at TEXT NOT NULL
    );

    -- Caché de configuración global (incluyendo orden y estado de credenciales)
    CREATE TABLE IF NOT EXISTS cache_configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Cola de incidencias creadas offline pendientes de sync
    CREATE TABLE IF NOT EXISTS offline_incidencias (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotency_key TEXT NOT NULL UNIQUE,
      server_id TEXT,
      empleado_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      motivo TEXT,
      fecha_inicio TEXT,
      fecha_fin TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      is_synced INTEGER DEFAULT 0,
      sync_attempts INTEGER DEFAULT 0,
      last_sync_error TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Cola de eventos offline
    CREATE TABLE IF NOT EXISTS offline_events (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      tipo_evento TEXT NOT NULL,
      descripcion TEXT,
      empleado_id TEXT,
      prioridad TEXT DEFAULT 'media',
      detalles TEXT,
      is_synced INTEGER DEFAULT 0,
      sync_error TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Índices para rendimiento
    CREATE INDEX IF NOT EXISTS idx_offline_asistencias_synced ON offline_asistencias(is_synced);
    CREATE INDEX IF NOT EXISTS idx_offline_asistencias_empleado ON offline_asistencias(empleado_id, fecha_registro);
    CREATE INDEX IF NOT EXISTS idx_cache_credenciales_empleado ON cache_credenciales(empleado_id);
    CREATE INDEX IF NOT EXISTS idx_cache_horarios_empleado ON cache_horarios(empleado_id);
    CREATE INDEX IF NOT EXISTS idx_sesiones_offline_synced ON sesiones_offline(is_synced);
    CREATE INDEX IF NOT EXISTS idx_cache_incidencias_empleado ON cache_incidencias(empleado_id);
    CREATE INDEX IF NOT EXISTS idx_offline_incidencias_synced ON offline_incidencias(is_synced);
    CREATE INDEX IF NOT EXISTS idx_cache_asistencias_empleado ON cache_asistencias(empleado_id, mes_key);
    CREATE INDEX IF NOT EXISTS idx_cache_avisos_tipo ON cache_avisos(tipo, empleado_id);
    CREATE INDEX IF NOT EXISTS idx_offline_events_synced ON offline_events(is_synced);

    -- Caché de Días Festivos
    CREATE TABLE IF NOT EXISTS cache_dias_festivos (
      fecha TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      tipo TEXT,
      updated_at TEXT NOT NULL
    );
  `);


  try {
    await db.execAsync('ALTER TABLE cache_departamentos ADD COLUMN ubicacion TEXT');
  } catch (e) {

  }


  for (const col of [
    'ALTER TABLE offline_asistencias ADD COLUMN ubicacion TEXT',
    'ALTER TABLE offline_asistencias ADD COLUMN ip TEXT',
    'ALTER TABLE offline_asistencias ADD COLUMN wifi TEXT']) {
    try { await db.execAsync(col); } catch (e) { }
  }

  try { await db.execAsync('ALTER TABLE cache_tolerancias ADD COLUMN reglas TEXT'); } catch (e) { }
  try { await db.execAsync('ALTER TABLE cache_tolerancias ADD COLUMN intervalo_bloques_minutos INTEGER DEFAULT 60'); } catch (e) { }
  try { await db.execAsync('ALTER TABLE cache_tolerancias ADD COLUMN segmentos_red TEXT'); } catch (e) { }

  // Migración: columnas de anticipo de salida (pueden no existir en DBs antiguas)
  for (const col of [
    'ALTER TABLE cache_tolerancias ADD COLUMN minutos_anticipo_salida INTEGER DEFAULT 5',
    'ALTER TABLE cache_tolerancias ADD COLUMN minutos_posterior_salida INTEGER DEFAULT 0',
    'ALTER TABLE offline_asistencias ADD COLUMN empresa_id TEXT']) {
    try { await db.execAsync(col); } catch (e) { /* columna ya existe */ }
  }


  const tables = ['cache_empleados', 'cache_credenciales', 'cache_horarios', 'cache_tolerancias', 'cache_departamentos', 'cache_dias_festivos'];
  for (const t of tables) {
    await db.runAsync('INSERT OR IGNORE INTO sync_metadata (tabla) VALUES (?)', t);
  }

}








export async function saveOfflineAsistencia(data) {
  if (!db) await initDatabase();

  const idempotencyKey = uuidv4();


  let ubicacionStr = null;
  if (data.ubicacion) {
    ubicacionStr = typeof data.ubicacion === 'string' ?
      data.ubicacion :
      JSON.stringify(data.ubicacion);
  }


  let wifiStr = null;
  if (data.wifi) {
    wifiStr = typeof data.wifi === 'string' ?
      data.wifi :
      JSON.stringify(data.wifi);
  }

  try {
    const result = await db.runAsync(
      `INSERT INTO offline_asistencias
        (idempotency_key, empleado_id, empresa_id, tipo, estado, dispositivo_origen, metodo_registro,
         departamento_id, fecha_registro, payload_biometrico, ubicacion, ip, wifi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idempotencyKey,
        data.empleado_id,
        data.empresa_id || null,
        data.tipo,
        data.estado,
        data.dispositivo_origen || 'movil',
        data.metodo_registro,
        data.departamento_id || null,
        data.fecha_registro || new Date().toISOString(),
        data.payload_biometrico ? JSON.stringify(data.payload_biometrico) : null,
        ubicacionStr,
        data.ip || null,
        wifiStr]

    );

    return {
      local_id: result.lastInsertRowId,
      idempotency_key: idempotencyKey,
      ...data
    };
  } catch (error) {
    throw error;
  }
}

export async function getPendingAsistencias(limit = 50) {
  if (!db) await initDatabase();
  return await db.getAllAsync(
    `SELECT * FROM offline_asistencias WHERE is_synced = 0 ORDER BY fecha_registro ASC LIMIT ?`,
    [limit]
  );
}

export async function markAsSynced(localId, serverId, estadoSincronizado) {
  if (!db) await initDatabase();
  await db.runAsync(
    `UPDATE offline_asistencias
         SET is_synced = 1, 
             server_id = ?, 
             last_sync_attempt = datetime('now', 'localtime'),
             estado = COALESCE(?, estado)
         WHERE local_id = ?`,
    [serverId, estadoSincronizado, localId]
  );
}

export async function markSyncError(localId, error, definitivo = false) {
  if (!db) await initDatabase();
  await db.runAsync(
    `UPDATE offline_asistencias
     SET is_synced = CASE WHEN ? = 1 THEN -1 ELSE 0 END,
         sync_attempts = sync_attempts + 1,
         last_sync_error = ?,
         last_sync_attempt = datetime('now', 'localtime')
     WHERE local_id = ?`,
    [definitivo ? 1 : 0, error, localId]
  );
}

export async function getPendingCount() {
  if (!db) await initDatabase();
  const row = await db.getFirstAsync(`
    SELECT
      SUM(CASE WHEN is_synced = 0 THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN is_synced = -1 THEN 1 ELSE 0 END) as errors,
      SUM(CASE WHEN is_synced = 1 THEN 1 ELSE 0 END) as synced
    FROM offline_asistencias
  `);
  return {
    pending: row?.pending || 0,
    errors: row?.errors || 0,
    synced: row?.synced || 0
  };
}

export async function getRegistrosHoy(empleadoId) {
  if (!db) await initDatabase();
  const hoy = new Date().toISOString().split('T')[0];

  return await db.getAllAsync(
    `SELECT tipo, estado, fecha_registro FROM offline_asistencias
         WHERE empleado_id = ? AND fecha_registro LIKE ? || '%'
         UNION
         SELECT tipo, estado, fecha_registro FROM cache_asistencias
         WHERE empleado_id = ? AND fecha_registro LIKE ? || '%'
         ORDER BY fecha_registro ASC`,
    [empleadoId, hoy, empleadoId, hoy]
  );
}






export async function saveOnlineAsistenciaToCache(data) {
  if (!db) await initDatabase();
  const mesKey = (data.fecha_registro || new Date().toISOString()).substring(0, 7);
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO cache_asistencias
             (id, empleado_id, tipo, estado, fecha_registro, dispositivo_origen, departamento_id, departamento_nombre, mes_key, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))`,
      [
        data.id || `local_online_${Date.now()}`,
        data.empleado_id,
        data.tipo,
        data.estado || null,
        data.fecha_registro,
        data.dispositivo_origen || 'movil',
        data.departamento_id || null,
        data.departamento_nombre || null,
        mesKey]

    );
  } catch (error) {

    (function () { })('saveOnlineAsistenciaToCache error (no crítico):', error.message);
  }
}





export async function getPendingOfflineRegistrosHoy(empleadoId) {
  if (!db) await initDatabase();
  const hoy = new Date().toISOString().split('T')[0];
  return await db.getAllAsync(
    `SELECT * FROM offline_asistencias WHERE empleado_id = ? AND fecha_registro LIKE ? || '%' AND is_synced = 0 ORDER BY fecha_registro ASC`,
    [empleadoId, hoy]
  );
}









export async function getRegistrosByRange(empleadoId, fechaInicio, fechaFin) {
  if (!db) await initDatabase();
  return await db.getAllAsync(
    `SELECT * FROM offline_asistencias
     WHERE empleado_id = ?
       AND fecha_registro >= ?
       AND fecha_registro < date(?, '+1 day')
     ORDER BY fecha_registro DESC`,
    [empleadoId, fechaInicio, fechaFin]
  );
}






export async function getErrorRecords() {
  if (!db) await initDatabase();
  return await db.getAllAsync(
    `SELECT * FROM offline_asistencias WHERE is_synced = -1 ORDER BY fecha_registro ASC`
  );
}





export async function upsertEmpleados(empleados) {
  if (!db) await initDatabase();



  try {
    for (const emp of empleados) {

      let estadoCuenta = emp.estado_cuenta || 'activo';
      if (emp.es_activo === false) estadoCuenta = 'inactivo';
      if (emp.es_activo === true) estadoCuenta = 'activo';

      await db.runAsync(
        `INSERT INTO cache_empleados (empleado_id, usuario_id, nombre, usuario, correo, estado_cuenta, es_empleado, foto, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
         ON CONFLICT(empleado_id) DO UPDATE SET
           usuario_id = excluded.usuario_id,
           nombre = excluded.nombre,
           usuario = excluded.usuario,
           correo = excluded.correo,
           estado_cuenta = excluded.estado_cuenta,
           es_empleado = excluded.es_empleado,
           foto = excluded.foto,
           updated_at = excluded.updated_at`,
        [
          emp.empleado_id || emp.id,
          emp.usuario_id,
          emp.nombre,
          emp.usuario || null,
          emp.correo || null,
          estadoCuenta,
          emp.es_empleado !== false ? 1 : 0,
          emp.foto || null]

      );
    }

  } catch (error) {

    throw error;
  }
  await updateMetaCount('cache_empleados');
}

export async function upsertCredenciales(credenciales) {
  if (!db) await initDatabase();

  try {
    for (const cred of credenciales) {
      await db.runAsync(
        `INSERT INTO cache_credenciales (id, empleado_id, pin_hash, dactilar_template, facial_descriptor, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
         ON CONFLICT(id) DO UPDATE SET
           empleado_id = excluded.empleado_id,
           pin_hash = excluded.pin_hash,
           dactilar_template = excluded.dactilar_template,
           facial_descriptor = excluded.facial_descriptor,
           updated_at = excluded.updated_at`,
        [
          cred.id,
          cred.empleado_id,
          cred.pin_hash || cred.pin || null,
          cred.dactilar_template || cred.dactilar || null,
          cred.facial_descriptor || cred.facial || null]

      );
    }
  } catch (error) {
    throw error;
  }
  await updateMetaCount('cache_credenciales');
}

export async function upsertHorario(empleadoId, horario) {
  if (!db) await initDatabase();

  await db.runAsync(
    `INSERT INTO cache_horarios (horario_id, empleado_id, configuracion, es_activo, updated_at)
     VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
     ON CONFLICT(horario_id) DO UPDATE SET
       empleado_id = excluded.empleado_id,
       configuracion = excluded.configuracion,
       es_activo = excluded.es_activo,
       updated_at = excluded.updated_at`,
    [
      horario.id || horario.horario_id,
      empleadoId,
      typeof horario.configuracion === 'string' ? horario.configuracion : JSON.stringify(horario.configuracion),
      horario.es_activo ? 1 : 0]

  );
}

export async function upsertTolerancia(empleadoId, tolerancia) {
  if (!db) await initDatabase();
  const diasAplica = tolerancia.dias_aplica || tolerancia.dias_aplicables ?
    typeof tolerancia.dias_aplica === 'string' ? tolerancia.dias_aplica : JSON.stringify(tolerancia.dias_aplica || tolerancia.dias_aplicables) :
    null;

  const reglasJson = tolerancia.reglas ?
    (typeof tolerancia.reglas === 'string' ? tolerancia.reglas : JSON.stringify(tolerancia.reglas)) :
    null;

  const segmentosRedJson = tolerancia.segmentos_red ?
    (typeof tolerancia.segmentos_red === 'string' ? tolerancia.segmentos_red : JSON.stringify(tolerancia.segmentos_red)) :
    null;

  try {
    await db.runAsync(
      `INSERT INTO cache_tolerancias (
        empleado_id, nombre, minutos_retardo, minutos_falta,
        permite_anticipado, minutos_anticipado_max, aplica_tolerancia_entrada,
        aplica_tolerancia_salida, max_retardos, dias_aplica, reglas, segmentos_red, intervalo_bloques_minutos, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      ON CONFLICT(empleado_id) DO UPDATE SET
        nombre = excluded.nombre,
        minutos_retardo = excluded.minutos_retardo,
        minutos_falta = excluded.minutos_falta,
        permite_anticipado = excluded.permite_anticipado,
        minutos_anticipado_max = excluded.minutos_anticipado_max,
        aplica_tolerancia_entrada = excluded.aplica_tolerancia_entrada,
        aplica_tolerancia_salida = excluded.aplica_tolerancia_salida,
        max_retardos = excluded.max_retardos,
        dias_aplica = excluded.dias_aplica,
        reglas = excluded.reglas,
        segmentos_red = excluded.segmentos_red,
        intervalo_bloques_minutos = excluded.intervalo_bloques_minutos,
        updated_at = excluded.updated_at`,
        [
          empleadoId,
          tolerancia.nombre || null,
          tolerancia.minutos_retardo ?? 0,
          tolerancia.minutos_falta ?? 0,
          tolerancia.permite_registro_anticipado !== false ? 1 : 0,
          tolerancia.minutos_anticipado_max ?? 0,
          tolerancia.aplica_tolerancia_entrada !== false ? 1 : 0,
          tolerancia.aplica_tolerancia_salida !== false ? 1 : 0,
          tolerancia.max_retardos ?? 0,
          diasAplica,
          reglasJson,
          segmentosRedJson,
          tolerancia.intervalo_bloques_minutos ?? 60
        ]
    );
  } catch (ignore) {
    // This catch block is for handling cases where columns might not exist yet
    // It's generally better to handle migrations in runMigrations, but this provides
    // a fallback for older DBs or new columns added after initial setup.
    try { await db.execAsync('ALTER TABLE cache_tolerancias ADD COLUMN max_retardos INTEGER DEFAULT 0'); } catch (e) { }
    try { await db.execAsync('ALTER TABLE cache_tolerancias ADD COLUMN segmentos_red TEXT'); } catch (e) { }
    try { await db.execAsync('ALTER TABLE cache_tolerancias ADD COLUMN minutos_anticipo_salida INTEGER DEFAULT 5'); } catch (e) { }
    try { await db.execAsync('ALTER TABLE cache_tolerancias ADD COLUMN minutos_posterior_salida INTEGER DEFAULT 0'); } catch (e) { }
    try { await db.execAsync('ALTER TABLE cache_tolerancias ADD COLUMN reglas TEXT'); } catch (e) { }
    try { await db.execAsync('ALTER TABLE cache_tolerancias ADD COLUMN intervalo_bloques_minutos INTEGER DEFAULT 60'); } catch (e) { }
    // After attempting to add columns, retry the upsert
    await upsertTolerancia(empleadoId, tolerancia);
  }
}

export async function upsertDepartamentos(empleadoId, departamentos) {
  if (!db) await initDatabase();

  try {
    for (const dep of departamentos) {
      const ubicacionStr = dep.ubicacion ?
        typeof dep.ubicacion === 'string' ? dep.ubicacion : JSON.stringify(dep.ubicacion) :
        null;

      await db.runAsync(`
                INSERT OR REPLACE INTO cache_departamentos (empleado_id, departamento_id, nombre, ubicacion, es_activo, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
             `, [
        empleadoId,
        dep.departamento_id,
        dep.nombre,
        ubicacionStr,
        dep.es_activo ? 1 : 0]
      );
    }
  } catch (error) {
    throw error;
  }
}







export async function markDeletedEmpleados(serverIds) {
  if (!db) await initDatabase();
  if (!serverIds || serverIds.length === 0) return 0;

  const placeholders = serverIds.map(() => '?').join(',');
  const result = await db.runAsync(
    `UPDATE cache_empleados
     SET estado_cuenta = 'eliminado', updated_at = datetime('now', 'localtime')
     WHERE empleado_id NOT IN (${placeholders}) AND estado_cuenta != 'eliminado'`,
    serverIds
  );
  return result.changes || 0;
}





export async function getEmpleado(empleadoId) {
  if (!db) await initDatabase();
  return await db.getFirstAsync('SELECT * FROM cache_empleados WHERE empleado_id = ? AND estado_cuenta = ?', [empleadoId, 'activo']);
}






export async function getAllEmpleados() {
  if (!db) await initDatabase();
  return await db.getAllAsync("SELECT * FROM cache_empleados WHERE estado_cuenta = 'activo'");
}

export async function getAllCredenciales() {
  if (!db) await initDatabase();
  return await db.getAllAsync(`
    SELECT cc.*, ce.nombre, ce.estado_cuenta
    FROM cache_credenciales cc
    INNER JOIN cache_empleados ce ON ce.empleado_id = cc.empleado_id
    WHERE ce.estado_cuenta = 'activo'
  `);
}







export async function getCredenciales(empleadoId) {
  if (!db) await initDatabase();
  return await db.getFirstAsync('SELECT * FROM cache_credenciales WHERE empleado_id = ?', [empleadoId]);
}

export async function getHorario(empleadoId) {
  if (!db) await initDatabase();
  const row = await db.getFirstAsync('SELECT * FROM cache_horarios WHERE empleado_id = ? AND es_activo = 1', [empleadoId]);
  if (row && row.configuracion) {
    try {
      row.configuracion = JSON.parse(row.configuracion);
    } catch (e) { }
  }
  return row;
}

export async function getTolerancia(empleadoId) {
  if (!db) await initDatabase();
  const row = await db.getFirstAsync('SELECT * FROM cache_tolerancias WHERE empleado_id = ?', [empleadoId]);

  if (row && row.dias_aplica) {
    try {
      row.dias_aplica = JSON.parse(row.dias_aplica);
    } catch (e) { }
  }
  if (row && row.reglas) {
    try {
      row.reglas = JSON.parse(row.reglas);
    } catch (e) { }
  }
  if (row && row.segmentos_red) {
    try {
      row.segmentos_red = JSON.parse(row.segmentos_red);
    } catch (e) { row.segmentos_red = []; }
  } else if (row) {
    row.segmentos_red = [];
  }
  return row || {
    minutos_retardo: 0,
    minutos_falta: 0,
    permite_anticipado: 1,
    minutos_anticipado_max: 5,
    minutos_anticipo_salida: 5,
    minutos_posterior_salida: 0,
    aplica_tolerancia_entrada: 1,
    aplica_tolerancia_salida: 1,
    dias_aplica: null
  };
}




export async function getDepartamentos(empleadoId) {
  if (!db) await initDatabase();
  return await db.getAllAsync('SELECT * FROM cache_departamentos WHERE empleado_id = ? AND es_activo = 1', [empleadoId]);
}






export async function getDepartamento(empleadoId) {
  if (!db) await initDatabase();
  return await db.getFirstAsync('SELECT * FROM cache_departamentos WHERE empleado_id = ? AND es_activo = 1 LIMIT 1', [empleadoId]);
}





export async function upsertAsistenciasMes(empleadoId, mesKey, asistencias) {
  if (!db) await initDatabase();

  await db.withTransactionAsync(async () => {


    for (const reg of asistencias) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cache_asistencias (id, empleado_id, tipo, estado, fecha_registro, dispositivo_origen, departamento_id, departamento_nombre, mes_key, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [
          reg.id,
          empleadoId,
          reg.tipo,
          reg.estado || null,
          reg.fecha_registro,
          reg.dispositivo_origen || null,
          reg.departamento_id || null,
          reg.departamento_nombre || null,
          mesKey]

      );
    }
  });
}

export async function getAsistenciasMesLocal(empleadoId, mesKey) {
  if (!db) await initDatabase();
  return await db.getAllAsync(
    'SELECT * FROM cache_asistencias WHERE empleado_id = ? AND mes_key = ? ORDER BY fecha_registro DESC',
    [empleadoId, mesKey]
  );
}





export async function upsertIncidencias(empleadoId, incidencias) {
  if (!db) await initDatabase();

  await db.withTransactionAsync(async () => {



    for (const inc of incidencias) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cache_incidencias (id, empleado_id, tipo, motivo, observaciones, fecha_inicio, fecha_fin, estado, empleado_nombre, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [
          inc.id,
          inc.empleado_id || empleadoId,
          inc.tipo,
          inc.motivo || null,
          inc.observaciones || null,
          inc.fecha_inicio || null,
          inc.fecha_fin || null,
          inc.estado || 'pendiente',
          inc.empleado_nombre || null]

      );
    }
  });
}

export async function getIncidenciasLocal(empleadoId) {
  if (!db) await initDatabase();
  return await db.getAllAsync(
    'SELECT * FROM cache_incidencias WHERE empleado_id = ? ORDER BY fecha_inicio DESC',
    [empleadoId]
  );
}

export async function saveOfflineIncidencia(data) {
  if (!db) await initDatabase();

  const idempotencyKey = uuidv4();

  const result = await db.runAsync(
    `INSERT INTO offline_incidencias
         (idempotency_key, empleado_id, tipo, motivo, fecha_inicio, fecha_fin, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      idempotencyKey,
      data.empleado_id,
      data.tipo,
      data.motivo || null,
      data.fecha_inicio || null,
      data.fecha_fin || null,
      'pendiente']

  );

  return {
    local_id: result.lastInsertRowId,
    idempotency_key: idempotencyKey,
    ...data,
    estado: 'pendiente',
    is_offline: true
  };
}

export async function getPendingIncidencias(limit = 50) {
  if (!db) await initDatabase();
  return await db.getAllAsync(
    'SELECT * FROM offline_incidencias WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
    [limit]
  );
}

export async function markIncidenciaSynced(localId, serverId) {
  if (!db) await initDatabase();
  await db.runAsync(
    `UPDATE offline_incidencias SET is_synced = 1, server_id = ? WHERE local_id = ?`,
    [serverId, localId]
  );
}

export async function markIncidenciaSyncError(localId, error) {
  if (!db) await initDatabase();
  await db.runAsync(
    `UPDATE offline_incidencias SET sync_attempts = sync_attempts + 1, last_sync_error = ? WHERE local_id = ?`,
    [error, localId]
  );
}





export async function upsertEmpresa(empresa) {
  if (!db) await initDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO cache_empresa (id, nombre, logo, telefono, correo, es_activo, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
    [
      empresa.id,
      empresa.nombre || null,
      empresa.logo || null,
      empresa.telefono || null,
      empresa.correo || null,
      empresa.es_activo !== false ? 1 : 0]

  );
}

export async function getEmpresaLocal(empresaId) {
  if (!db) await initDatabase();
  return await db.getFirstAsync('SELECT * FROM cache_empresa WHERE id = ?', [empresaId]);
}





export async function upsertAvisosGlobales(avisos) {
  if (!db) await initDatabase();
  if (!avisos || avisos.length === 0) return;



  for (const aviso of avisos) {
    await db.runAsync(
      `INSERT OR REPLACE INTO cache_avisos (id, tipo, empleado_id, titulo, contenido, fecha_registro, fecha_asignacion, remitente_nombre, updated_at)
             VALUES (?, 'global', NULL, ?, ?, ?, NULL, ?, datetime('now', 'localtime'))`,
      [
        aviso.id,
        aviso.titulo || null,
        aviso.contenido || null,
        aviso.fecha_registro || null,
        aviso.remitente_nombre || null]

    );
  }

  if (avisos.length > 0) {
    const ids = avisos.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM cache_avisos WHERE tipo = 'global' AND id NOT IN (${ids})`,
      avisos.map((a) => a.id)
    );
  }
}

export async function upsertAvisosEmpleado(empleadoId, avisos) {
  if (!db) await initDatabase();


  for (const aviso of avisos) {
    await db.runAsync(
      `INSERT OR REPLACE INTO cache_avisos (id, tipo, empleado_id, titulo, contenido, fecha_registro, fecha_asignacion, remitente_nombre, updated_at)
             VALUES (?, 'personal', ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [
        aviso.id,
        empleadoId,
        aviso.titulo || null,
        aviso.contenido || null,
        aviso.fecha_registro || null,
        aviso.fecha_asignacion || null,
        aviso.remitente_nombre || null]

    );
  }

  if (avisos.length > 0) {
    const ids = avisos.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM cache_avisos WHERE tipo = 'personal' AND empleado_id = ? AND id NOT IN (${ids})`,
      [empleadoId, ...avisos.map((a) => a.id)]
    );
  } else {

    await db.runAsync(
      `DELETE FROM cache_avisos WHERE tipo = 'personal' AND empleado_id = ?`,
      [empleadoId]
    );
  }
}

export async function getAvisosGlobalesLocal() {
  if (!db) await initDatabase();
  return await db.getAllAsync(
    "SELECT * FROM cache_avisos WHERE tipo = 'global' ORDER BY fecha_registro DESC"
  );
}

export async function getAvisosEmpleadoLocal(empleadoId) {
  if (!db) await initDatabase();
  return await db.getAllAsync(
    "SELECT * FROM cache_avisos WHERE tipo = 'personal' AND empleado_id = ? ORDER BY fecha_registro DESC",
    [empleadoId]
  );
}





async function saveOfflineSession({ usuario_id, empleado_id, tipo, modo = 'offline' }) {
  if (!db) await initDatabase();
  const fecha = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sesiones_offline (usuario_id, empleado_id, tipo, modo, fecha_evento)
         VALUES (?, ?, ?, ?, ?)`,
    [usuario_id, empleado_id || null, tipo, modo, fecha]
  );
}

async function getPendingSessions(limit = 50) {
  if (!db) await initDatabase();
  return await db.getAllAsync(
    `SELECT * FROM sesiones_offline WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?`,
    [limit]
  );
}

async function markSessionSynced(localId) {
  if (!db) await initDatabase();
  await db.runAsync(
    `UPDATE sesiones_offline SET is_synced = 1 WHERE local_id = ?`,
    [localId]
  );
}

async function markSessionSyncError(localId, error) {
  if (!db) await initDatabase();
  await db.runAsync(
    `UPDATE sesiones_offline SET sync_error = ? WHERE local_id = ?`,
    [error, localId]
  );
}








export async function saveOfflineEvent(data) {
  if (!db) await initDatabase();
  await db.runAsync(
    `INSERT INTO offline_events (titulo, tipo_evento, descripcion, empleado_id, prioridad, detalles)
         VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.titulo,
      data.tipo_evento,
      data.descripcion || null,
      data.empleado_id || null,
      data.prioridad || 'media',
      data.detalles ? JSON.stringify(data.detalles) : null]

  );
}




export async function getPendingEvents(limit = 100) {
  if (!db) await initDatabase();
  return await db.getAllAsync(
    'SELECT * FROM offline_events WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
    [limit]
  );
}




export async function markEventSynced(localId) {
  if (!db) await initDatabase();
  await db.runAsync(
    'UPDATE offline_events SET is_synced = 1 WHERE local_id = ?',
    [localId]
  );
}




export async function markEventSyncError(localId, error) {
  if (!db) await initDatabase();
  await db.runAsync(
    'UPDATE offline_events SET sync_error = ? WHERE local_id = ?',
    [error, localId]
  );
}









async function updateMetaCount(tabla) {
  try {
    const row = await db.getFirstAsync(`SELECT COUNT(*) as count FROM ${tabla}`);
    await db.runAsync('UPDATE sync_metadata SET total_records = ? WHERE tabla = ?', [row.count, tabla]);
  } catch (e) {

  }
}





export async function setLastFullSync(tabla) {
  if (!db) await initDatabase();
  await db.runAsync(
    `UPDATE sync_metadata SET last_full_sync = datetime('now', 'localtime') WHERE tabla = ?`,
    [tabla]
  );
}





export async function setLastIncrementalSync(tabla) {
  if (!db) await initDatabase();
  await db.runAsync(
    `UPDATE sync_metadata SET last_incremental_sync = datetime('now', 'localtime') WHERE tabla = ?`,
    [tabla]
  );
}






export async function getSyncMetadata(tabla) {
  if (!db) await initDatabase();
  return await db.getFirstAsync('SELECT * FROM sync_metadata WHERE tabla = ?', [tabla]);
}





export async function getAllSyncMetadata() {
  if (!db) await initDatabase();
  return await db.getAllAsync('SELECT * FROM sync_metadata');
}











export async function cleanupSyncedRecords(diasRetencion = 7) {
  if (!db) await initDatabase();

  const cutoff = `datetime('now', '-${diasRetencion} days', 'localtime')`;
  let totalEliminados = 0;

  try {

    const r1 = await db.runAsync(
      `DELETE FROM offline_asistencias WHERE is_synced != 0 AND created_at < ${cutoff}`
    );
    totalEliminados += r1.changes || 0;


    const r2 = await db.runAsync(
      `DELETE FROM sesiones_offline WHERE is_synced = 1 AND created_at < ${cutoff}`
    );
    totalEliminados += r2.changes || 0;


    const r3 = await db.runAsync(
      `DELETE FROM offline_events WHERE is_synced = 1 AND created_at < ${cutoff}`
    );
    totalEliminados += r3.changes || 0;


    const r4 = await db.runAsync(
      `DELETE FROM offline_incidencias WHERE is_synced = 1 AND created_at < ${cutoff}`
    );
    totalEliminados += r4.changes || 0;

    if (totalEliminados > 50) {
      await db.execAsync('VACUUM');
    }

    return { success: true, eliminados: totalEliminados };
  } catch (error) {
    return { success: false, error: error.message };
  }
}




export async function closeDatabase() {
  if (db) {
    try {
      await db.closeAsync();
    } catch (e) {

    }
    db = null;
    initializationPromise = null;
  }
}





export function getDatabase() {
  return db;
}

// ─── Configuración: orden y estado de credenciales ───────────────────────────

/**
 * Guarda el orden de credenciales en el caché local de SQLite.
 * @param {Array<{metodo: string, activo: boolean, nivel: number}>} orden
 */
export async function saveOrdenCredenciales(orden) {
  try {
    const database = await initDatabase();
    const now = new Date().toISOString();
    await database.runAsync(
      `INSERT INTO cache_configuracion (clave, valor, updated_at)
       VALUES ('orden_credenciales', ?, ?)
       ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at`,
      [JSON.stringify(orden), now]
    );
  } catch (e) {
    // Silent - no critical
  }
}

/**
 * Recupera el orden de credenciales desde el caché local de SQLite.
 * Devuelve null si no hay datos guardados.
 * @returns {Promise<Array<{metodo: string, activo: boolean, nivel: number}>|null>}
 */
export async function getOrdenCredencialesCache() {
  try {
    const database = await initDatabase();
    const row = await database.getFirstAsync(
      `SELECT valor FROM cache_configuracion WHERE clave = 'orden_credenciales'`
    );
    if (!row) return null;
    return JSON.parse(row.valor);
  } catch (e) {
    return null;
  }
}

// ── DÍAS FESTIVOS ──

export async function clearDiasFestivos(yearStr) {
  try {
    const database = await initDatabase();
    await database.runAsync(`DELETE FROM cache_dias_festivos WHERE fecha LIKE ? || '%'`, [yearStr]);
  } catch (e) { }
}

export async function upsertDiasFestivos(diasFestivos) {
  try {
    const database = await initDatabase();
    await database.withTransactionAsync(async () => {
      for (const dia of diasFestivos) {
        await database.runAsync(
          `INSERT INTO cache_dias_festivos (fecha, nombre, tipo, updated_at)
           VALUES (?, ?, ?, datetime('now', 'localtime'))
           ON CONFLICT(fecha) DO UPDATE SET
           nombre = excluded.nombre,
           tipo = excluded.tipo,
           updated_at = excluded.updated_at`,
          [dia.fecha, dia.nombre, dia.tipo || null]
        );
      }
    });
  } catch (e) { }
}

export async function getDiaFestivo(fechaStr) {
  try {
    const database = await initDatabase();
    return await database.getFirstAsync('SELECT * FROM cache_dias_festivos WHERE fecha = ?', [fechaStr]);
  } catch (e) {
    return null;
  }
}

export default {
  initDatabase,
  closeDatabase,
  getDatabase,

  saveOfflineAsistencia,
  getPendingAsistencias,
  markAsSynced,
  markSyncError,
  getPendingCount,
  getRegistrosHoy,
  getPendingOfflineRegistrosHoy,
  getRegistrosByRange,
  getErrorRecords,

  upsertEmpleados,
  upsertCredenciales,
  upsertHorario,
  upsertTolerancia,
  upsertDepartamentos,
  markDeletedEmpleados,

  getEmpleado,
  getAllEmpleados,
  getAllCredenciales,
  getCredenciales,
  getHorario,
  getTolerancia,
  getDepartamentos,
  getDepartamento,

  upsertAsistenciasMes,
  getAsistenciasMesLocal,
  saveOnlineAsistenciaToCache,

  upsertEmpresa,
  getEmpresaLocal,

  upsertAvisosGlobales,
  upsertAvisosEmpleado,
  getAvisosGlobalesLocal,
  getAvisosEmpleadoLocal,

  upsertIncidencias,
  getIncidenciasLocal,
  saveOfflineIncidencia,
  getPendingIncidencias,
  markIncidenciaSynced,
  markIncidenciaSyncError,

  saveOfflineSession,
  getPendingSessions,
  markSessionSynced,
  markSessionSyncError,

  saveOfflineEvent,
  getPendingEvents,
  markEventSynced,
  markEventSyncError,

  setLastFullSync,
  setLastIncrementalSync,
  getSyncMetadata,
  getAllSyncMetadata,

  cleanupSyncedRecords,

  saveOrdenCredenciales,
  getOrdenCredenciales: getOrdenCredencialesCache,

  clearDiasFestivos,
  upsertDiasFestivos,
  getDiaFestivo
};