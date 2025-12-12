import { pool } from '../config/db.js';

// ==================== CRUD DE HORARIOS ====================

export const getHorarios = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                h.id,
                h.date_ini,
                h.date_fin,
                h.estado,
                h.config_horario,
                h.config_excep,
                COUNT(e.id) as empleados_asignados
            FROM horario h
            LEFT JOIN empleado e ON e.horario_id = h.id
            GROUP BY h.id
            ORDER BY h.id DESC
        `);

        res.json(result.rows);
    } catch (err) {
        console.error('Error obteniendo horarios:', err);
        res.status(500).json({ error: 'Error al obtener horarios' });
    }
};

export const getHorarioById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                h.id,
                h.date_ini,
                h.date_fin,
                h.estado,
                h.config_horario,
                h.config_excep,
                COUNT(e.id) as empleados_asignados
            FROM horario h
            LEFT JOIN empleado e ON e.horario_id = h.id
            WHERE h.id = $1
            GROUP BY h.id
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Horario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error obteniendo horario:', err);
        res.status(500).json({ error: 'Error al obtener horario' });
    }
};

export const createHorario = async (req, res) => {
    try {
        const { date_ini, date_fin, estado, config_horario, config_excep } = req.body;

        // Validaciones
        if (!config_excep) {
            return res.status(400).json({ error: 'La configuración del horario es requerida' });
        }

        const result = await pool.query(`
            INSERT INTO horario (date_ini, date_fin, estado, config_horario, config_excep)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            date_ini || null,
            date_fin || null,
            estado || 'Activo',
            config_horario || 'Semanal',
            JSON.stringify(config_excep)
        ]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creando horario:', err);
        res.status(500).json({ error: 'Error al crear horario' });
    }
};

export const updateHorario = async (req, res) => {
    try {
        const { id } = req.params;
        const { date_ini, date_fin, estado, config_horario, config_excep } = req.body;

        const result = await pool.query(`
            UPDATE horario
            SET
                date_ini = COALESCE($1, date_ini),
                date_fin = COALESCE($2, date_fin),
                estado = COALESCE($3, estado),
                config_horario = COALESCE($4, config_horario),
                config_excep = COALESCE($5, config_excep)
            WHERE id = $6
            RETURNING *
        `, [
            date_ini,
            date_fin,
            estado,
            config_horario,
            config_excep ? JSON.stringify(config_excep) : null,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Horario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error actualizando horario:', err);
        res.status(500).json({ error: 'Error al actualizar horario' });
    }
};

export const deleteHorario = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si hay empleados asignados
        const checkEmpleados = await pool.query(
            'SELECT COUNT(*) FROM empleado WHERE horario_id = $1',
            [id]
        );

        if (parseInt(checkEmpleados.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar el horario porque hay empleados asignados'
            });
        }

        const result = await pool.query(
            'DELETE FROM horario WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Horario no encontrado' });
        }

        res.json({ message: 'Horario eliminado correctamente' });
    } catch (err) {
        console.error('Error eliminando horario:', err);
        res.status(500).json({ error: 'Error al eliminar horario' });
    }
};

// Obtener empleados con un horario específico
export const getEmpleadosPorHorario = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                e.id,
                e.id_usuario,
                e.nss,
                e.rfc,
                u.nombre,
                u.correo as email,
                u.foto
            FROM empleado e
            INNER JOIN usuario u ON e.id_usuario = u.id
            WHERE e.horario_id = $1
            ORDER BY u.nombre
        `, [id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error obteniendo empleados por horario:', err);
        res.status(500).json({ error: 'Error al obtener empleados' });
    }
};

// Asignar horario a un empleado
export const asignarHorarioAEmpleado = async (req, res) => {
    try {
        const { idEmpleado, idHorario } = req.params;

        // Verificar que el horario existe
        const horario = await pool.query('SELECT id FROM horario WHERE id = $1', [idHorario]);
        if (horario.rows.length === 0) {
            return res.status(404).json({ error: 'Horario no encontrado' });
        }

        // Actualizar el empleado
        const result = await pool.query(`
            UPDATE empleado
            SET horario_id = $1, fecha_modificacion = CURRENT_DATE
            WHERE id = $2
            RETURNING *
        `, [idHorario, idEmpleado]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error asignando horario:', err);
        res.status(500).json({ error: 'Error al asignar horario' });
    }
};
