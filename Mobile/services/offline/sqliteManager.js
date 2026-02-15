/**
 * SQLiteManager — Módulo de persistencia local Offline-First (Mobile)
 * Gestiona la base de datos SQLite para cola de asistencias y caché de datos maestros.
 * Adaptado de Electron/Desktop para Expo/React Native.
 */

import * as SQLite from 'expo-sqlite';
import 'react-native-get-random-values'; // Polyfill para uuid
import { v4 as uuidv4 } from 'uuid';

let db = null;
let initializationPromise = null;
const DB_NAME = 'checador_offline.db';

// ============================================================
// INICIALIZACIÓN Y MIGRACIONES
// ============================================================

/**
 * Inicializa la base de datos SQLite y ejecuta migraciones.
 * Implementa patrón Singleton para evitar condiciones de carrera.
 * @returns {Promise<SQLite.SQLiteDatabase>} instancia de la base de datos
 */
export async function initDatabase() {
    if (db) return db;

    // Si ya hay una inicialización en curso, devolver esa promesa
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        console.log('📦 [SQLite] Inicializando base de datos:', DB_NAME);
        try {
            const database = await SQLite.openDatabaseAsync(DB_NAME);

            // Verificar conexión
            try {
                await database.execAsync('SELECT 1');
            } catch (e) {
                console.warn('⚠️ [SQLite] Verificación fallida, reintentando apertura...', e);
                // Intentar cerrar si es posible (aunque openDatabaseAsync retorna objeto manejado)
                // En Expo SQLite moderno, simplemente reintentamos obtener la referencia
                throw new Error('Database verification failed');
            }

            // Habilitar WAL para mejor concurrencia
            await database.execAsync('PRAGMA journal_mode = WAL');
            await database.execAsync('PRAGMA foreign_keys = ON');

            db = database; // Asignar instancia global
            await runMigrations();

            console.log('✅ [SQLite] Base de datos inicializada y verificada correctamente');
            return db;
        } catch (error) {
            console.error('❌ [SQLite] Error CRÍTICO inicializando base de datos:', error);
            db = null;
            initializationPromise = null; // Permitir reintento
            throw error;
        }
    })();

    return initializationPromise;
}

/**
 * Ejecuta las migraciones para crear/actualizar las tablas
 */
async function runMigrations() {
    console.log('🔄 [SQLite] Ejecutando migraciones...');

    await db.execAsync(`
    -- Cola de registros de asistencia pendientes
    CREATE TABLE IF NOT EXISTS offline_asistencias (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotency_key TEXT NOT NULL UNIQUE,
      server_id TEXT,
      empleado_id TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida')),
      estado TEXT NOT NULL,
      dispositivo_origen TEXT DEFAULT 'movil',
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
      aplica_tolerancia_entrada INTEGER DEFAULT 2, -- 1=SI, 0=NO, 2=DEFAULT
      aplica_tolerancia_salida INTEGER DEFAULT 0,
      max_retardos INTEGER DEFAULT 0,
      dias_aplica TEXT,
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
  `);

    // Migración segura: agregar columna ubicacion si no existe (para DBs existentes)
    try {
        await db.execAsync('ALTER TABLE cache_departamentos ADD COLUMN ubicacion TEXT');
        console.log('📦 [SQLite] Columna ubicacion agregada a cache_departamentos');
    } catch (e) {
        // La columna ya existe — ignorar
    }

    // Inicializar sync_metadata si están vacías
    const tables = ['cache_empleados', 'cache_credenciales', 'cache_horarios', 'cache_tolerancias', 'cache_departamentos'];
    for (const t of tables) {
        await db.runAsync('INSERT OR IGNORE INTO sync_metadata (tabla) VALUES (?)', t);
    }

    console.log('✅ [SQLite] Migraciones completadas');
}

// ============================================================
// CRUD — COLA DE ASISTENCIAS OFFLINE
// ============================================================

/**
 * Guarda un registro de asistencia en la cola local
 */
export async function saveOfflineAsistencia(data) {
    if (!db) await initDatabase();

    const idempotencyKey = uuidv4();

    try {
        const result = await db.runAsync(
            `INSERT INTO offline_asistencias
        (idempotency_key, empleado_id, tipo, estado, dispositivo_origen, metodo_registro,
         departamento_id, fecha_registro, payload_biometrico)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                idempotencyKey,
                data.empleado_id,
                data.tipo,
                data.estado,
                data.dispositivo_origen || 'movil',
                data.metodo_registro,
                data.departamento_id || null,
                data.fecha_registro || new Date().toISOString(),
                data.payload_biometrico ? JSON.stringify(data.payload_biometrico) : null
            ]
        );

        console.log(`📝 [SQLite] Asistencia offline guardada: local_id=${result.lastInsertRowId}, key=${idempotencyKey}`);

        return {
            local_id: result.lastInsertRowId,
            idempotency_key: idempotencyKey,
            ...data
        };
    } catch (error) {
        console.error('❌ [SQLite] Error guardando asistencia offline:', error);
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

export async function markAsSynced(localId, serverId) {
    if (!db) await initDatabase();
    await db.runAsync(
        `UPDATE offline_asistencias
     SET is_synced = 1, server_id = ?, last_sync_attempt = datetime('now', 'localtime')
     WHERE local_id = ?`,
        [serverId, localId]
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
        `SELECT * FROM offline_asistencias WHERE empleado_id = ? AND fecha_registro LIKE ? || '%' ORDER BY fecha_registro ASC`,
        [empleadoId, hoy]
    );
}

// ============================================================
// CRUD — CACHÉ DE DATOS MAESTROS
// ============================================================

export async function upsertEmpleados(empleados) {
    if (!db) await initDatabase();

    await db.withTransactionAsync(async () => {
        for (const emp of empleados) {
            // Adaptar es_activo (boolean) a estado_cuenta (string) si viene del nuevo endpoint
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
                    emp.es_empleado !== false ? 1 : 0, // Default true
                    emp.foto || null
                ]
            );
        }
    });
    console.log(`✅ [SQLite] ${empleados.length} empleados cacheados`);
}

export async function upsertCredenciales(credenciales) {
    if (!db) await initDatabase();

    await db.withTransactionAsync(async () => {
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
                    cred.facial_descriptor || cred.facial || null
                ]
            );
        }
    });
    console.log(`✅ [SQLite] ${credenciales.length} credenciales cacheadas`);
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
            horario.es_activo ? 1 : 0
        ]
    );
}

export async function upsertTolerancia(empleadoId, tolerancia) {
    if (!db) await initDatabase();

    const diasAplica = tolerancia.dias_aplica || tolerancia.dias_aplicables
        ? (typeof tolerancia.dias_aplica === 'string' ? tolerancia.dias_aplica : JSON.stringify(tolerancia.dias_aplica || tolerancia.dias_aplicables))
        : null;

    // Asegurarnos de que la columna max_retardos exista (en desarrollo es util validarlo, en prod la migracion corre al inicio)
    // Para simplificar, asumimos que initDatabase() ya corrió las migraciones.

    try {
        await db.runAsync(
            `INSERT INTO cache_tolerancias
      (empleado_id, nombre, minutos_retardo, minutos_falta, permite_anticipado, minutos_anticipado_max, aplica_tolerancia_entrada, aplica_tolerancia_salida, max_retardos, dias_aplica, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
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
      updated_at = excluded.updated_at`,
            [
                empleadoId,
                tolerancia.nombre || null,
                tolerancia.minutos_retardo ?? 10,  // Fallback seguro
                tolerancia.minutos_falta ?? 30,    // Fallback seguro
                tolerancia.permite_registro_anticipado !== false ? 1 : 0, // Default true si undefined
                tolerancia.minutos_anticipado_max ?? 60,
                tolerancia.aplica_tolerancia_entrada !== false ? 1 : 0,
                tolerancia.aplica_tolerancia_salida ? 1 : 0,
                tolerancia.max_retardos ?? 0, // Nuevo campo
                diasAplica
            ]
        );
    } catch (ignore) {
        // Si falla por columna faltante en dev caliente, intentamos añadirla al vuelo (opcional, pero robusto)
        try {
            await db.execAsync('ALTER TABLE cache_tolerancias ADD COLUMN max_retardos INTEGER DEFAULT 0');
            // Reintentar insert
            await upsertTolerancia(empleadoId, tolerancia);
        } catch (e) {
            console.error('Error actualizando tolerancia (posiblemente migración pendiente):', e);
        }
    }
}

export async function upsertDepartamentos(empleadoId, departamentos) {
    if (!db) await initDatabase();

    await db.withTransactionAsync(async () => {
        // Borramos anteriores para este empleado para evitar duplicados/obsoletos
        await db.runAsync('DELETE FROM cache_departamentos WHERE empleado_id = ?', [empleadoId]);

        for (const dep of departamentos) {
            // Serializar ubicacion si viene como objeto
            const ubicacionStr = dep.ubicacion
                ? (typeof dep.ubicacion === 'string' ? dep.ubicacion : JSON.stringify(dep.ubicacion))
                : null;

            await db.runAsync(`
                INSERT INTO cache_departamentos (empleado_id, departamento_id, nombre, ubicacion, es_activo, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
             `, [
                empleadoId,
                dep.departamento_id,
                dep.nombre,
                ubicacionStr,
                dep.es_activo ? 1 : 0
            ]);
        }
    });
    console.log(`✅ [SQLite] Departamentos actualizados para empleado ${empleadoId}`);
}


// ============================================================
// LECTURAS
// ============================================================

export async function getEmpleado(empleadoId) {
    if (!db) await initDatabase();
    return await db.getFirstAsync('SELECT * FROM cache_empleados WHERE empleado_id = ? AND estado_cuenta = ?', [empleadoId, 'activo']);
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


export async function getDepartamentos(empleadoId) {
    if (!db) await initDatabase();
    return await db.getAllAsync('SELECT * FROM cache_departamentos WHERE empleado_id = ? AND es_activo = 1', [empleadoId]);
}

// ============================================================
// CRUD — ASISTENCIAS (CACHÉ HISTORIAL)
// ============================================================

/**
 * Guarda asistencias de un mes en caché local
 * @param {string} empleadoId - ID del empleado
 * @param {string} mesKey - Clave del mes (YYYY-MM)
 * @param {Array} asistencias - Array de registros de asistencia
 */
export async function upsertAsistenciasMes(empleadoId, mesKey, asistencias) {
    if (!db) await initDatabase();

    await db.withTransactionAsync(async () => {
        // Limpiar caché anterior de este empleado para este mes
        await db.runAsync('DELETE FROM cache_asistencias WHERE empleado_id = ? AND mes_key = ?', [empleadoId, mesKey]);

        for (const reg of asistencias) {
            await db.runAsync(
                `INSERT INTO cache_asistencias (id, empleado_id, tipo, estado, fecha_registro, dispositivo_origen, departamento_id, departamento_nombre, mes_key, updated_at)
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
                    mesKey
                ]
            );
        }
    });
    console.log(`✅ [SQLite] ${asistencias.length} asistencias cacheadas para ${empleadoId} (${mesKey})`);
}

/**
 * Obtiene asistencias de un mes desde caché local
 */
export async function getAsistenciasMesLocal(empleadoId, mesKey) {
    if (!db) await initDatabase();
    return await db.getAllAsync(
        'SELECT * FROM cache_asistencias WHERE empleado_id = ? AND mes_key = ? ORDER BY fecha_registro DESC',
        [empleadoId, mesKey]
    );
}

// ============================================================
// CRUD — INCIDENCIAS OFFLINE
// ============================================================

/**
 * Guarda/actualiza incidencias descargadas del servidor en caché local
 */
export async function upsertIncidencias(empleadoId, incidencias) {
    if (!db) await initDatabase();

    await db.withTransactionAsync(async () => {
        // Limpiar caché anterior de este empleado
        await db.runAsync('DELETE FROM cache_incidencias WHERE empleado_id = ?', [empleadoId]);

        for (const inc of incidencias) {
            await db.runAsync(
                `INSERT INTO cache_incidencias (id, empleado_id, tipo, motivo, observaciones, fecha_inicio, fecha_fin, estado, empleado_nombre, updated_at)
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
                    inc.empleado_nombre || null
                ]
            );
        }
    });
    console.log(`✅ [SQLite] ${incidencias.length} incidencias cacheadas para empleado ${empleadoId}`);
}

/**
 * Obtiene incidencias cacheadas de un empleado
 */
export async function getIncidenciasLocal(empleadoId) {
    if (!db) await initDatabase();
    return await db.getAllAsync(
        'SELECT * FROM cache_incidencias WHERE empleado_id = ? ORDER BY fecha_inicio DESC',
        [empleadoId]
    );
}

/**
 * Guarda una incidencia creada offline en la cola de sync
 */
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
            'pendiente'
        ]
    );

    console.log(`📝 [SQLite] Incidencia offline guardada: local_id=${result.lastInsertRowId}, key=${idempotencyKey}`);

    return {
        local_id: result.lastInsertRowId,
        idempotency_key: idempotencyKey,
        ...data,
        estado: 'pendiente',
        is_offline: true
    };
}

/**
 * Obtiene incidencias offline pendientes de sincronizar
 */
export async function getPendingIncidencias(limit = 50) {
    if (!db) await initDatabase();
    return await db.getAllAsync(
        'SELECT * FROM offline_incidencias WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?',
        [limit]
    );
}

/**
 * Marca una incidencia offline como sincronizada
 */
export async function markIncidenciaSynced(localId, serverId) {
    if (!db) await initDatabase();
    await db.runAsync(
        `UPDATE offline_incidencias SET is_synced = 1, server_id = ? WHERE local_id = ?`,
        [serverId, localId]
    );
}

/**
 * Marca error en sincronización de incidencia
 */
export async function markIncidenciaSyncError(localId, error) {
    if (!db) await initDatabase();
    await db.runAsync(
        `UPDATE offline_incidencias SET sync_attempts = sync_attempts + 1, last_sync_error = ? WHERE local_id = ?`,
        [error, localId]
    );
}

// ============================================================
// CRUD — EMPRESA (CACHÉ)
// ============================================================

/**
 * Guarda/actualiza datos de empresa en caché local
 */
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
            empresa.es_activo !== false ? 1 : 0
        ]
    );
    console.log(`✅ [SQLite] Empresa cacheada: ${empresa.nombre}`);
}

/**
 * Obtiene datos de empresa desde caché local
 */
export async function getEmpresaLocal(empresaId) {
    if (!db) await initDatabase();
    return await db.getFirstAsync('SELECT * FROM cache_empresa WHERE id = ?', [empresaId]);
}

// ============================================================
// CRUD — AVISOS (CACHÉ)
// ============================================================

/**
 * Guarda avisos globales en caché local
 */
export async function upsertAvisosGlobales(avisos) {
    if (!db) await initDatabase();

    await db.withTransactionAsync(async () => {
        // Limpiar avisos globales anteriores
        await db.runAsync("DELETE FROM cache_avisos WHERE tipo = 'global'");

        for (const aviso of avisos) {
            await db.runAsync(
                `INSERT INTO cache_avisos (id, tipo, empleado_id, titulo, contenido, fecha_registro, fecha_asignacion, remitente_nombre, updated_at)
                 VALUES (?, 'global', NULL, ?, ?, ?, NULL, ?, datetime('now', 'localtime'))`,
                [
                    aviso.id,
                    aviso.titulo || null,
                    aviso.contenido || null,
                    aviso.fecha_registro || null,
                    aviso.remitente_nombre || null
                ]
            );
        }
    });
    console.log(`✅ [SQLite] ${avisos.length} avisos globales cacheados`);
}

/**
 * Guarda avisos personales de un empleado en caché local
 */
export async function upsertAvisosEmpleado(empleadoId, avisos) {
    if (!db) await initDatabase();

    await db.withTransactionAsync(async () => {
        // Limpiar avisos personales anteriores de este empleado
        await db.runAsync("DELETE FROM cache_avisos WHERE tipo = 'personal' AND empleado_id = ?", [empleadoId]);

        for (const aviso of avisos) {
            await db.runAsync(
                `INSERT INTO cache_avisos (id, tipo, empleado_id, titulo, contenido, fecha_registro, fecha_asignacion, remitente_nombre, updated_at)
                 VALUES (?, 'personal', ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
                [
                    aviso.id,
                    empleadoId,
                    aviso.titulo || null,
                    aviso.contenido || null,
                    aviso.fecha_registro || null,
                    aviso.fecha_asignacion || null,
                    aviso.remitente_nombre || null
                ]
            );
        }
    });
    console.log(`✅ [SQLite] ${avisos.length} avisos personales cacheados para empleado ${empleadoId}`);
}

/**
 * Obtiene avisos globales desde caché local
 */
export async function getAvisosGlobalesLocal() {
    if (!db) await initDatabase();
    return await db.getAllAsync(
        "SELECT * FROM cache_avisos WHERE tipo = 'global' ORDER BY fecha_registro DESC"
    );
}

/**
 * Obtiene avisos personales de un empleado desde caché local
 */
export async function getAvisosEmpleadoLocal(empleadoId) {
    if (!db) await initDatabase();
    return await db.getAllAsync(
        "SELECT * FROM cache_avisos WHERE tipo = 'personal' AND empleado_id = ? ORDER BY fecha_registro DESC",
        [empleadoId]
    );
}

// ============================================================
// CRUD — SESIONES OFFLINE
// ============================================================

/**
 * Guarda un evento de sesión (login/logout) para sincronizar después
 */
async function saveOfflineSession({ usuario_id, empleado_id, tipo, modo = 'offline' }) {
    if (!db) await initDatabase();
    const fecha = new Date().toISOString();
    await db.runAsync(
        `INSERT INTO sesiones_offline (usuario_id, empleado_id, tipo, modo, fecha_evento)
         VALUES (?, ?, ?, ?, ?)`,
        [usuario_id, empleado_id || null, tipo, modo, fecha]
    );
    console.log(`📝 [SQLite] Sesión ${tipo} (${modo}) guardada para usuario ${usuario_id}`);
}

/**
 * Obtiene sesiones pendientes de sincronizar
 */
async function getPendingSessions(limit = 50) {
    if (!db) await initDatabase();
    return await db.getAllAsync(
        `SELECT * FROM sesiones_offline WHERE is_synced = 0 ORDER BY created_at ASC LIMIT ?`,
        [limit]
    );
}

/**
 * Marca una sesión como sincronizada
 */
async function markSessionSynced(localId) {
    if (!db) await initDatabase();
    await db.runAsync(
        `UPDATE sesiones_offline SET is_synced = 1 WHERE local_id = ?`,
        [localId]
    );
}

/**
 * Marca error en sincronización de sesión
 */
async function markSessionSyncError(localId, error) {
    if (!db) await initDatabase();
    await db.runAsync(
        `UPDATE sesiones_offline SET sync_error = ? WHERE local_id = ?`,
        [error, localId]
    );
}

export default {
    initDatabase,
    saveOfflineAsistencia,
    getPendingAsistencias,
    markAsSynced,
    markSyncError,
    getPendingCount,
    getRegistrosHoy,
    upsertEmpleados,
    upsertCredenciales,
    upsertHorario,
    upsertTolerancia,
    upsertDepartamentos,
    getEmpleado,
    getAllCredenciales,
    getHorario,
    getTolerancia,
    getDepartamentos,
    // Asistencias (historial)
    upsertAsistenciasMes,
    getAsistenciasMesLocal,
    // Empresa
    upsertEmpresa,
    getEmpresaLocal,
    // Avisos
    upsertAvisosGlobales,
    upsertAvisosEmpleado,
    getAvisosGlobalesLocal,
    getAvisosEmpleadoLocal,
    // Incidencias
    upsertIncidencias,
    getIncidenciasLocal,
    saveOfflineIncidencia,
    getPendingIncidencias,
    markIncidenciaSynced,
    markIncidenciaSyncError,
    // Sesiones
    saveOfflineSession,
    getPendingSessions,
    markSessionSynced,
    markSessionSyncError
};