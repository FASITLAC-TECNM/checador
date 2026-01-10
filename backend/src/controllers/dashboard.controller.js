import { pool } from '../config/db.js';

/**
 * Obtener estadísticas generales del dashboard
 */
export const getEstadisticasDashboard = async (req, res) => {
    try {
        // 1. Estadísticas de usuarios
        const usuariosStats = await pool.query(`
            SELECT
                COUNT(*) AS total_usuarios,
                COUNT(*) FILTER (WHERE activo = 'Activo') AS usuarios_activos,
                COUNT(*) FILTER (WHERE activo = 'Suspensión') AS usuarios_suspendidos,
                COUNT(*) FILTER (WHERE activo = 'Baja') AS usuarios_baja,
                COUNT(*) FILTER (WHERE conexion = 'Conectado') AS usuarios_conectados,
                COUNT(*) FILTER (WHERE conexion = 'Desconectado') AS usuarios_desconectados
            FROM usuario
        `);

        // 2. Estadísticas de empleados
        const empleadosStats = await pool.query(`
            SELECT
                COUNT(*) AS total_empleados,
                COUNT(*) FILTER (WHERE e.estado::text = 'CONECTADO') AS empleados_conectados
            FROM empleado e
        `);

        // 3. Estadísticas de departamentos
        const departamentosStats = await pool.query(`
            SELECT
                COUNT(DISTINCT d.id_departamento) AS total_departamentos,
                COUNT(DISTINCT ed.id_empleado) AS empleados_asignados
            FROM departamento d
            LEFT JOIN empleado_departamento ed ON d.id_departamento = ed.id_departamento AND ed.estado = true
        `);

        // 4. Registros de asistencia hoy
        const asistenciaHoy = await pool.query(`
            SELECT
                COUNT(*) AS registros_hoy,
                COUNT(DISTINCT id_empleado) AS empleados_registrados_hoy,
                COUNT(*) FILTER (WHERE tipo = 'Entrada') AS entradas_hoy,
                COUNT(*) FILTER (WHERE tipo = 'Salida') AS salidas_hoy
            FROM registro_asistencia
            WHERE DATE(fecha) = CURRENT_DATE
        `);

        // 5. Registros de la semana
        const asistenciaSemana = await pool.query(`
            SELECT
                COUNT(*) AS registros_semana,
                COUNT(DISTINCT id_empleado) AS empleados_semana,
                COUNT(DISTINCT DATE(fecha)) AS dias_con_registros
            FROM registro_asistencia
            WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
        `);

        // 6. Incidencias pendientes
        const incidenciasPendientes = await pool.query(`
            SELECT
                COUNT(*) AS total_pendientes,
                COUNT(*) FILTER (WHERE tipo_incidencia = 'retardo') AS retardos,
                COUNT(*) FILTER (WHERE tipo_incidencia = 'permiso') AS permisos,
                COUNT(*) FILTER (WHERE tipo_incidencia = 'justificante') AS justificantes,
                COUNT(*) FILTER (WHERE tipo_incidencia = 'vacaciones') AS vacaciones
            FROM incidencia
            WHERE estado = 'pendiente'
        `);

        // 7. Dispositivos activos (escritorios y móviles)
        let dispositivosStats = { rows: [{
            total_dispositivos: 0,
            dispositivos_activos: 0,
            biometricos: 0,
            fisicos: 0,
            moviles: 0
        }]};

        try {
            const escritoriosCount = await pool.query(`SELECT COUNT(*) as total FROM escritorio`);
            const movilesCount = await pool.query(`SELECT COUNT(*) as total FROM dispositivomovil`);
            const escritoriosActivos = await pool.query(`SELECT COUNT(*) as total FROM escritorio WHERE estado::text = 'activo'`);
            const movilesActivos = await pool.query(`SELECT COUNT(*) as total FROM dispositivomovil WHERE estado = 'ACTIVO'`);

            const totalEscritorios = parseInt(escritoriosCount.rows[0]?.total) || 0;
            const totalMoviles = parseInt(movilesCount.rows[0]?.total) || 0;
            const activosEscritorios = parseInt(escritoriosActivos.rows[0]?.total) || 0;
            const activosMoviles = parseInt(movilesActivos.rows[0]?.total) || 0;

            dispositivosStats = { rows: [{
                total_dispositivos: totalEscritorios + totalMoviles,
                dispositivos_activos: activosEscritorios + activosMoviles,
                biometricos: 0, // No hay tabla de biométricos separada
                fisicos: totalEscritorios,
                moviles: totalMoviles
            }]};
        } catch (devError) {
            console.warn('Error cargando dispositivos, usando valores por defecto:', devError.message);
        }

        // Construir respuesta
        const estadisticas = {
            usuarios: {
                total: parseInt(usuariosStats.rows[0].total_usuarios) || 0,
                activos: parseInt(usuariosStats.rows[0].usuarios_activos) || 0,
                suspendidos: parseInt(usuariosStats.rows[0].usuarios_suspendidos) || 0,
                baja: parseInt(usuariosStats.rows[0].usuarios_baja) || 0,
                conectados: parseInt(usuariosStats.rows[0].usuarios_conectados) || 0,
                desconectados: parseInt(usuariosStats.rows[0].usuarios_desconectados) || 0
            },
            empleados: {
                total: parseInt(empleadosStats.rows[0].total_empleados) || 0,
                conectados: parseInt(empleadosStats.rows[0].empleados_conectados) || 0
            },
            departamentos: {
                total: parseInt(departamentosStats.rows[0].total_departamentos) || 0,
                empleados_asignados: parseInt(departamentosStats.rows[0].empleados_asignados) || 0
            },
            asistencia_hoy: {
                registros: parseInt(asistenciaHoy.rows[0].registros_hoy) || 0,
                empleados: parseInt(asistenciaHoy.rows[0].empleados_registrados_hoy) || 0,
                entradas: parseInt(asistenciaHoy.rows[0].entradas_hoy) || 0,
                salidas: parseInt(asistenciaHoy.rows[0].salidas_hoy) || 0
            },
            asistencia_semana: {
                registros: parseInt(asistenciaSemana.rows[0].registros_semana) || 0,
                empleados: parseInt(asistenciaSemana.rows[0].empleados_semana) || 0,
                dias: parseInt(asistenciaSemana.rows[0].dias_con_registros) || 0
            },
            incidencias: {
                pendientes: parseInt(incidenciasPendientes.rows[0].total_pendientes) || 0,
                retardos: parseInt(incidenciasPendientes.rows[0].retardos) || 0,
                permisos: parseInt(incidenciasPendientes.rows[0].permisos) || 0,
                justificantes: parseInt(incidenciasPendientes.rows[0].justificantes) || 0,
                vacaciones: parseInt(incidenciasPendientes.rows[0].vacaciones) || 0
            },
            dispositivos: {
                total: parseInt(dispositivosStats.rows[0].total_dispositivos) || 0,
                activos: parseInt(dispositivosStats.rows[0].dispositivos_activos) || 0,
                biometricos: parseInt(dispositivosStats.rows[0].biometricos) || 0,
                fisicos: parseInt(dispositivosStats.rows[0].fisicos) || 0,
                moviles: parseInt(dispositivosStats.rows[0].moviles) || 0
            },
            timestamp: new Date().toISOString()
        };

        res.json(estadisticas);

    } catch (error) {
        console.error('Error obteniendo estadísticas del dashboard:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Error al obtener estadísticas del dashboard', details: error.message });
    }
};

export default {
    getEstadisticasDashboard
};
