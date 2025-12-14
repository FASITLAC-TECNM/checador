import { pool } from '../config/db.js';

// Obtener todos los dispositivos
export const getDevices = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM devices ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener dispositivos:', error);
        res.status(500).json({ error: 'Error al obtener dispositivos' });
    }
};

// Obtener un dispositivo por ID
export const getDeviceById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM devices WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener dispositivo:', error);
        res.status(500).json({ error: 'Error al obtener dispositivo' });
    }
};

// Crear un nuevo dispositivo
export const createDevice = async (req, res) => {
    try {
        const {
            device_id,
            nombre,
            ubicacion,
            tipo,
            estado,
            ip_address,
            version_firmware,
            configuracion
        } = req.body;

        const result = await pool.query(
            `INSERT INTO devices
            (device_id, nombre, ubicacion, tipo, estado, ip_address, version_firmware, configuracion, ultimo_ping)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING *`,
            [device_id, nombre, ubicacion, tipo, estado || 'Activo', ip_address, version_firmware, configuracion]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear dispositivo:', error);
        if (error.code === '23505') { // Violación de unique constraint
            return res.status(400).json({ error: 'El device_id ya existe' });
        }
        res.status(500).json({ error: 'Error al crear dispositivo' });
    }
};

// Actualizar un dispositivo
export const updateDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            device_id,
            nombre,
            ubicacion,
            tipo,
            estado,
            ip_address,
            version_firmware,
            configuracion
        } = req.body;

        const result = await pool.query(
            `UPDATE devices
            SET device_id = $1, nombre = $2, ubicacion = $3, tipo = $4, estado = $5,
                ip_address = $6, version_firmware = $7, configuracion = $8, updated_at = NOW()
            WHERE id = $9
            RETURNING *`,
            [device_id, nombre, ubicacion, tipo, estado, ip_address, version_firmware, configuracion, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar dispositivo:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'El device_id ya existe' });
        }
        res.status(500).json({ error: 'Error al actualizar dispositivo' });
    }
};

// Eliminar un dispositivo
export const deleteDevice = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM devices WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        res.json({ message: 'Dispositivo eliminado correctamente', device: result.rows[0] });
    } catch (error) {
        console.error('Error al eliminar dispositivo:', error);
        res.status(500).json({ error: 'Error al eliminar dispositivo' });
    }
};

// Actualizar estado de dispositivo
export const updateDeviceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const result = await pool.query(
            'UPDATE devices SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [estado, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
};

// Registrar ping de dispositivo
export const pingDevice = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'UPDATE devices SET ultimo_ping = NOW() WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        res.json({ message: 'Ping registrado', device: result.rows[0] });
    } catch (error) {
        console.error('Error al registrar ping:', error);
        res.status(500).json({ error: 'Error al registrar ping' });
    }
};

// Obtener estadísticas de dispositivos
export const getDeviceStats = async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE estado = 'Activo') as activos,
                COUNT(*) FILTER (WHERE estado = 'Inactivo') as inactivos,
                COUNT(*) FILTER (WHERE tipo = 'Registro Físico') as fisicos,
                COUNT(*) FILTER (WHERE tipo = 'Móvil') as moviles,
                COUNT(*) FILTER (WHERE tipo = 'Biométrico') as biometricos
            FROM devices
        `);

        res.json(stats.rows[0]);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};
