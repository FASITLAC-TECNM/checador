import { pool } from '../config/db.js';

// ==================== CRUD DE EMPLEADOS ====================

export const getEmpleados = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                e.id,
                e.id_usuario,
                e.nss,
                e.rfc,
                e.pin,
                e.estado_empleado,
                e.fecha_cambio_estado,
                e.motivo_cambio_estado,
                u.username,
                u.correo as email,
                u.nombre,
                u.telefono,
                u.foto,
                u.activo,
                u.estado
            FROM empleado e
            INNER JOIN usuarios u ON e.id_usuario = u.id_usuario
            ORDER BY e.id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error obteniendo empleados:', err);
        res.status(500).json({ error: 'Error al obtener empleados' });
    }
};

export const getEmpleadoById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                e.id,
                e.id_usuario,
                e.nss,
                e.rfc,
                e.pin,
                e.estado_empleado,
                e.fecha_cambio_estado,
                e.motivo_cambio_estado,
                u.username,
                u.correo as email,
                u.nombre,
                u.telefono,
                u.foto,
                u.activo,
                u.estado
            FROM empleado e
            INNER JOIN usuarios u ON e.id_usuario = u.id_usuario
            WHERE e.id = $1
        `, [id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error obteniendo empleado:', err);
        res.status(500).json({ error: 'Error al obtener empleado' });
    }
};

export const getEmpleadoByUsuarioId = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const result = await pool.query(`
            SELECT
                e.id,
                e.id_usuario,
                e.nss,
                e.rfc,
                e.pin,
                e.estado_empleado,
                e.fecha_cambio_estado,
                e.motivo_cambio_estado,
                u.username,
                u.correo as email,
                u.nombre,
                u.telefono,
                u.foto,
                u.activo,
                u.estado
            FROM empleado e
            INNER JOIN usuarios u ON e.id_usuario = u.id_usuario
            WHERE e.id_usuario = $1
        `, [id_usuario]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error obteniendo empleado por usuario:', err);
        res.status(500).json({ error: 'Error al obtener empleado' });
    }
};

export const createEmpleado = async (req, res) => {
    try {
        const {
            id_usuario,
            nss,
            rfc,
            pin
        } = req.body;

        if (!id_usuario || !nss || !rfc || !pin) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                required: ['id_usuario', 'nss', 'rfc', 'pin']
            });
        }

        // Verificar que el usuario existe
        const usuarioCheck = await pool.query(
            'SELECT id_usuario FROM usuarios WHERE id_usuario = $1',
            [id_usuario]
        );

        if (usuarioCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'El usuario especificado no existe'
            });
        }

        // Verificar que el usuario no sea ya un empleado
        const empleadoCheck = await pool.query(
            'SELECT id FROM empleado WHERE id_usuario = $1',
            [id_usuario]
        );

        if (empleadoCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Este usuario ya está registrado como empleado'
            });
        }

        const result = await pool.query(`
            INSERT INTO empleado (id_usuario, nss, rfc, pin)
            VALUES ($1, $2, $3, $4)
            RETURNING
                id,
                id_usuario,
                nss,
                rfc,
                pin
        `, [id_usuario, nss, rfc, pin]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creando empleado:', err);
        if (err.code === '23505') {
            return res.status(409).json({
                error: 'El NSS o RFC ya están registrados'
            });
        }
        res.status(500).json({ error: 'Error al crear empleado' });
    }
};

export const updateEmpleado = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nss,
            rfc,
            pin
        } = req.body;

        if (!nss || !rfc || !pin) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                required: ['nss', 'rfc', 'pin']
            });
        }

        const result = await pool.query(`
            UPDATE empleado
            SET nss = $1,
                rfc = $2,
                pin = $3
            WHERE id = $4
            RETURNING
                id,
                id_usuario,
                nss,
                rfc,
                pin
        `, [nss, rfc, pin, id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error actualizando empleado:', err);
        if (err.code === '23505') {
            return res.status(409).json({
                error: 'El NSS o RFC ya están registrados'
            });
        }
        res.status(500).json({ error: 'Error al actualizar empleado' });
    }
};

export const deleteEmpleado = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM empleado WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado' });

        res.json({ message: 'Empleado eliminado', empleado: result.rows[0] });
    } catch (err) {
        console.error('Error eliminando empleado:', err);
        res.status(500).json({ error: 'Error al eliminar empleado' });
    }
};

// ==================== ENDPOINTS ADICIONALES ====================

export const buscarPorNSS = async (req, res) => {
    try {
        const { nss } = req.params;
        const result = await pool.query(`
            SELECT
                e.id,
                e.id_usuario,
                e.nss,
                e.rfc,
                e.pin,
                e.estado_empleado,
                e.fecha_cambio_estado,
                e.motivo_cambio_estado,
                u.username,
                u.correo as email,
                u.nombre,
                u.telefono,
                u.foto,
                u.activo,
                u.estado
            FROM empleado e
            INNER JOIN usuarios u ON e.id_usuario = u.id_usuario
            WHERE e.nss = $1
        `, [nss]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado con ese NSS' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error buscando empleado por NSS:', err);
        res.status(500).json({ error: 'Error al buscar empleado' });
    }
};

export const buscarPorRFC = async (req, res) => {
    try {
        const { rfc } = req.params;
        const result = await pool.query(`
            SELECT
                e.id,
                e.id_usuario,
                e.nss,
                e.rfc,
                e.pin,
                e.estado_empleado,
                e.fecha_cambio_estado,
                e.motivo_cambio_estado,
                u.username,
                u.correo as email,
                u.nombre,
                u.telefono,
                u.foto,
                u.activo,
                u.estado
            FROM empleado e
            INNER JOIN usuarios u ON e.id_usuario = u.id_usuario
            WHERE e.rfc = $1
        `, [rfc]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado con ese RFC' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error buscando empleado por RFC:', err);
        res.status(500).json({ error: 'Error al buscar empleado' });
    }
};

export const verificarPIN = async (req, res) => {
    try {
        const { id } = req.params;
        const { pin } = req.body;

        if (!pin) {
            return res.status(400).json({
                error: 'PIN es requerido'
            });
        }

        const result = await pool.query(
            'SELECT id, id_usuario FROM empleado WHERE id = $1 AND pin = $2',
            [id, pin]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'PIN incorrecto'
            });
        }

        res.json({
            success: true,
            message: 'PIN verificado correctamente',
            empleado: result.rows[0]
        });
    } catch (err) {
        console.error('Error verificando PIN:', err);
        res.status(500).json({ error: 'Error al verificar PIN' });
    }
};

export const cambiarEstadoEmpleado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, motivo } = req.body;

        const estadosValidos = ['ACTIVO', 'LICENCIA', 'VACACIONES', 'BAJA_TEMPORAL', 'BAJA_DEFINITIVA'];

        if (!estado || !estadosValidos.includes(estado)) {
            return res.status(400).json({
                error: 'Estado inválido',
                estadosValidos
            });
        }

        const result = await pool.query(`
            UPDATE empleado
            SET estado_empleado = $1,
                motivo_cambio_estado = $2
            WHERE id = $3
            RETURNING
                id,
                id_usuario,
                estado_empleado,
                fecha_cambio_estado,
                motivo_cambio_estado
        `, [estado, motivo || null, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        res.json({
            message: 'Estado del empleado actualizado',
            empleado: result.rows[0]
        });
    } catch (err) {
        console.error('Error cambiando estado de empleado:', err);
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
};

export const getHistorialEstados = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                e.id,
                e.estado_empleado,
                e.fecha_cambio_estado,
                e.motivo_cambio_estado,
                u.nombre
            FROM empleado e
            INNER JOIN usuarios u ON e.id_usuario = u.id_usuario
            WHERE e.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error obteniendo historial:', err);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
};

export const getStats = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) as total_empleados,
                COUNT(CASE WHEN e.estado_empleado = 'ACTIVO' THEN 1 END) as activos,
                COUNT(CASE WHEN e.estado_empleado = 'LICENCIA' THEN 1 END) as en_licencia,
                COUNT(CASE WHEN e.estado_empleado = 'VACACIONES' THEN 1 END) as en_vacaciones,
                COUNT(CASE WHEN e.estado_empleado = 'BAJA_TEMPORAL' THEN 1 END) as baja_temporal,
                COUNT(CASE WHEN e.estado_empleado = 'BAJA_DEFINITIVA' THEN 1 END) as baja_definitiva,
                COUNT(CASE WHEN u.estado = 'CONECTADO' THEN 1 END) as conectados,
                COUNT(CASE WHEN u.estado = 'DESCONECTADO' THEN 1 END) as desconectados
            FROM empleado e
            INNER JOIN usuarios u ON e.id_usuario = u.id_usuario
        `);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error obteniendo estadísticas:', err);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};
