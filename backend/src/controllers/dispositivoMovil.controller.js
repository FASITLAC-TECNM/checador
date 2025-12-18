import { pool } from '../config/db.js';

// Obtener todos los dispositivos móviles
export const getDispositivosMoviles = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT dm.*, u.nombre as usuario_nombre
            FROM dispositivo_movil dm
            LEFT JOIN empleado e ON dm.id_empleado = e.id
            LEFT JOIN usuario u ON e.id_usuario = u.id
            ORDER BY dm.id DESC
        `);

        const dispositivos = result.rows.map(row => ({
            ...row,
            fecha_registro: row.fecha,
            estado: row.estado === true ? 'Activo' : 'Inactivo',
            usuario: row.usuario_nombre ? {
                nombre: row.usuario_nombre
            } : null
        }));

        res.json(dispositivos);
    } catch (error) {
        console.error('Error al obtener dispositivos móviles:', error);
        res.status(500).json({ error: 'Error al obtener dispositivos móviles' });
    }
};

// Obtener dispositivo móvil por ID
export const getDispositivoMovilById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                dm.*,
                e.id as empleado_id,
                e.nss as empleado_nss,
                e.rfc as empleado_rfc,
                u.id as usuario_id,
                u.nombre as usuario_nombre,
                u.email as usuario_email
            FROM dispositivo_movil dm
            LEFT JOIN Empleado e ON dm.id_empleado = e.id
            LEFT JOIN Usuario u ON e.id_usuario = u.id
            WHERE dm.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispositivo móvil no encontrado' });
        }

        const row = result.rows[0];
        const dispositivo = {
            id: row.id,
            id_empleado: row.id_empleado,
            id_usuario: row.id_usuario,
            tipo: row.tipo,
            sistema_operativo: row.sistema_operativo,
            fecha: row.fecha,
            fecha_registro: row.fecha,
            estado: row.estado === true ? 'Activo' : 'Inactivo',
            root: row.root,
            usuario: row.usuario_id ? {
                id: row.usuario_id,
                nombre: row.usuario_nombre,
                email: row.usuario_email
            } : null,
            empleado: row.empleado_id ? {
                id: row.empleado_id,
                nss: row.empleado_nss,
                rfc: row.empleado_rfc
            } : null
        };

        res.json(dispositivo);
    } catch (error) {
        console.error('Error al obtener dispositivo móvil:', error);
        res.status(500).json({ error: 'Error al obtener dispositivo móvil' });
    }
};

// Obtener dispositivos móviles por usuario
export const getDispositivosMovilesPorUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const result = await pool.query(`
            SELECT
                dm.*,
                e.id as empleado_id,
                u.id as usuario_id,
                u.nombre as usuario_nombre,
                u.email as usuario_email
            FROM dispositivo_movil dm
            LEFT JOIN Empleado e ON dm.id_empleado = e.id
            LEFT JOIN Usuario u ON e.id_usuario = u.id
            WHERE e.id_usuario = $1
            ORDER BY dm.fecha DESC
        `, [id_usuario]);

        const dispositivos = result.rows.map(row => ({
            id: row.id,
            id_empleado: row.id_empleado,
            id_usuario: row.id_usuario,
            tipo: row.tipo,
            sistema_operativo: row.sistema_operativo,
            fecha: row.fecha,
            fecha_registro: row.fecha,
            estado: row.estado === true ? 'Activo' : 'Inactivo',
            root: row.root,
            usuario: row.usuario_id ? {
                id: row.usuario_id,
                nombre: row.usuario_nombre,
                email: row.usuario_email
            } : null
        }));

        res.json(dispositivos);
    } catch (error) {
        console.error('Error al obtener dispositivos del usuario:', error);
        res.status(500).json({ error: 'Error al obtener dispositivos del usuario' });
    }
};

// Obtener dispositivos móviles por empleado
export const getDispositivosMovilesPorEmpleado = async (req, res) => {
    try {
        const { id_empleado } = req.params;
        const result = await pool.query(`
            SELECT dm.*, u.nombre as usuario_nombre
            FROM dispositivo_movil dm
            LEFT JOIN empleado e ON dm.id_empleado = e.id
            LEFT JOIN usuario u ON e.id_usuario = u.id
            WHERE dm.id_empleado = $1
            ORDER BY dm.fecha DESC
        `, [id_empleado]);

        const dispositivos = result.rows.map(row => ({
            ...row,
            fecha_registro: row.fecha,
            estado: row.estado === true ? 'Activo' : 'Inactivo',
            usuario: row.usuario_nombre ? {
                nombre: row.usuario_nombre
            } : null
        }));

        res.json(dispositivos);
    } catch (error) {
        console.error('Error al obtener dispositivos del empleado:', error);
        res.status(500).json({ error: 'Error al obtener dispositivos del empleado' });
    }
};

// Crear dispositivo móvil
export const createDispositivoMovil = async (req, res) => {
    try {
        const { id_empleado, id_usuario, tipo, sistema_operativo, estado, root } = req.body;

        const result = await pool.query(`
            INSERT INTO dispositivo_movil
            (id_empleado, id_usuario, tipo, sistema_operativo, fecha, estado, root)
            VALUES ($1, $2, $3, $4, NOW(), $5, $6)
            RETURNING *
        `, [id_empleado, id_usuario, tipo, sistema_operativo, estado || true, root || false]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear dispositivo móvil:', error);
        res.status(500).json({ error: 'Error al crear dispositivo móvil' });
    }
};

// Actualizar dispositivo móvil
export const updateDispositivoMovil = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, sistema_operativo, estado, root } = req.body;

        const result = await pool.query(`
            UPDATE dispositivo_movil
            SET tipo = COALESCE($1, tipo),
                sistema_operativo = COALESCE($2, sistema_operativo),
                estado = COALESCE($3, estado),
                root = COALESCE($4, root)
            WHERE id = $5
            RETURNING *
        `, [tipo, sistema_operativo, estado, root, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispositivo móvil no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar dispositivo móvil:', error);
        res.status(500).json({ error: 'Error al actualizar dispositivo móvil' });
    }
};

// Eliminar dispositivo móvil
export const deleteDispositivoMovil = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            DELETE FROM dispositivo_movil
            WHERE id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispositivo móvil no encontrado' });
        }

        res.json({ message: 'Dispositivo móvil eliminado correctamente', dispositivo: result.rows[0] });
    } catch (error) {
        console.error('Error al eliminar dispositivo móvil:', error);
        res.status(500).json({ error: 'Error al eliminar dispositivo móvil' });
    }
};
