import { pool } from '../config/db.js';

/**
 * Obtener todos los eventos con filtros opcionales
 */
export const getEventos = async (req, res) => {
    try {
        const { tipo_evento, estado, fecha_inicio, fecha_fin, limit = 100, orden = 'desc' } = req.query;

        let query = 'SELECT * FROM evento WHERE 1=1';
        const params = [];
        let paramCount = 1;

        // Aplicar filtros
        if (tipo_evento) {
            query += ` AND tipo_evento = $${paramCount}`;
            params.push(tipo_evento);
            paramCount++;
        }

        if (estado) {
            query += ` AND estado = $${paramCount}`;
            params.push(estado);
            paramCount++;
        }

        if (fecha_inicio) {
            query += ` AND created_at >= $${paramCount}`;
            params.push(fecha_inicio);
            paramCount++;
        }

        if (fecha_fin) {
            query += ` AND created_at <= $${paramCount}`;
            params.push(fecha_fin);
            paramCount++;
        }

        // Ordenar por fecha
        query += ` ORDER BY created_at ${orden === 'asc' ? 'ASC' : 'DESC'}`;

        // Limitar resultados
        query += ` LIMIT $${paramCount}`;
        params.push(limit);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener eventos:', error);
        res.status(500).json({ error: 'Error al obtener eventos', detalles: error.message });
    }
};

/**
 * Obtener un evento por ID
 */
export const getEventoById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM evento WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener evento:', error);
        res.status(500).json({ error: 'Error al obtener evento', detalles: error.message });
    }
};

/**
 * Obtener estadísticas de eventos
 */
export const getEstadisticasEventos = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN tipo_evento = 'notificacion' THEN 1 END) as notificaciones,
                COUNT(CASE WHEN tipo_evento = 'anuncio' THEN 1 END) as anuncios,
                COUNT(CASE WHEN tipo_evento = 'alerta' THEN 1 END) as alertas,
                COUNT(CASE WHEN tipo_evento = 'recordatorio' THEN 1 END) as recordatorios,
                COUNT(CASE WHEN estado = 'Entrada' THEN 1 END) as entradas,
                COUNT(CASE WHEN estado = 'Salida' THEN 1 END) as salidas,
                COUNT(CASE WHEN estado = 'Ambos' THEN 1 END) as ambos
            FROM evento
        `);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas', detalles: error.message });
    }
};

/**
 * Buscar eventos por término
 */
export const buscarEventos = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
        }

        const result = await pool.query(
            `SELECT * FROM evento
             WHERE titulo ILIKE $1 OR descripcion ILIKE $1
             ORDER BY created_at DESC
             LIMIT 100`,
            [`%${q}%`]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error al buscar eventos:', error);
        res.status(500).json({ error: 'Error al buscar eventos', detalles: error.message });
    }
};

/**
 * Crear un nuevo evento (para triggers o procesos internos)
 */
export const createEvento = async (req, res) => {
    try {
        const { titulo, descripcion, estado, tipo_evento } = req.body;

        // Validar campos requeridos
        if (!titulo) {
            return res.status(400).json({ error: 'El título es requerido' });
        }

        const result = await pool.query(
            `INSERT INTO evento (titulo, descripcion, estado, tipo_evento)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [titulo, descripcion, estado || 'Ambos', tipo_evento || 'notificacion']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear evento:', error);
        res.status(500).json({ error: 'Error al crear evento', detalles: error.message });
    }
};

/**
 * Eliminar eventos antiguos (mantenimiento)
 */
export const limpiarEventosAntiguos = async (req, res) => {
    try {
        const { dias = 90 } = req.query;

        const result = await pool.query(
            `DELETE FROM evento
             WHERE created_at < NOW() - INTERVAL '${dias} days'
             RETURNING id`,
        );

        res.json({
            mensaje: 'Eventos antiguos eliminados',
            cantidad: result.rowCount
        });
    } catch (error) {
        console.error('Error al limpiar eventos:', error);
        res.status(500).json({ error: 'Error al limpiar eventos', detalles: error.message });
    }
};

export default {
    getEventos,
    getEventoById,
    getEstadisticasEventos,
    buscarEventos,
    createEvento,
    limpiarEventosAntiguos
};
