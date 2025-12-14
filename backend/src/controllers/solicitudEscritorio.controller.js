import { pool } from '../config/db.js';
import crypto from 'crypto';

// Obtener todas las solicitudes
export const getSolicitudes = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                se.*,
                u.nombre as nombre_aprobador
            FROM SolicitudEscritorio se
            LEFT JOIN Usuario u ON se.id_usuario_aprobador = u.id
            ORDER BY
                CASE WHEN se.estado = 'Pendiente' THEN 0 ELSE 1 END,
                se.fecha_solicitud DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
};

// Obtener solicitudes pendientes
export const getSolicitudesPendientes = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM SolicitudEscritorio
            WHERE estado = 'Pendiente'
            ORDER BY fecha_solicitud DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener solicitudes pendientes:', error);
        res.status(500).json({ error: 'Error al obtener solicitudes pendientes' });
    }
};

// Obtener una solicitud por ID
export const getSolicitudById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                se.*,
                u.nombre as nombre_aprobador
            FROM SolicitudEscritorio se
            LEFT JOIN Usuario u ON se.id_usuario_aprobador = u.id
            WHERE se.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener solicitud:', error);
        res.status(500).json({ error: 'Error al obtener solicitud' });
    }
};

// Crear una nueva solicitud
export const createSolicitud = async (req, res) => {
    try {
        const {
            nombre,
            descripcion,
            ip,
            mac,
            sistema_operativo,
            observaciones
        } = req.body;

        // Generar token único
        const token_solicitud = crypto.randomBytes(32).toString('hex');

        const result = await pool.query(`
            INSERT INTO SolicitudEscritorio
            (nombre, descripcion, ip, mac, sistema_operativo, observaciones, token_solicitud, estado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pendiente')
            RETURNING *
        `, [nombre, descripcion, ip, mac, sistema_operativo, observaciones, token_solicitud]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Ya existe una solicitud con estos datos' });
        }
        res.status(500).json({ error: 'Error al crear solicitud' });
    }
};

// Aceptar solicitud y crear dispositivo
export const aceptarSolicitud = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { id_usuario_aprobador } = req.body;

        await client.query('BEGIN');

        // Obtener la solicitud
        const solicitudResult = await client.query(
            'SELECT * FROM SolicitudEscritorio WHERE id = $1',
            [id]
        );

        if (solicitudResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        const solicitud = solicitudResult.rows[0];

        if (solicitud.estado !== 'Pendiente') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'La solicitud ya fue procesada' });
        }

        // Crear el escritorio en la tabla Escritorio
        const escritorioResult = await client.query(`
            INSERT INTO Escritorio
            (nombre, descripcion, ip, mac, sistema_operativo, estado, ubicacion, ultima_sync, dispositivos_biometricos, id_configuracion)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
            RETURNING *
        `, [
            solicitud.nombre,
            solicitud.descripcion || 'Sin descripción',
            solicitud.ip,
            solicitud.mac,
            solicitud.sistema_operativo,
            'activo',
            solicitud.descripcion || 'Sin ubicación especificada',
            JSON.stringify({
                token: solicitud.token_solicitud,
                origen: 'solicitud_escritorio'
            }),
            null // id_configuracion
        ]);

        const escritorio = escritorioResult.rows[0];

        // Actualizar la solicitud
        const updateResult = await client.query(`
            UPDATE SolicitudEscritorio
            SET estado = 'Aceptado',
                fecha_respuesta = NOW(),
                id_usuario_aprobador = $1,
                id_escritorio = $2
            WHERE id = $3
            RETURNING *
        `, [id_usuario_aprobador, escritorio.id, id]);

        await client.query('COMMIT');

        res.json({
            solicitud: updateResult.rows[0],
            escritorio: escritorio
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al aceptar solicitud:', error);
        res.status(500).json({ error: 'Error al aceptar solicitud: ' + error.message });
    } finally {
        client.release();
    }
};

// Rechazar solicitud
export const rechazarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_usuario_aprobador, motivo_rechazo } = req.body;

        // Verificar que la solicitud existe y está pendiente
        const checkResult = await pool.query(
            'SELECT * FROM SolicitudEscritorio WHERE id = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        if (checkResult.rows[0].estado !== 'Pendiente') {
            return res.status(400).json({ error: 'La solicitud ya fue procesada' });
        }

        const result = await pool.query(`
            UPDATE SolicitudEscritorio
            SET estado = 'Rechazado',
                fecha_respuesta = NOW(),
                id_usuario_aprobador = $1,
                motivo_rechazo = $2
            WHERE id = $3
            RETURNING *
        `, [id_usuario_aprobador, motivo_rechazo, id]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        res.status(500).json({ error: 'Error al rechazar solicitud: ' + error.message });
    }
};

// Eliminar solicitud (solo si está rechazada o para limpieza)
export const deleteSolicitud = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM SolicitudEscritorio WHERE id = $1 AND estado != $2 RETURNING *',
            [id, 'Aceptado']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Solicitud no encontrada o no se puede eliminar (está aceptada)'
            });
        }

        res.json({ message: 'Solicitud eliminada correctamente', solicitud: result.rows[0] });
    } catch (error) {
        console.error('Error al eliminar solicitud:', error);
        res.status(500).json({ error: 'Error al eliminar solicitud' });
    }
};

// Obtener estadísticas de solicitudes
export const getEstadisticas = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE estado = 'Pendiente') as pendientes,
                COUNT(*) FILTER (WHERE estado = 'Aceptado') as aceptadas,
                COUNT(*) FILTER (WHERE estado = 'Rechazado') as rechazadas
            FROM SolicitudEscritorio
        `);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};
