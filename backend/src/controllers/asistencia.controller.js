// backend/src/controllers/asistencia.controller.js
import { pool } from '../config/db.js';

/**
 * Registrar entrada o salida con huella dactilar
 */
export const registrarAsistencia = async (req, res) => {
    try {
        const {
            id_empleado,
            tipo, // 'Entrada' o 'Salida'
            huella_dactilar, // Base64 o buffer de la huella capturada
            dispositivo_id,
            ubicacion
        } = req.body;

        console.log('📥 Solicitud de registro de asistencia:', {
            id_empleado,
            tipo,
            dispositivo_id,
            ubicacion,
            huella_length: huella_dactilar?.length || 0
        });

        // Validaciones
        if (!id_empleado || !tipo || !huella_dactilar) {
            return res.status(400).json({
                error: 'Campos requeridos: id_empleado, tipo, huella_dactilar',
                codigo: 'CAMPOS_FALTANTES'
            });
        }

        if (!['Entrada', 'Salida'].includes(tipo)) {
            return res.status(400).json({
                error: 'Tipo debe ser "Entrada" o "Salida"',
                codigo: 'TIPO_INVALIDO'
            });
        }

        // Verificar que el empleado existe
        const empleadoResult = await pool.query(
            'SELECT id, estado FROM empleado WHERE id = $1',
            [id_empleado]
        );

        if (empleadoResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Empleado no encontrado',
                codigo: 'EMPLEADO_NO_ENCONTRADO'
            });
        }

        if (!empleadoResult.rows[0].estado) {
            return res.status(403).json({
                error: 'Empleado inactivo',
                codigo: 'EMPLEADO_INACTIVO'
            });
        }

        // Obtener la huella registrada del empleado
        const credencialesResult = await pool.query(
            'SELECT dactilar FROM credenciales WHERE id_empleado = $1',
            [id_empleado]
        );

        if (credencialesResult.rows.length === 0 || !credencialesResult.rows[0].dactilar) {
            return res.status(404).json({
                error: 'No hay huella dactilar registrada para este empleado',
                codigo: 'SIN_HUELLA_REGISTRADA'
            });
        }

        // Verificar la huella
        const huellaRegistrada = credencialesResult.rows[0].dactilar;
        const huellaVerificada = verificarHuella(huella_dactilar, huellaRegistrada);

        if (!huellaVerificada) {
            console.log('❌ Huella no coincide para empleado:', id_empleado);
            return res.status(401).json({
                error: 'La huella dactilar no coincide',
                codigo: 'HUELLA_NO_COINCIDE'
            });
        }

        // Registrar la asistencia
        const registroResult = await pool.query(`
            INSERT INTO registro_asistencia (
                id_empleado,
                fecha,
                tipo,
                dispositivo,
                ubicacion,
                verificado
            )
            VALUES ($1, CURRENT_DATE, $2, 'Huella', $3, true)
            RETURNING *
        `, [id_empleado, tipo, ubicacion]);

        // Obtener información del empleado para la respuesta
        const empleadoInfo = await pool.query(`
            SELECT
                e.id,
                e.id_usuario,
                e.rfc,
                e.nss,
                u.nombre,
                u.foto
            FROM empleado e
            INNER JOIN usuario u ON e.id_usuario = u.id
            WHERE e.id = $1
        `, [id_empleado]);

        console.log('✅ Asistencia registrada exitosamente:', {
            registro_id: registroResult.rows[0].id,
            empleado: empleadoInfo.rows[0].nombre,
            tipo: tipo,
            fecha: registroResult.rows[0].fecha
        });

        res.status(201).json({
            success: true,
            message: `${tipo} registrada exitosamente`,
            registro: registroResult.rows[0],
            empleado: empleadoInfo.rows[0]
        });

    } catch (error) {
        console.error('❌ Error registrando asistencia:', error);
        res.status(500).json({
            error: 'Error al registrar asistencia',
            details: error.message
        });
    }
};

/**
 * Función auxiliar para verificar huella (SIMULACIÓN)
 * En producción, usar un algoritmo biométrico real
 */
function verificarHuella(huellaCapturada, huellaRegistrada) {
    try {
        // SIMULACIÓN: Comparar como strings base64
        // En producción, implementar algoritmo de coincidencia biométrica

        if (typeof huellaCapturada === 'string' && typeof huellaRegistrada === 'string') {
            return huellaCapturada === huellaRegistrada;
        }

        // Si son buffers, comparar
        if (Buffer.isBuffer(huellaCapturada) && Buffer.isBuffer(huellaRegistrada)) {
            return Buffer.compare(huellaCapturada, huellaRegistrada) === 0;
        }

        // Si uno es string y otro buffer, convertir
        const bufferCapturada = Buffer.isBuffer(huellaCapturada)
            ? huellaCapturada
            : Buffer.from(huellaCapturada, 'base64');

        const bufferRegistrada = Buffer.isBuffer(huellaRegistrada)
            ? huellaRegistrada
            : Buffer.from(huellaRegistrada, 'base64');

        return Buffer.compare(bufferCapturada, bufferRegistrada) === 0;
    } catch (error) {
        console.error('Error verificando huella:', error);
        return false;
    }
}

/**
 * Obtener registros de asistencia de un empleado
 */
export const obtenerAsistenciasEmpleado = async (req, res) => {
    try {
        const { id_empleado } = req.params;
        const { fecha_inicio, fecha_fin, limit = 100 } = req.query;

        let query = `
            SELECT
                ra.*,
                u.nombre as nombre_empleado,
                u.foto as foto_empleado,
                e.rfc,
                e.nss
            FROM registro_asistencia ra
            INNER JOIN empleado e ON ra.id_empleado = e.id
            INNER JOIN usuario u ON e.id_usuario = u.id
            WHERE ra.id_empleado = $1
        `;

        const params = [id_empleado];
        let paramIndex = 2;

        if (fecha_inicio) {
            query += ` AND ra.fecha >= $${paramIndex}`;
            params.push(fecha_inicio);
            paramIndex++;
        }

        if (fecha_fin) {
            query += ` AND ra.fecha <= $${paramIndex}`;
            params.push(fecha_fin);
            paramIndex++;
        }

        query += ` ORDER BY ra.fecha DESC, ra.created_at DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await pool.query(query, params);

        res.json({
            success: true,
            registros: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Error obteniendo asistencias:', error);
        res.status(500).json({
            error: 'Error al obtener asistencias',
            details: error.message
        });
    }
};

/**
 * Obtener registros de asistencia por fecha
 */
export const obtenerAsistenciasPorFecha = async (req, res) => {
    try {
        const { fecha } = req.params;

        const result = await pool.query(`
            SELECT
                ra.*,
                u.nombre as nombre_empleado,
                u.foto as foto_empleado,
                e.rfc,
                e.nss
            FROM registro_asistencia ra
            INNER JOIN empleado e ON ra.id_empleado = e.id
            INNER JOIN usuario u ON e.id_usuario = u.id
            WHERE ra.fecha = $1
            ORDER BY ra.created_at DESC
        `, [fecha]);

        res.json({
            success: true,
            fecha: fecha,
            registros: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Error obteniendo asistencias por fecha:', error);
        res.status(500).json({
            error: 'Error al obtener asistencias',
            details: error.message
        });
    }
};

/**
 * Obtener último registro de un empleado (para saber si debe hacer Entrada o Salida)
 */
export const obtenerUltimoRegistro = async (req, res) => {
    try {
        const { id_empleado } = req.params;

        const result = await pool.query(`
            SELECT *
            FROM registro_asistencia
            WHERE id_empleado = $1
            ORDER BY fecha DESC, created_at DESC
            LIMIT 1
        `, [id_empleado]);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                ultimo_registro: null,
                sugerencia: 'Entrada'
            });
        }

        const ultimoRegistro = result.rows[0];
        const sugerencia = ultimoRegistro.tipo === 'Entrada' ? 'Salida' : 'Entrada';

        res.json({
            success: true,
            ultimo_registro: ultimoRegistro,
            sugerencia: sugerencia
        });

    } catch (error) {
        console.error('Error obteniendo último registro:', error);
        res.status(500).json({
            error: 'Error al obtener último registro',
            details: error.message
        });
    }
};

/**
 * Obtener estadísticas de asistencia
 */
export const obtenerEstadisticas = async (req, res) => {
    try {
        const { fecha = new Date().toISOString().split('T')[0] } = req.query;

        const result = await pool.query(`
            SELECT
                COUNT(*) as total_registros,
                COUNT(*) FILTER (WHERE tipo = 'Entrada') as entradas,
                COUNT(*) FILTER (WHERE tipo = 'Salida') as salidas,
                COUNT(*) FILTER (WHERE metodo_registro = 'Huella') as por_huella,
                COUNT(*) FILTER (WHERE metodo_registro = 'Facial') as por_facial,
                COUNT(*) FILTER (WHERE metodo_registro = 'PIN') as por_pin,
                COUNT(*) FILTER (WHERE metodo_registro = 'Manual') as por_manual,
                COUNT(DISTINCT id_empleado) as empleados_registrados
            FROM registro_asistencia
            WHERE fecha = $1
        `, [fecha]);

        res.json({
            success: true,
            fecha: fecha,
            estadisticas: result.rows[0]
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            error: 'Error al obtener estadísticas',
            details: error.message
        });
    }
};

/**
 * Registrar asistencia con reconocimiento facial
 * No requiere verificación previa, solo el ID del empleado
 */
export const registrarAsistenciaFacial = async (req, res) => {
    try {
        const {
            id_empleado,
            tipo, // 'Entrada' o 'Salida' (opcional, se autodetecta)
            dispositivo_id,
            ubicacion
        } = req.body;

        console.log('📸 Registro de asistencia facial:', {
            id_empleado,
            tipo,
            dispositivo_id,
            ubicacion
        });

        // Validaciones
        if (!id_empleado) {
            return res.status(400).json({
                error: 'Campo requerido: id_empleado',
                codigo: 'CAMPOS_FALTANTES'
            });
        }

        // Verificar que el empleado existe y está activo
        const empleadoResult = await pool.query(
            'SELECT id, estado FROM empleado WHERE id = $1',
            [id_empleado]
        );

        if (empleadoResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Empleado no encontrado',
                codigo: 'EMPLEADO_NO_ENCONTRADO'
            });
        }

        if (!empleadoResult.rows[0].estado) {
            return res.status(403).json({
                error: 'Empleado inactivo',
                codigo: 'EMPLEADO_INACTIVO'
            });
        }

        // Si no se especifica tipo, autodetectar basado en el último registro
        let tipoRegistro = tipo;
        if (!tipoRegistro) {
            const ultimoRegistro = await pool.query(`
                SELECT tipo
                FROM registro_asistencia
                WHERE id_empleado = $1
                ORDER BY fecha DESC, created_at DESC
                LIMIT 1
            `, [id_empleado]);

            tipoRegistro = ultimoRegistro.rows.length === 0 || ultimoRegistro.rows[0].tipo === 'Salida'
                ? 'Entrada'
                : 'Salida';
        }

        // Validar tipo
        if (!['Entrada', 'Salida'].includes(tipoRegistro)) {
            return res.status(400).json({
                error: 'Tipo debe ser "Entrada" o "Salida"',
                codigo: 'TIPO_INVALIDO'
            });
        }

        // Registrar la asistencia
        const registroResult = await pool.query(`
            INSERT INTO registro_asistencia (
                id_empleado,
                fecha,
                tipo,
                dispositivo,
                ubicacion,
                verificado
            )
            VALUES ($1, CURRENT_DATE, $2, 'Facial', $3, true)
            RETURNING *
        `, [id_empleado, tipoRegistro, ubicacion]);

        // Obtener información del empleado para la respuesta
        const empleadoInfo = await pool.query(`
            SELECT
                e.id,
                e.id_usuario,
                e.rfc,
                e.nss,
                u.nombre,
                u.foto
            FROM empleado e
            INNER JOIN usuario u ON e.id_usuario = u.id
            WHERE e.id = $1
        `, [id_empleado]);

        console.log('✅ Asistencia facial registrada exitosamente:', {
            registro_id: registroResult.rows[0].id,
            empleado: empleadoInfo.rows[0].nombre,
            tipo: tipoRegistro,
            fecha: registroResult.rows[0].fecha
        });

        res.status(201).json({
            success: true,
            message: `${tipoRegistro} registrada exitosamente`,
            registro: registroResult.rows[0],
            empleado: empleadoInfo.rows[0]
        });

    } catch (error) {
        console.error('❌ Error registrando asistencia facial:', error);
        res.status(500).json({
            error: 'Error al registrar asistencia facial',
            details: error.message
        });
    }
};

/**
 * Registrar asistencia manual (por administrador)
 */
export const registrarAsistenciaManual = async (req, res) => {
    try {
        const {
            id_empleado,
            fecha,
            tipo,
            observaciones,
            id_usuario_registra
        } = req.body;

        console.log('📝 Registro manual de asistencia:', {
            id_empleado,
            fecha,
            tipo,
            id_usuario_registra
        });

        // Validaciones
        if (!id_empleado || !fecha || !tipo) {
            return res.status(400).json({
                error: 'Campos requeridos: id_empleado, fecha, tipo'
            });
        }

        if (!['Entrada', 'Salida'].includes(tipo)) {
            return res.status(400).json({
                error: 'Tipo debe ser "Entrada" o "Salida"'
            });
        }

        // Verificar que el empleado existe
        const empleadoCheck = await pool.query(
            'SELECT id FROM empleado WHERE id = $1',
            [id_empleado]
        );

        if (empleadoCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Empleado no encontrado'
            });
        }

        const result = await pool.query(`
            INSERT INTO registro_asistencia (
                id_empleado,
                fecha,
                tipo,
                metodo_registro,
                verificado,
                observaciones
            )
            VALUES ($1, $2, $3, 'Manual', true, $4)
            RETURNING *
        `, [id_empleado, fecha, tipo, observaciones]);

        console.log('✅ Asistencia manual registrada:', result.rows[0].id);

        res.status(201).json({
            success: true,
            message: 'Asistencia manual registrada',
            registro: result.rows[0]
        });

    } catch (error) {
        console.error('Error registrando asistencia manual:', error);
        res.status(500).json({
            error: 'Error al registrar asistencia manual',
            details: error.message
        });
    }
};

/**
 * Eliminar registro de asistencia (solo administradores)
 */
export const eliminarRegistro = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM registro_asistencia WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Registro no encontrado'
            });
        }

        console.log('🗑️ Registro eliminado:', id);

        res.json({
            success: true,
            message: 'Registro eliminado',
            registro: result.rows[0]
        });

    } catch (error) {
        console.error('Error eliminando registro:', error);
        res.status(500).json({
            error: 'Error al eliminar registro',
            details: error.message
        });
    }
};

/**
 * Obtener reporte de asistencia por rango de fechas
 */
export const obtenerReporte = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, id_empleado } = req.query;

        let query = `
            SELECT
                ra.fecha,
                ra.id_empleado,
                u.nombre as empleado,
                u.foto,
                e.rfc,
                e.nss,
                COUNT(*) FILTER (WHERE ra.tipo = 'Entrada') as entradas,
                COUNT(*) FILTER (WHERE ra.tipo = 'Salida') as salidas,
                MIN(CASE WHEN ra.tipo = 'Entrada' THEN ra.created_at END) as primera_entrada,
                MAX(CASE WHEN ra.tipo = 'Salida' THEN ra.created_at END) as ultima_salida,
                STRING_AGG(
                    CASE WHEN ra.metodo_registro = 'Manual'
                    THEN CONCAT(ra.tipo, ' (Manual)')
                    END, ', '
                ) as registros_manuales
            FROM registro_asistencia ra
            INNER JOIN empleado e ON ra.id_empleado = e.id
            INNER JOIN usuario u ON e.id_usuario = u.id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (fecha_inicio) {
            query += ` AND ra.fecha >= $${paramIndex}`;
            params.push(fecha_inicio);
            paramIndex++;
        }

        if (fecha_fin) {
            query += ` AND ra.fecha <= $${paramIndex}`;
            params.push(fecha_fin);
            paramIndex++;
        }

        if (id_empleado) {
            query += ` AND ra.id_empleado = $${paramIndex}`;
            params.push(id_empleado);
            paramIndex++;
        }

        query += `
            GROUP BY ra.fecha, ra.id_empleado, u.nombre, u.foto, e.rfc, e.nss
            ORDER BY ra.fecha DESC, u.nombre ASC
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            reporte: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Error generando reporte:', error);
        res.status(500).json({
            error: 'Error al generar reporte',
            details: error.message
        });
    }
};

/**
 * Obtener todos los registros de asistencia (con paginación)
 */
export const obtenerTodosRegistros = async (req, res) => {
    try {
        const { page = 1, limit = 50, fecha, tipo, metodo } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT
                ra.*,
                u.nombre as nombre_empleado,
                u.foto as foto_empleado,
                e.rfc,
                e.nss
            FROM registro_asistencia ra
            INNER JOIN empleado e ON ra.id_empleado = e.id
            INNER JOIN usuario u ON e.id_usuario = u.id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (fecha) {
            query += ` AND ra.fecha = $${paramIndex}`;
            params.push(fecha);
            paramIndex++;
        }

        if (tipo) {
            query += ` AND ra.tipo = $${paramIndex}`;
            params.push(tipo);
            paramIndex++;
        }

        if (metodo) {
            query += ` AND ra.metodo_registro = $${paramIndex}`;
            params.push(metodo);
            paramIndex++;
        }

        // Contar total
        const countQuery = query.replace('ra.*, u.nombre', 'COUNT(*)');
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Agregar paginación
        query += ` ORDER BY ra.fecha DESC, ra.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            success: true,
            registros: result.rows,
            paginacion: {
                pagina_actual: parseInt(page),
                limite: parseInt(limit),
                total_registros: total,
                total_paginas: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo todos los registros:', error);
        res.status(500).json({
            error: 'Error al obtener registros',
            details: error.message
        });
    }
};

/**
 * Validar disponibilidad del sistema (health check)
 */
export const healthCheck = async (req, res) => {
    try {
        // Verificar conexión a BD
        await pool.query('SELECT 1');

        // Obtener estadísticas básicas
        const stats = await pool.query(`
            SELECT
                COUNT(*) as total_registros_hoy
            FROM registro_asistencia
            WHERE fecha = CURRENT_DATE
        `);

        res.json({
            success: true,
            status: 'Sistema de asistencia operativo',
            timestamp: new Date().toISOString(),
            registros_hoy: stats.rows[0].total_registros_hoy
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'Error en el sistema',
            error: error.message
        });
    }
};