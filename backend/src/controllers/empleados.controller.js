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
                e.fecha_registro,
                e.fecha_modificacion,
                e.estado,
                e.horario_id,
                e.horario_id,
                u.username,
                u.correo as email,
                u.nombre,
                u.telefono,
                u.foto,
                u.activo,
                u.conexion
            FROM Empleado e
            INNER JOIN Usuario u ON e.id_usuario = u.id
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
                e.fecha_registro,
                e.fecha_modificacion,
                e.estado,
                e.horario_id,
                u.username,
                u.correo as email,
                u.nombre,
                u.telefono,
                u.foto,
                u.activo,
                u.conexion
            FROM Empleado e
            INNER JOIN Usuario u ON e.id_usuario = u.id
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
                e.fecha_registro,
                e.fecha_modificacion,
                e.estado,
                e.horario_id,
                u.username,
                u.correo as email,
                u.nombre,
                u.telefono,
                u.foto,
                u.activo,
                u.conexion
            FROM Empleado e
            INNER JOIN Usuario u ON e.id_usuario = u.id
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
            horario_id = null,
            fecha_registro = new Date().toISOString().split('T')[0],
            estado = true
        } = req.body;

        if (!id_usuario || !nss || !rfc) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                required: ['id_usuario', 'nss', 'rfc']
            });
        }

        // Verificar que el usuario existe
        const usuarioCheck = await pool.query(
            'SELECT id FROM Usuario WHERE id = $1',
            [id_usuario]
        );

        if (usuarioCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'El usuario especificado no existe'
            });
        }

        // Verificar que el usuario no sea ya un empleado
        const empleadoCheck = await pool.query(
            'SELECT id FROM Empleado WHERE id_usuario = $1',
            [id_usuario]
        );

        if (empleadoCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Este usuario ya está registrado como empleado'
            });
        }

        const result = await pool.query(`
            INSERT INTO Empleado (id_usuario, rfc, nss, fecha_registro, estado, horario_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                id,
                id_usuario,
                nss,
                rfc,
                fecha_registro,
                fecha_modificacion,
                estado,
                horario_id
        `, [id_usuario, rfc, nss, fecha_registro, estado, horario_id]);

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
            estado,
            horario_id
        } = req.body;

        if (!nss || !rfc) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                required: ['nss', 'rfc']
            });
        }

        const result = await pool.query(`
            UPDATE Empleado
            SET nss = $1,
                rfc = $2,
                estado = COALESCE($3, estado),
                horario_id = COALESCE($4, horario_id),
                fecha_modificacion = CURRENT_DATE
            WHERE id = $5
            RETURNING
                id,
                id_usuario,
                nss,
                rfc,
                fecha_registro,
                fecha_modificacion,
                estado,
                horario_id
        `, [nss, rfc, estado, horario_id, id]);

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
            'DELETE FROM Empleado WHERE id = $1 RETURNING *',
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
                e.fecha_registro,
                e.fecha_modificacion,
                e.estado,
                e.horario_id,
                u.username,
                u.correo as email,
                u.nombre,
                u.telefono,
                u.foto,
                u.activo,
                u.conexion
            FROM Empleado e
            INNER JOIN Usuario u ON e.id_usuario = u.id
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
                e.fecha_registro,
                e.fecha_modificacion,
                e.estado,
                e.horario_id,
                u.username,
                u.correo as email,
                u.nombre,
                u.telefono,
                u.foto,
                u.activo,
                u.conexion
            FROM Empleado e
            INNER JOIN Usuario u ON e.id_usuario = u.id
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

export const getStats = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) as total_empleados,
                COUNT(CASE WHEN e.estado = true THEN 1 END) as activos,
                COUNT(CASE WHEN e.estado = false THEN 1 END) as inactivos,
                COUNT(CASE WHEN u.conexion = 'Conectado' THEN 1 END) as conectados,
                COUNT(CASE WHEN u.conexion = 'Desconectado' THEN 1 END) as desconectados
            FROM Empleado e
            INNER JOIN Usuario u ON e.id_usuario = u.id
        `);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error obteniendo estadísticas:', err);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

// Obtener empleado con su rol y permisos
export const getEmpleadoConPermisos = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener empleado
        const empleadoResult = await pool.query(`
            SELECT
                e.id,
                e.id_usuario,
                e.nss,
                e.rfc,
                e.fecha_registro,
                e.fecha_modificacion,
                e.estado,
                e.horario_id,
                u.username,
                u.correo as email,
                u.nombre,
                u.telefono,
                u.foto,
                u.activo,
                u.conexion
            FROM Empleado e
            INNER JOIN Usuario u ON e.id_usuario = u.id
            WHERE e.id = $1
        `, [id]);

        if (empleadoResult.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado' });

        const empleado = empleadoResult.rows[0];

        // Obtener rol
        const rolResult = await pool.query(`
            SELECT
                r.id as id_rol,
                r.nombre as nombre_rol,
                r.descripcion as descripcion_rol,
                ur.estado as rol_activo
            FROM Usuario_rol ur
            INNER JOIN Rol r ON ur.id_rol = r.id
            WHERE ur.id_usuario = $1 AND ur.estado = true
            ORDER BY ur.fecha_asignacion DESC
            LIMIT 1
        `, [empleado.id_usuario]);

        const rol = rolResult.rows.length > 0 ? rolResult.rows[0] : null;

        // Obtener permisos
        let permisos = [];
        if (rol) {
            const permisosResult = await pool.query(`
                SELECT
                    m.id as id_modulo,
                    m.nombre as nombre_modulo,
                    m.descripcion as descripcion_modulo,
                    rhm.ver,
                    rhm.crear,
                    rhm.editar,
                    rhm.eliminar
                FROM rolmodulo rhm
                INNER JOIN Modulo m ON rhm.id_modulo = m.id
                WHERE rhm.id_rol = $1 AND m.estado = true
            `, [rol.id_rol]);

            permisos = permisosResult.rows;
        }

        res.json({
            empleado,
            rol,
            permisos
        });
    } catch (err) {
        console.error('Error obteniendo empleado con permisos:', err);
        res.status(500).json({ error: 'Error al obtener empleado con permisos' });
    }
};
