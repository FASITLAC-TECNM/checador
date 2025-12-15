import { pool } from '../config/db.js';
import crypto from 'crypto';

// Obtener todas las solicitudes móviles
export const getSolicitudesMoviles = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                sm.*,
                u.nombre as nombre_aprobador
            FROM SolicitudMovil sm
            LEFT JOIN Usuario u ON sm.id_usuario_aprobador = u.id
            ORDER BY
                CASE WHEN sm.estado = 'Pendiente' THEN 0 ELSE 1 END,
                sm.fecha_solicitud DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener solicitudes móviles:', error);
        res.status(500).json({ error: 'Error al obtener solicitudes móviles' });
    }
};

// Obtener solicitudes móviles pendientes
export const getSolicitudesMovilesPendientes = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM SolicitudMovil
            WHERE estado = 'Pendiente'
            ORDER BY fecha_solicitud DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener solicitudes móviles pendientes:', error);
        res.status(500).json({ error: 'Error al obtener solicitudes móviles pendientes' });
    }
};

// Obtener una solicitud móvil por ID
export const getSolicitudMovilById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                sm.*,
                u.nombre as nombre_aprobador
            FROM SolicitudMovil sm
            LEFT JOIN Usuario u ON sm.id_usuario_aprobador = u.id
            WHERE sm.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Solicitud móvil no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener solicitud móvil:', error);
        res.status(500).json({ error: 'Error al obtener solicitud móvil' });
    }
};

// Obtener solicitud móvil por token
export const getSolicitudMovilByToken = async (req, res) => {
    try {
        const { token } = req.params;
        const result = await pool.query(`
            SELECT
                sm.*,
                u.nombre as nombre_aprobador
            FROM SolicitudMovil sm
            LEFT JOIN Usuario u ON sm.id_usuario_aprobador = u.id
            WHERE sm.token_solicitud = $1
        `, [token]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Solicitud móvil no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener solicitud móvil por token:', error);
        res.status(500).json({ error: 'Error al obtener solicitud móvil' });
    }
};

// Crear una nueva solicitud móvil
export const createSolicitudMovil = async (req, res) => {
    try {
        const {
            nombre,
            correo,
            descripcion,
            ip,
            mac,
            sistema_operativo,
            observaciones
        } = req.body;

        // Validaciones básicas
        if (!nombre || !correo) {
            return res.status(400).json({
                error: 'Nombre y correo son requeridos'
            });
        }

        // Validar formato de correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
            return res.status(400).json({
                error: 'Formato de correo inválido'
            });
        }

        // Generar token único
        const token_solicitud = crypto.randomBytes(32).toString('hex');

        const result = await pool.query(`
            INSERT INTO SolicitudMovil
            (nombre, correo, descripcion, ip, mac, sistema_operativo, observaciones, token_solicitud, estado, fecha_solicitud)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pendiente', CURRENT_TIMESTAMP)
            RETURNING *
        `, [nombre, correo, descripcion, ip, mac, sistema_operativo, observaciones, token_solicitud]);

        console.log('✅ Solicitud móvil creada:', {
            id: result.rows[0].id,
            nombre: result.rows[0].nombre,
            correo: result.rows[0].correo,
            token: result.rows[0].token_solicitud
        });

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear solicitud móvil:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Ya existe una solicitud con estos datos' });
        }
        res.status(500).json({ error: 'Error al crear solicitud móvil' });
    }
};

// Aceptar solicitud móvil
export const aceptarSolicitudMovil = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { id_usuario_aprobador } = req.body;

        await client.query('BEGIN');

        // Obtener la solicitud
        const solicitudResult = await client.query(
            'SELECT * FROM SolicitudMovil WHERE id = $1',
            [id]
        );

        if (solicitudResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Solicitud móvil no encontrada' });
        }

        const solicitud = solicitudResult.rows[0];

        if (solicitud.estado !== 'Pendiente') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'La solicitud ya fue procesada' });
        }

        // Actualizar la solicitud a Aceptado
        const updateResult = await client.query(`
            UPDATE SolicitudMovil
            SET estado = 'Aceptado',
                fecha_respuesta = CURRENT_TIMESTAMP,
                id_usuario_aprobador = $1
            WHERE id = $2
            RETURNING *
        `, [id_usuario_aprobador, id]);

        await client.query('COMMIT');

        console.log('✅ Solicitud móvil aceptada:', {
            id: updateResult.rows[0].id,
            nombre: updateResult.rows[0].nombre,
            aprobador: id_usuario_aprobador
        });

        res.json({
            solicitud: updateResult.rows[0],
            message: 'Solicitud móvil aceptada correctamente'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al aceptar solicitud móvil:', error);
        res.status(500).json({ error: 'Error al aceptar solicitud móvil: ' + error.message });
    } finally {
        client.release();
    }
};

// Rechazar solicitud móvil
export const rechazarSolicitudMovil = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_usuario_aprobador, motivo_rechazo } = req.body;

        // Validar motivo de rechazo
        if (!motivo_rechazo || motivo_rechazo.trim() === '') {
            return res.status(400).json({ error: 'El motivo de rechazo es requerido' });
        }

        // Verificar que la solicitud existe y está pendiente
        const checkResult = await pool.query(
            'SELECT * FROM SolicitudMovil WHERE id = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Solicitud móvil no encontrada' });
        }

        if (checkResult.rows[0].estado !== 'Pendiente') {
            return res.status(400).json({ error: 'La solicitud ya fue procesada' });
        }

        const result = await pool.query(`
            UPDATE SolicitudMovil
            SET estado = 'Rechazado',
                fecha_respuesta = CURRENT_TIMESTAMP,
                id_usuario_aprobador = $1,
                motivo_rechazo = $2
            WHERE id = $3
            RETURNING *
        `, [id_usuario_aprobador, motivo_rechazo, id]);

        console.log('❌ Solicitud móvil rechazada:', {
            id: result.rows[0].id,
            nombre: result.rows[0].nombre,
            motivo: motivo_rechazo
        });

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al rechazar solicitud móvil:', error);
        res.status(500).json({ error: 'Error al rechazar solicitud móvil: ' + error.message });
    }
};

// Eliminar solicitud móvil (solo si está rechazada o para limpieza)
export const deleteSolicitudMovil = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM SolicitudMovil WHERE id = $1 AND estado != $2 RETURNING *',
            [id, 'Aceptado']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Solicitud móvil no encontrada o no se puede eliminar (está aceptada)'
            });
        }

        res.json({ message: 'Solicitud móvil eliminada correctamente', solicitud: result.rows[0] });
    } catch (error) {
        console.error('Error al eliminar solicitud móvil:', error);
        res.status(500).json({ error: 'Error al eliminar solicitud móvil' });
    }
};

// Obtener estadísticas de solicitudes móviles
export const getEstadisticasMoviles = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE estado = 'Pendiente') as pendientes,
                COUNT(*) FILTER (WHERE estado = 'Aceptado') as aceptadas,
                COUNT(*) FILTER (WHERE estado = 'Rechazado') as rechazadas
            FROM SolicitudMovil
        `);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener estadísticas móviles:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};