import { pool } from '../config/db.js';

// Obtener departamentos de un empleado
export const getDepartamentosEmpleado = async (req, res) => {
    try {
        const { id_empleado } = req.params;

        const result = await pool.query(`
            SELECT
                ed.id,
                ed.id_empleado,
                ed.id_departamento,
                ed.fecha_asignacion,
                ed.estado,
                d.nombre as departamento_nombre,
                d.descripcion as departamento_descripcion
            FROM empleado_departamento ed
            INNER JOIN departamento d ON ed.id_departamento = d.id_departamento
            WHERE ed.id_empleado = $1
            ORDER BY ed.fecha_asignacion DESC
        `, [id_empleado]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener departamentos del empleado:', error);
        res.status(500).json({ error: 'Error al obtener departamentos del empleado' });
    }
};

// Asignar departamento a empleado
export const asignarDepartamento = async (req, res) => {
    try {
        const { id_empleado, id_departamento } = req.body;

        // Verificar si ya existe la asignación
        const existeAsignacion = await pool.query(
            'SELECT * FROM empleado_departamento WHERE id_empleado = $1 AND id_departamento = $2',
            [id_empleado, id_departamento]
        );

        if (existeAsignacion.rows.length > 0) {
            return res.status(400).json({ error: 'El empleado ya está asignado a este departamento' });
        }

        const result = await pool.query(`
            INSERT INTO empleado_departamento (id_empleado, id_departamento, fecha_asignacion, estado)
            VALUES ($1, $2, NOW(), true)
            RETURNING *
        `, [id_empleado, id_departamento]);

        // Obtener información completa del departamento
        const departamentoInfo = await pool.query(`
            SELECT
                ed.id,
                ed.id_empleado,
                ed.id_departamento,
                ed.fecha_asignacion,
                ed.estado,
                d.nombre as departamento_nombre,
                d.descripcion as departamento_descripcion
            FROM empleado_departamento ed
            INNER JOIN departamento d ON ed.id_departamento = d.id_departamento
            WHERE ed.id = $1
        `, [result.rows[0].id]);

        res.status(201).json(departamentoInfo.rows[0]);
    } catch (error) {
        console.error('Error al asignar departamento:', error);
        res.status(500).json({ error: 'Error al asignar departamento' });
    }
};

// Eliminar asignación de departamento
export const eliminarAsignacionDepartamento = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM empleado_departamento WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Asignación no encontrada' });
        }

        res.json({ message: 'Asignación eliminada correctamente', asignacion: result.rows[0] });
    } catch (error) {
        console.error('Error al eliminar asignación:', error);
        res.status(500).json({ error: 'Error al eliminar asignación' });
    }
};
