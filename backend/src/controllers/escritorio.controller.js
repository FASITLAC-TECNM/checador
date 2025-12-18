import { pool } from '../config/db.js';

// Obtener todos los escritorios y dispositivos móviles
export const getEscritorios = async (req, res) => {
    try {
        // Obtener escritorios
        const escritoriosResult = await pool.query('SELECT * FROM Escritorio ORDER BY id DESC');
        const escritorios = escritoriosResult.rows.map(e => ({
            ...e,
            tipo: 'Registro Físico',
            device_id: e.mac,
            ip_address: e.ip,
            configuracion: e.dispositivos_biometricos || {}
        }));

        // Obtener dispositivos móviles con información del usuario
        const mobilesResult = await pool.query(`
            SELECT
                dm.*,
                e.id as empleado_id,
                u.id as usuario_id,
                u.nombre as usuario_nombre,
                u.correo as usuario_email
            FROM dispositivo_movil dm
            LEFT JOIN empleado e ON dm.id_empleado = e.id
            LEFT JOIN usuario u ON e.id_usuario = u.id
            ORDER BY dm.id DESC
        `);

        const moviles = mobilesResult.rows.map(m => ({
            id: m.id,
            nombre: m.tipo || 'Dispositivo Móvil',
            tipo: 'Móvil',
            estado: m.estado === true ? 'Activo' : 'Inactivo',
            device_id: m.mac || m.id,
            ubicacion: m.usuario_nombre || 'Sin asignar',
            usuarioAsignado: m.usuario_nombre || 'Sin asignar',
            usuario: m.usuario_nombre ? {
                id: m.usuario_id,
                nombre: m.usuario_nombre,
                email: m.usuario_email
            } : null,
            sistema_operativo: m.sistema_operativo,
            fecha_registro: m.fecha_registro,
            ultima_sync: m.ultima_sincronizacion
        }));

        // Combinar ambos tipos de dispositivos
        const allDevices = [...escritorios, ...moviles];
        res.json(allDevices);
    } catch (error) {
        console.error('Error al obtener dispositivos:', error);
        res.status(500).json({ error: 'Error al obtener dispositivos' });
    }
};

// Obtener un escritorio por ID
export const getEscritorioById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM Escritorio WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Escritorio no encontrado' });
        }

        // Mapear campos para compatibilidad con frontend
        const escritorio = {
            ...result.rows[0],
            tipo: 'Registro Físico',
            device_id: result.rows[0].mac,
            ip_address: result.rows[0].ip,
            configuracion: result.rows[0].dispositivos_biometricos || {}
        };

        res.json(escritorio);
    } catch (error) {
        console.error('Error al obtener escritorio:', error);
        res.status(500).json({ error: 'Error al obtener escritorio' });
    }
};

// Crear un nuevo escritorio
export const createEscritorio = async (req, res) => {
    try {
        const {
            nombre,
            descripcion,
            ip,
            mac,
            device_id, // Puede venir como device_id del frontend
            ip_address, // Puede venir como ip_address del frontend
            sistema_operativo,
            estado,
            ubicacion,
            dispositivos_biometricos,
            configuracion,
            id_configuracion
        } = req.body;

        // Mapear campos del frontend al backend
        const macAddress = mac || device_id;
        const ipAddress = ip || ip_address;
        const deviceConfig = dispositivos_biometricos || configuracion || null;

        const result = await pool.query(
            `INSERT INTO Escritorio
            (nombre, descripcion, ip, mac, sistema_operativo, estado, ubicacion, ultima_sync, dispositivos_biometricos, id_configuracion)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
            RETURNING *`,
            [nombre, descripcion || ubicacion, ipAddress, macAddress, sistema_operativo, estado || 'activo', ubicacion, deviceConfig, id_configuracion || null]
        );

        // Mapear respuesta para compatibilidad con frontend
        const escritorio = {
            ...result.rows[0],
            tipo: 'Registro Físico',
            device_id: result.rows[0].mac,
            ip_address: result.rows[0].ip,
            configuracion: result.rows[0].dispositivos_biometricos || {}
        };

        res.status(201).json(escritorio);
    } catch (error) {
        console.error('Error al crear escritorio:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Ya existe un escritorio con esa MAC' });
        }
        res.status(500).json({ error: 'Error al crear escritorio' });
    }
};

// Actualizar un escritorio
export const updateEscritorio = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            descripcion,
            ip,
            mac,
            device_id,
            ip_address,
            sistema_operativo,
            estado,
            ubicacion,
            dispositivos_biometricos,
            configuracion,
            id_configuracion
        } = req.body;

        // Mapear campos del frontend al backend
        const macAddress = mac || device_id;
        const ipAddress = ip || ip_address;
        const deviceConfig = dispositivos_biometricos || configuracion || null;

        const result = await pool.query(
            `UPDATE Escritorio
            SET nombre = $1, descripcion = $2, ip = $3, mac = $4, sistema_operativo = $5,
                estado = $6, ubicacion = $7, dispositivos_biometricos = $8, id_configuracion = $9
            WHERE id = $10
            RETURNING *`,
            [nombre, descripcion || ubicacion, ipAddress, macAddress, sistema_operativo, estado, ubicacion, deviceConfig, id_configuracion || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Escritorio no encontrado' });
        }

        // Mapear respuesta para compatibilidad con frontend
        const escritorio = {
            ...result.rows[0],
            tipo: 'Registro Físico',
            device_id: result.rows[0].mac,
            ip_address: result.rows[0].ip,
            configuracion: result.rows[0].dispositivos_biometricos || {}
        };

        res.json(escritorio);
    } catch (error) {
        console.error('Error al actualizar escritorio:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Ya existe un escritorio con esa MAC' });
        }
        res.status(500).json({ error: 'Error al actualizar escritorio' });
    }
};

// Eliminar un escritorio
export const deleteEscritorio = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM Escritorio WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Escritorio no encontrado' });
        }

        res.json({ message: 'Escritorio eliminado correctamente', escritorio: result.rows[0] });
    } catch (error) {
        console.error('Error al eliminar escritorio:', error);
        res.status(500).json({ error: 'Error al eliminar escritorio' });
    }
};

// Actualizar estado de escritorio
export const updateEstadoEscritorio = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const result = await pool.query(
            'UPDATE Escritorio SET estado = $1 WHERE id = $2 RETURNING *',
            [estado, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Escritorio no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
};

// Registrar sincronización de escritorio
export const registrarSync = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'UPDATE Escritorio SET ultima_sync = NOW() WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Escritorio no encontrado' });
        }

        res.json({ message: 'Sincronización registrada', escritorio: result.rows[0] });
    } catch (error) {
        console.error('Error al registrar sincronización:', error);
        res.status(500).json({ error: 'Error al registrar sincronización' });
    }
};

// Obtener estadísticas de escritorios y dispositivos móviles
export const getEstadisticas = async (req, res) => {
    try {
        // Estadísticas de escritorios
        const escritoriosResult = await pool.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE estado::text = 'activo') as activos,
                COUNT(*) FILTER (WHERE estado::text = 'inactivo') as inactivos
            FROM Escritorio
        `);

        // Estadísticas de dispositivos móviles
        const mobilesResult = await pool.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE estado = true) as activos
            FROM dispositivo_movil
        `);

        const escritoriosStats = escritoriosResult.rows[0];
        const mobilesStats = mobilesResult.rows[0];

        // Combinar estadísticas
        const stats = {
            total: (parseInt(escritoriosStats.total) || 0) + (parseInt(mobilesStats.total) || 0),
            activos: (parseInt(escritoriosStats.activos) || 0) + (parseInt(mobilesStats.activos) || 0),
            inactivos: parseInt(escritoriosStats.inactivos) || 0,
            fisicos: parseInt(escritoriosStats.total) || 0,
            moviles: parseInt(mobilesStats.total) || 0,
            biometricos: 0
        };

        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};
