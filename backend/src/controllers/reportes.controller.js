import { pool } from '../config/db.js';

// ==================== REPORTE INDIVIDUAL DE EMPLEADO ====================

export const obtenerReporteEmpleado = async (req, res) => {
    try {
        const { id_empleado } = req.params;
        const {
            fecha_inicio,
            fecha_fin,
            incluir_incidencias = 'true',
            incluir_estadisticas = 'true'
        } = req.query;

        // Validaciones
        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                error: 'fecha_inicio y fecha_fin son requeridos'
            });
        }

        // 1. Datos básicos del empleado
        const empleadoResult = await pool.query(`
            SELECT
                e.id,
                e.rfc,
                e.nss,
                e.estado AS estado_empleado,
                u.nombre,
                u.correo AS email,
                u.telefono,
                u.foto,
                u.activo AS estado_usuario,
                h.config_excep AS horario_config,
                h.date_ini AS horario_inicio,
                h.date_fin AS horario_fin
            FROM empleado e
            INNER JOIN usuario u ON e.id_usuario = u.id
            LEFT JOIN horario h ON e.horario_id = h.id
            WHERE e.id = $1
        `, [id_empleado]);

        if (empleadoResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Empleado no encontrado'
            });
        }

        const empleado = empleadoResult.rows[0];

        // 2. Departamentos del empleado
        const departamentosResult = await pool.query(`
            SELECT
                d.id_departamento,
                d.nombre AS nombre_departamento,
                d.descripcion
            FROM empleado_departamento ed
            INNER JOIN departamento d ON ed.id_departamento = d.id_departamento
            WHERE ed.id_empleado = $1 AND ed.estado = true
        `, [id_empleado]);

        empleado.departamentos = departamentosResult.rows;

        // 3. Horario estructurado
        empleado.horario = empleado.horario_config ? {
            config_excep: empleado.horario_config,
            fecha_inicio: empleado.horario_inicio,
            fecha_fin: empleado.horario_fin
        } : null;

        delete empleado.horario_config;
        delete empleado.horario_inicio;
        delete empleado.horario_fin;

        // 4. Estadísticas de asistencia (si se solicita)
        let estadisticas = null;
        if (incluir_estadisticas === 'true') {
            const statsResult = await pool.query(`
                SELECT
                    COUNT(DISTINCT DATE(ra.fecha)) AS dias_asistidos,
                    COUNT(*) FILTER (WHERE ra.tipo = 'Entrada') AS total_entradas,
                    COUNT(*) FILTER (WHERE ra.tipo = 'Salida') AS total_salidas,
                    COUNT(*) FILTER (WHERE ra.dispositivo = 'Huella') AS registros_huella,
                    COUNT(*) FILTER (WHERE ra.dispositivo = 'Facial') AS registros_facial,
                    COUNT(*) FILTER (WHERE ra.tipo = 'PIN') AS registros_pin,
                    MIN(CASE WHEN ra.tipo = 'Entrada' THEN ra.fecha END) AS primera_entrada,
                    MAX(CASE WHEN ra.tipo = 'Salida' THEN ra.fecha END) AS ultima_salida
                FROM registro_asistencia ra
                WHERE ra.id_empleado = $1
                    AND ra.fecha >= $2::date
                    AND ra.fecha <= $3::date
            `, [id_empleado, fecha_inicio, fecha_fin]);

            estadisticas = statsResult.rows[0];

            // Convertir strings a números
            estadisticas.dias_asistidos = parseInt(estadisticas.dias_asistidos) || 0;
            estadisticas.total_entradas = parseInt(estadisticas.total_entradas) || 0;
            estadisticas.total_salidas = parseInt(estadisticas.total_salidas) || 0;
            estadisticas.registros_huella = parseInt(estadisticas.registros_huella) || 0;
            estadisticas.registros_facial = parseInt(estadisticas.registros_facial) || 0;
            estadisticas.registros_pin = parseInt(estadisticas.registros_pin) || 0;

            // Calcular promedio de horas diarias
            const horasResult = await pool.query(`
                SELECT
                    AVG(horas_trabajadas) AS promedio_horas_diarias
                FROM (
                    SELECT
                        DATE(ra.fecha) AS fecha,
                        EXTRACT(EPOCH FROM (
                            MAX(CASE WHEN ra.tipo = 'Salida' THEN ra.fecha END)::timestamp -
                            MIN(CASE WHEN ra.tipo = 'Entrada' THEN ra.fecha END)::timestamp
                        ))/3600 AS horas_trabajadas
                    FROM registro_asistencia ra
                    WHERE ra.id_empleado = $1
                        AND ra.fecha >= $2::date
                        AND ra.fecha <= $3::date
                    GROUP BY DATE(ra.fecha)
                    HAVING
                        MIN(CASE WHEN ra.tipo = 'Entrada' THEN ra.fecha END) IS NOT NULL
                        AND MAX(CASE WHEN ra.tipo = 'Salida' THEN ra.fecha END) IS NOT NULL
                ) AS horas_por_dia
            `, [id_empleado, fecha_inicio, fecha_fin]);

            estadisticas.promedio_horas_diarias = parseFloat(horasResult.rows[0]?.promedio_horas_diarias || 0);
        }

        // 5. Registros de asistencia detallados por día
        const registrosResult = await pool.query(`
            SELECT
                DATE(ra.fecha) AS fecha,
                MIN(CASE WHEN ra.tipo = 'Entrada' THEN ra.fecha END) AS hora_entrada,
                MAX(CASE WHEN ra.tipo = 'Salida' THEN ra.fecha END) AS hora_salida,
                MIN(CASE WHEN ra.tipo = 'Entrada' THEN ra.dispositivo END) AS metodo_entrada,
                MAX(CASE WHEN ra.tipo = 'Salida' THEN ra.dispositivo END) AS metodo_salida,
                EXTRACT(EPOCH FROM (
                    MAX(CASE WHEN ra.tipo = 'Salida' THEN ra.fecha END)::timestamp -
                    MIN(CASE WHEN ra.tipo = 'Entrada' THEN ra.fecha END)::timestamp
                ))/3600 AS horas_trabajadas
            FROM registro_asistencia ra
            WHERE ra.id_empleado = $1
                AND ra.fecha >= $2::date
                AND ra.fecha <= $3::date
            GROUP BY DATE(ra.fecha)
            ORDER BY DATE(ra.fecha) DESC
        `, [id_empleado, fecha_inicio, fecha_fin]);

        const registros_asistencia = registrosResult.rows.map(row => ({
            fecha: row.fecha,
            hora_entrada: row.hora_entrada ? new Date(row.hora_entrada).toTimeString().split(' ')[0] : null,
            hora_salida: row.hora_salida ? new Date(row.hora_salida).toTimeString().split(' ')[0] : null,
            horas_trabajadas: row.horas_trabajadas ? parseFloat(row.horas_trabajadas) : null,
            metodo_entrada: row.metodo_entrada,
            metodo_salida: row.metodo_salida
        }));

        // 6. Incidencias (si se solicita)
        let incidencias = [];
        if (incluir_incidencias === 'true') {
            const incidenciasResult = await pool.query(`
                SELECT
                    i.id,
                    i.tipo_incidencia,
                    i.motivo,
                    i.fecha_ini,
                    i.fecha_fin,
                    i.fecha_aprob,
                    i.estado,
                    i.observaciones,
                    (i.fecha_fin - i.fecha_ini + 1) AS dias_duracion
                FROM incidencia i
                WHERE i.id_empleado = $1
                    AND i.fecha_ini <= $3::date
                    AND i.fecha_fin >= $2::date
                ORDER BY i.fecha_ini DESC
            `, [id_empleado, fecha_inicio, fecha_fin]);

            incidencias = incidenciasResult.rows.map(row => ({
                ...row,
                dias_duracion: parseInt(row.dias_duracion) || 0
            }));
        }

        // Respuesta final
        res.json({
            success: true,
            tipo_reporte: 'individual',
            generado_en: new Date().toISOString(),
            periodo: {
                fecha_inicio,
                fecha_fin
            },
            empleado,
            estadisticas,
            registros_asistencia,
            incidencias
        });

    } catch (err) {
        console.error('Error obteniendo reporte de empleado:', err);
        console.error('Stack trace:', err.stack);
        console.error('SQL Error Detail:', err.detail);
        res.status(500).json({ error: 'Error al obtener reporte de empleado', details: err.message });
    }
};

// ==================== REPORTE POR DEPARTAMENTO ====================

export const obtenerReporteDepartamento = async (req, res) => {
    try {
        const { id_departamento } = req.params;
        const {
            fecha_inicio,
            fecha_fin,
            incluir_empleados_inactivos = 'false'
        } = req.query;

        // Validaciones
        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                error: 'fecha_inicio y fecha_fin son requeridos'
            });
        }

        // 1. Información del departamento
        const departamentoResult = await pool.query(`
            SELECT
                d.id_departamento,
                d.nombre,
                d.descripcion,
                d.ubicacion,
                COUNT(DISTINCT ed.id_empleado) AS total_empleados
            FROM departamento d
            LEFT JOIN empleado_departamento ed ON d.id_departamento = ed.id_departamento AND ed.estado = true
            WHERE d.id_departamento = $1
            GROUP BY d.id_departamento, d.nombre, d.descripcion, d.ubicacion
        `, [id_departamento]);

        if (departamentoResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Departamento no encontrado'
            });
        }

        const departamento = departamentoResult.rows[0];
        departamento.total_empleados = parseInt(departamento.total_empleados) || 0;

        // 2. Lista de empleados del departamento con sus estadísticas
        const empleadosResult = await pool.query(`
            SELECT
                e.id AS id_empleado,
                u.nombre,
                e.rfc,
                e.nss,
                e.estado,
                COUNT(DISTINCT DATE(ra.fecha)) AS dias_asistidos,
                COUNT(*) FILTER (WHERE ra.tipo = 'Entrada') AS total_entradas,
                COUNT(*) FILTER (WHERE ra.tipo = 'Salida') AS total_salidas,
                COUNT(DISTINCT i.id) AS total_incidencias
            FROM empleado_departamento ed
            INNER JOIN empleado e ON ed.id_empleado = e.id
            INNER JOIN usuario u ON e.id_usuario = u.id
            LEFT JOIN registro_asistencia ra ON e.id = ra.id_empleado
                AND ra.fecha >= $2::date
                AND ra.fecha <= $3::date
            LEFT JOIN incidencia i ON e.id = i.id_empleado
                AND i.fecha_ini <= $3::date
                AND i.fecha_fin >= $2::date
            WHERE ed.id_departamento = $1
                AND ed.estado = true
                AND (u.activo = 'Activo' OR $4::boolean = true)
            GROUP BY e.id, u.nombre, e.rfc, e.nss, e.estado, u.activo
            ORDER BY u.nombre
        `, [id_departamento, fecha_inicio, fecha_fin, incluir_empleados_inactivos === 'true']);

        const empleados = empleadosResult.rows.map(emp => ({
            ...emp,
            dias_asistidos: parseInt(emp.dias_asistidos) || 0,
            total_entradas: parseInt(emp.total_entradas) || 0,
            total_salidas: parseInt(emp.total_salidas) || 0,
            total_incidencias: parseInt(emp.total_incidencias) || 0,
            promedio_horas_diarias: parseFloat(emp.promedio_horas_diarias) || 0
        }));

        // 3. Resumen diario de asistencia
        const resumenResult = await pool.query(`
            SELECT
                DATE(ra.fecha) AS fecha,
                COUNT(DISTINCT ra.id_empleado) AS empleados_registrados,
                COUNT(*) FILTER (WHERE ra.tipo = 'Entrada') AS total_entradas,
                COUNT(*) FILTER (WHERE ra.tipo = 'Salida') AS total_salidas
            FROM registro_asistencia ra
            INNER JOIN empleado_departamento ed ON ra.id_empleado = ed.id_empleado
            WHERE ed.id_departamento = $1
                AND ed.estado = true
                AND ra.fecha >= $2::date
                AND ra.fecha <= $3::date
            GROUP BY DATE(ra.fecha)
            ORDER BY DATE(ra.fecha) DESC
        `, [id_departamento, fecha_inicio, fecha_fin]);

        const resumen_diario = resumenResult.rows.map(row => ({
            ...row,
            empleados_registrados: parseInt(row.empleados_registrados) || 0,
            total_entradas: parseInt(row.total_entradas) || 0,
            total_salidas: parseInt(row.total_salidas) || 0
        }));

        // 4. Incidencias del departamento
        const incidenciasResult = await pool.query(`
            SELECT
                u.nombre AS empleado,
                i.tipo_incidencia,
                i.motivo,
                i.fecha_ini,
                i.fecha_fin,
                i.estado,
                (i.fecha_fin - i.fecha_ini + 1) AS dias_duracion
            FROM incidencia i
            INNER JOIN empleado e ON i.id_empleado = e.id
            INNER JOIN usuario u ON e.id_usuario = u.id
            INNER JOIN empleado_departamento ed ON e.id = ed.id_empleado
            WHERE ed.id_departamento = $1
                AND ed.estado = true
                AND i.fecha_ini <= $3::date
                AND i.fecha_fin >= $2::date
            ORDER BY i.fecha_ini DESC
        `, [id_departamento, fecha_inicio, fecha_fin]);

        const incidencias = incidenciasResult.rows.map(row => ({
            ...row,
            dias_duracion: parseInt(row.dias_duracion) || 0
        }));

        // 5. Estadísticas generales del departamento
        const total_registros = resumen_diario.reduce((sum, dia) => sum + dia.total_entradas + dia.total_salidas, 0);
        const promedio_asistencia_diaria = resumen_diario.length > 0
            ? resumen_diario.reduce((sum, dia) => sum + dia.empleados_registrados, 0) / resumen_diario.length
            : 0;
        const porcentaje_asistencia = departamento.total_empleados > 0
            ? (promedio_asistencia_diaria / departamento.total_empleados) * 100
            : 0;

        const estadisticas_departamento = {
            promedio_asistencia_diaria: parseFloat(promedio_asistencia_diaria.toFixed(2)),
            total_registros_periodo: total_registros,
            porcentaje_asistencia: parseFloat(porcentaje_asistencia.toFixed(2))
        };

        // Respuesta final
        res.json({
            success: true,
            tipo_reporte: 'departamental',
            generado_en: new Date().toISOString(),
            periodo: {
                fecha_inicio,
                fecha_fin
            },
            departamento,
            empleados,
            resumen_diario,
            incidencias,
            estadisticas_departamento
        });

    } catch (err) {
        console.error('Error obteniendo reporte de departamento:', err);
        res.status(500).json({ error: 'Error al obtener reporte de departamento', details: err.message });
    }
};

// ==================== REPORTE GLOBAL/EJECUTIVO ====================

export const obtenerReporteGlobal = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, agrupar_por } = req.query;

        // Validaciones
        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                error: 'fecha_inicio y fecha_fin son requeridos'
            });
        }

        // 1. Estadísticas generales del sistema
        const statsResult = await pool.query(`
            SELECT
                (SELECT COUNT(DISTINCT id) FROM empleado) AS total_empleados,
                (SELECT COUNT(DISTINCT e.id) FROM empleado e INNER JOIN usuario u ON e.id_usuario = u.id WHERE u.activo = 'Activo') AS empleados_activos,
                (SELECT COUNT(DISTINCT id_departamento) FROM departamento) AS total_departamentos,
                (SELECT COUNT(*) FROM registro_asistencia
                 WHERE fecha >= $1::date AND fecha <= $2::date) AS total_registros_periodo,
                (SELECT COUNT(DISTINCT DATE(fecha)) FROM registro_asistencia
                 WHERE fecha >= $1::date AND fecha <= $2::date) AS dias_con_registros
        `, [fecha_inicio, fecha_fin]);

        const estadisticas_generales = {
            total_empleados: parseInt(statsResult.rows[0].total_empleados) || 0,
            empleados_activos: parseInt(statsResult.rows[0].empleados_activos) || 0,
            total_departamentos: parseInt(statsResult.rows[0].total_departamentos) || 0,
            total_registros_periodo: parseInt(statsResult.rows[0].total_registros_periodo) || 0,
            dias_con_registros: parseInt(statsResult.rows[0].dias_con_registros) || 0
        };

        // 2. Asistencia por departamento
        const departamentosResult = await pool.query(`
            SELECT
                d.id_departamento,
                d.nombre AS departamento,
                COUNT(DISTINCT ed.id_empleado) AS total_empleados,
                COUNT(DISTINCT ra.id_empleado) AS empleados_con_registros,
                COUNT(DISTINCT DATE(ra.fecha)) AS dias_con_actividad,
                COUNT(ra.id) AS total_registros,
                ROUND(
                    COALESCE(
                        COUNT(DISTINCT ra.id_empleado)::NUMERIC /
                        NULLIF(COUNT(DISTINCT ed.id_empleado), 0) * 100,
                        0
                    ),
                    2
                ) AS porcentaje_asistencia
            FROM departamento d
            LEFT JOIN empleado_departamento ed ON d.id_departamento = ed.id_departamento AND ed.estado = true
            LEFT JOIN empleado e ON ed.id_empleado = e.id
            LEFT JOIN usuario u ON e.id_usuario = u.id AND u.activo = 'Activo'
            LEFT JOIN registro_asistencia ra ON e.id = ra.id_empleado
                AND ra.fecha >= $1::date
                AND ra.fecha <= $2::date
            GROUP BY d.id_departamento, d.nombre
            ORDER BY total_registros DESC
        `, [fecha_inicio, fecha_fin]);

        const por_departamento = departamentosResult.rows.map(dept => ({
            ...dept,
            total_empleados: parseInt(dept.total_empleados) || 0,
            empleados_con_registros: parseInt(dept.empleados_con_registros) || 0,
            dias_con_actividad: parseInt(dept.dias_con_actividad) || 0,
            total_registros: parseInt(dept.total_registros) || 0,
            porcentaje_asistencia: parseFloat(dept.porcentaje_asistencia) || 0
        }));

        // 3. Métodos de registro más utilizados
        const metodosResult = await pool.query(`
            SELECT
                COALESCE(ra.dispositivo, 'Desconocido') AS metodo,
                COUNT(*) AS total_usos,
                ROUND(
                    COUNT(*)::NUMERIC /
                    NULLIF((SELECT COUNT(*) FROM registro_asistencia WHERE fecha >= $1::date AND fecha <= $2::date), 0) * 100,
                    2
                ) AS porcentaje
            FROM registro_asistencia ra
            WHERE ra.fecha >= $1::date AND ra.fecha <= $2::date
            GROUP BY ra.dispositivo
            ORDER BY total_usos DESC
        `, [fecha_inicio, fecha_fin]);

        const metodos_registro = metodosResult.rows.map(metodo => ({
            ...metodo,
            total_usos: parseInt(metodo.total_usos) || 0,
            porcentaje: parseFloat(metodo.porcentaje) || 0
        }));

        // 4. Tendencia diaria de asistencia
        const tendenciaResult = await pool.query(`
            SELECT
                DATE(ra.fecha) AS fecha,
                COUNT(DISTINCT ra.id_empleado) AS empleados_unicos,
                COUNT(*) FILTER (WHERE ra.tipo = 'Entrada') AS total_entradas,
                COUNT(*) FILTER (WHERE ra.tipo = 'Salida') AS total_salidas,
                COUNT(*) AS total_registros
            FROM registro_asistencia ra
            WHERE ra.fecha >= $1::date AND ra.fecha <= $2::date
            GROUP BY DATE(ra.fecha)
            ORDER BY DATE(ra.fecha)
        `, [fecha_inicio, fecha_fin]);

        const tendencia_diaria = tendenciaResult.rows.map(dia => ({
            ...dia,
            empleados_unicos: parseInt(dia.empleados_unicos) || 0,
            total_entradas: parseInt(dia.total_entradas) || 0,
            total_salidas: parseInt(dia.total_salidas) || 0,
            total_registros: parseInt(dia.total_registros) || 0
        }));

        // 5. Top 10 empleados más puntuales (por días asistidos)
        const topEmpleadosResult = await pool.query(`
            SELECT
                u.nombre,
                e.rfc,
                COUNT(DISTINCT DATE(ra.fecha)) AS dias_asistidos,
                COUNT(*) FILTER (WHERE ra.tipo = 'Entrada') AS total_entradas
            FROM empleado e
            INNER JOIN usuario u ON e.id_usuario = u.id
            INNER JOIN registro_asistencia ra ON e.id = ra.id_empleado
            WHERE ra.fecha >= $1::date AND ra.fecha <= $2::date
            GROUP BY u.nombre, e.rfc
            HAVING COUNT(DISTINCT DATE(ra.fecha)) >= 5
            ORDER BY dias_asistidos DESC
            LIMIT 10
        `, [fecha_inicio, fecha_fin]);

        const top_empleados_puntuales = topEmpleadosResult.rows.map(emp => ({
            ...emp,
            dias_asistidos: parseInt(emp.dias_asistidos) || 0,
            total_entradas: parseInt(emp.total_entradas) || 0
        }));

        // 6. Incidencias globales por tipo
        const incidenciasResult = await pool.query(`
            SELECT
                i.tipo_incidencia,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE i.estado = 'aprobada') AS aprobadas,
                COUNT(*) FILTER (WHERE i.estado = 'pendiente') AS pendientes,
                COUNT(*) FILTER (WHERE i.estado = 'rechazada') AS rechazadas,
                SUM(i.fecha_fin - i.fecha_ini + 1) AS total_dias
            FROM incidencia i
            WHERE i.fecha_ini <= $2::date AND i.fecha_fin >= $1::date
            GROUP BY i.tipo_incidencia
            ORDER BY total DESC
        `, [fecha_inicio, fecha_fin]);

        const incidencias_por_tipo = incidenciasResult.rows.map(inc => ({
            ...inc,
            total: parseInt(inc.total) || 0,
            aprobadas: parseInt(inc.aprobadas) || 0,
            pendientes: parseInt(inc.pendientes) || 0,
            rechazadas: parseInt(inc.rechazadas) || 0,
            total_dias: parseInt(inc.total_dias) || 0
        }));

        // Respuesta final
        res.json({
            success: true,
            tipo_reporte: 'global',
            generado_en: new Date().toISOString(),
            periodo: {
                fecha_inicio,
                fecha_fin
            },
            estadisticas_generales,
            por_departamento,
            metodos_registro,
            tendencia_diaria,
            top_empleados_puntuales,
            incidencias_por_tipo
        });

    } catch (err) {
        console.error('Error obteniendo reporte global:', err);
        res.status(500).json({ error: 'Error al obtener reporte global', details: err.message });
    }
};

// ==================== REPORTE DE INCIDENCIAS ====================

export const obtenerReporteIncidencias = async (req, res) => {
    try {
        const {
            fecha_inicio,
            fecha_fin,
            tipo_incidencia,
            estado,
            id_empleado,
            id_departamento
        } = req.query;

        // Validaciones
        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                error: 'fecha_inicio y fecha_fin son requeridos'
            });
        }

        // 1. Listado completo de incidencias con filtros
        let query = `
            SELECT
                i.id,
                u.nombre AS empleado,
                e.rfc,
                d.nombre AS departamento,
                i.tipo_incidencia,
                i.motivo,
                i.fecha_ini,
                i.fecha_fin,
                (i.fecha_fin - i.fecha_ini + 1) AS dias_duracion,
                i.fecha_aprob,
                i.estado,
                i.observaciones
            FROM incidencia i
            INNER JOIN empleado e ON i.id_empleado = e.id
            INNER JOIN usuario u ON e.id_usuario = u.id
            LEFT JOIN empleado_departamento ed ON e.id = ed.id_empleado AND ed.estado = true
            LEFT JOIN departamento d ON ed.id_departamento = d.id_departamento
            WHERE i.fecha_ini <= $2::date
                AND i.fecha_fin >= $1::date
        `;

        const params = [fecha_inicio, fecha_fin];
        let paramIndex = 3;

        if (tipo_incidencia) {
            query += ` AND i.tipo_incidencia = $${paramIndex}`;
            params.push(tipo_incidencia);
            paramIndex++;
        }

        if (estado) {
            query += ` AND i.estado = $${paramIndex}`;
            params.push(estado);
            paramIndex++;
        }

        if (id_empleado) {
            query += ` AND i.id_empleado = $${paramIndex}`;
            params.push(id_empleado);
            paramIndex++;
        }

        if (id_departamento) {
            query += ` AND ed.id_departamento = $${paramIndex}`;
            params.push(id_departamento);
            paramIndex++;
        }

        query += ' ORDER BY i.fecha_ini DESC, u.nombre';

        const incidenciasResult = await pool.query(query, params);

        const incidencias = incidenciasResult.rows.map(inc => ({
            ...inc,
            dias_duracion: parseInt(inc.dias_duracion) || 0
        }));

        // 2. Estadísticas de incidencias
        const statsQuery = `
            SELECT
                COUNT(*) AS total_incidencias,
                COUNT(*) FILTER (WHERE estado = 'aprobada') AS aprobadas,
                COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
                COUNT(*) FILTER (WHERE estado = 'rechazada') AS rechazadas,
                COALESCE(SUM(fecha_fin - fecha_ini + 1), 0) AS total_dias_incidencias,
                COALESCE(AVG(fecha_fin - fecha_ini + 1), 0) AS promedio_dias_por_incidencia
            FROM incidencia
            WHERE fecha_ini <= $2::date AND fecha_fin >= $1::date
                ${tipo_incidencia ? `AND tipo_incidencia = $3` : ''}
                ${estado ? `AND estado = $${tipo_incidencia ? 4 : 3}` : ''}
                ${id_empleado ? `AND id_empleado = $${tipo_incidencia && estado ? 5 : tipo_incidencia || estado ? 4 : 3}` : ''}
        `;

        const statsParams = [fecha_inicio, fecha_fin];
        if (tipo_incidencia) statsParams.push(tipo_incidencia);
        if (estado) statsParams.push(estado);
        if (id_empleado) statsParams.push(id_empleado);

        const statsResult = await pool.query(statsQuery, statsParams);

        const estadisticas = {
            total_incidencias: parseInt(statsResult.rows[0].total_incidencias) || 0,
            aprobadas: parseInt(statsResult.rows[0].aprobadas) || 0,
            pendientes: parseInt(statsResult.rows[0].pendientes) || 0,
            rechazadas: parseInt(statsResult.rows[0].rechazadas) || 0,
            total_dias_incidencias: parseInt(statsResult.rows[0].total_dias_incidencias) || 0,
            promedio_dias_por_incidencia: parseFloat(parseFloat(statsResult.rows[0].promedio_dias_por_incidencia).toFixed(2)) || 0
        };

        // 3. Empleados con más incidencias
        const topEmpleadosQuery = `
            SELECT
                u.nombre AS empleado,
                e.rfc,
                COUNT(*) AS total_incidencias,
                SUM(i.fecha_fin - i.fecha_ini + 1) AS total_dias,
                COUNT(*) FILTER (WHERE i.tipo_incidencia = 'retardo') AS retardos,
                COUNT(*) FILTER (WHERE i.tipo_incidencia = 'permiso') AS permisos,
                COUNT(*) FILTER (WHERE i.tipo_incidencia = 'vacaciones') AS vacaciones
            FROM incidencia i
            INNER JOIN empleado e ON i.id_empleado = e.id
            INNER JOIN usuario u ON e.id_usuario = u.id
            WHERE i.fecha_ini <= $2::date AND i.fecha_fin >= $1::date
                ${tipo_incidencia ? `AND i.tipo_incidencia = $3` : ''}
                ${estado ? `AND i.estado = $${tipo_incidencia ? 4 : 3}` : ''}
            GROUP BY u.nombre, e.rfc
            ORDER BY total_incidencias DESC
            LIMIT 20
        `;

        const topParams = [fecha_inicio, fecha_fin];
        if (tipo_incidencia) topParams.push(tipo_incidencia);
        if (estado) topParams.push(estado);

        const topResult = await pool.query(topEmpleadosQuery, topParams);

        const empleados_con_mas_incidencias = topResult.rows.map(emp => ({
            ...emp,
            total_incidencias: parseInt(emp.total_incidencias) || 0,
            total_dias: parseInt(emp.total_dias) || 0,
            retardos: parseInt(emp.retardos) || 0,
            permisos: parseInt(emp.permisos) || 0,
            vacaciones: parseInt(emp.vacaciones) || 0
        }));

        // Respuesta final
        res.json({
            success: true,
            tipo_reporte: 'incidencias',
            generado_en: new Date().toISOString(),
            periodo: {
                fecha_inicio,
                fecha_fin
            },
            filtros_aplicados: {
                tipo_incidencia: tipo_incidencia || null,
                estado: estado || null,
                id_empleado: id_empleado ? parseInt(id_empleado) : null,
                id_departamento: id_departamento ? parseInt(id_departamento) : null
            },
            incidencias,
            estadisticas,
            empleados_con_mas_incidencias
        });

    } catch (err) {
        console.error('Error obteniendo reporte de incidencias:', err);
        res.status(500).json({ error: 'Error al obtener reporte de incidencias' });
    }
};
