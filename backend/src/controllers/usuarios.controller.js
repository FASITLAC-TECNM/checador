import { pool } from '../config/db.js';

// ==================== CRUD DE USUARIOS ====================

export const getUsuarios = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id as id_usuario,
                id_empresa,
                username,
                correo as email,
                nombre,
                telefono,
                foto,
                activo,
                conexion
            FROM Usuario
            ORDER BY id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error obteniendo usuarios:', err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

export const getUsuarioById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                id as id_usuario,
                id_empresa,
                username,
                correo as email,
                contraseña as password,
                nombre,
                telefono,
                foto,
                activo,
                conexion
            FROM Usuario
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Usuario no encontrado' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error obteniendo usuario:', err);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
};

export const createUsuario = async (req, res) => {
    try {
        const {
            id_empresa,
            username,
            email,
            password,
            nombre,
            telefono,
            foto,
            activo = 'Activo',
            conexion = 'Desconectado'
        } = req.body;

        if (!username || !email || !password || !nombre) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                required: ['username', 'email', 'password', 'nombre']
            });
        }

        // Validar longitud de campos
        const validaciones = [
            { campo: 'username', valor: username, max: 55 },
            { campo: 'email', valor: email, max: 55 },
            { campo: 'telefono', valor: telefono, max: 10 }
        ];

        for (const { campo, valor, max } of validaciones) {
            if (valor && valor.length > max) {
                return res.status(400).json({
                    error: `El campo '${campo}' excede el límite de ${max} caracteres`,
                    campo: campo,
                    longitudActual: valor.length,
                    longitudMaxima: max
                });
            }
        }

        const result = await pool.query(`
            INSERT INTO Usuario (
                id_empresa,
                username,
                correo,
                contraseña,
                nombre,
                telefono,
                foto,
                activo,
                conexion
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING
                id as id_usuario,
                id_empresa,
                username,
                correo as email,
                nombre,
                telefono,
                foto,
                activo,
                conexion
        `, [id_empresa || null, username, email, password, nombre, telefono || null, foto || null, activo, conexion]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creando usuario:', err);
        if (err.code === '23505') {
            return res.status(409).json({
                error: 'El username o email ya están registrados'
            });
        }
        if (err.code === '22001') {
            return res.status(400).json({
                error: 'Uno de los campos excede el límite de caracteres permitidos'
            });
        }
        res.status(500).json({ error: 'Error al crear usuario' });
    }
};

export const updateUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            id_empresa,
            username,
            email,
            password,
            nombre,
            telefono,
            foto,
            activo,
            conexion
        } = req.body;

        // Validar campos requeridos
        if (!username || !email || !nombre) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                required: ['username', 'email', 'nombre']
            });
        }

        // Validar valores ENUM si se proporcionan
        const validActivo = ['Activo', 'Suspensión', 'Baja'];
        const validConexion = ['Conectado', 'Desconectado'];

        if (activo && !validActivo.includes(activo)) {
            return res.status(400).json({
                error: 'Valor inválido para activo',
                valid: validActivo
            });
        }

        if (conexion && !validConexion.includes(conexion)) {
            return res.status(400).json({
                error: 'Valor inválido para conexion',
                valid: validConexion
            });
        }

        let query = `
            UPDATE Usuario
            SET username = $1,
                correo = $2,
                nombre = $3,
                telefono = $4,
                foto = $5,
                id_empresa = $6
        `;
        let params = [username, email, nombre, telefono || null, foto || null, id_empresa || null];
        let paramIndex = 7;

        // Solo actualizar activo si se proporciona
        if (activo) {
            query += `, activo = $${paramIndex}`;
            params.push(activo);
            paramIndex++;
        }

        // Solo actualizar conexion si se proporciona
        if (conexion) {
            query += `, conexion = $${paramIndex}`;
            params.push(conexion);
            paramIndex++;
        }

        if (password && password.trim() !== '') {
            query += `, contraseña = $${paramIndex}`;
            params.push(password);
            paramIndex++;
        }

        query += ` WHERE id = $${paramIndex}
            RETURNING
                id as id_usuario,
                id_empresa,
                username,
                correo as email,
                nombre,
                telefono,
                foto,
                activo,
                conexion
        `;
        params.push(id);

        const result = await pool.query(query, params);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Usuario no encontrado' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error actualizando usuario:', err);
        if (err.code === '23505') {
            return res.status(409).json({
                error: 'El username o email ya están registrados'
            });
        }
        res.status(500).json({
            error: 'Error al actualizar usuario',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const deleteUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM Usuario WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Usuario no encontrado' });

        res.json({ message: 'Usuario eliminado', usuario: result.rows[0] });
    } catch (err) {
        console.error('Error eliminando usuario:', err);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
};

// ==================== ENDPOINTS ADICIONALES ====================

export const updateEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { conexion } = req.body;

        if (!['Conectado', 'Desconectado'].includes(conexion)) {
            return res.status(400).json({
                error: 'Estado de conexión inválido',
                valid: ['Conectado', 'Desconectado']
            });
        }

        const result = await pool.query(`
            UPDATE Usuario
            SET conexion = $1
            WHERE id = $2
            RETURNING
                id as id_usuario,
                username,
                nombre,
                conexion
        `, [conexion, id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Usuario no encontrado' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error actualizando estado:', err);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
};

export const filterUsuarios = async (req, res) => {
    try {
        const { activo, conexion } = req.query;

        let query = `
            SELECT
                id as id_usuario,
                id_empresa,
                username,
                correo as email,
                nombre,
                telefono,
                foto,
                activo,
                conexion
            FROM Usuario
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (activo) {
            query += ` AND activo = $${paramIndex}`;
            params.push(activo);
            paramIndex++;
        }

        if (conexion) {
            query += ` AND conexion = $${paramIndex}`;
            params.push(conexion);
            paramIndex++;
        }

        query += ' ORDER BY id';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error filtrando usuarios:', err);
        res.status(500).json({ error: 'Error al filtrar usuarios' });
    }
};

export const getStats = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN activo = 'Activo' THEN 1 END) as activos,
                COUNT(CASE WHEN activo = 'Suspensión' THEN 1 END) as suspendidos,
                COUNT(CASE WHEN activo = 'Baja' THEN 1 END) as baja,
                COUNT(CASE WHEN conexion = 'Conectado' THEN 1 END) as conectados,
                COUNT(CASE WHEN conexion = 'Desconectado' THEN 1 END) as desconectados
            FROM Usuario
        `);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error obteniendo estadísticas:', err);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

export const ping = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: 'userId es requerido'
            });
        }

        // Actualizar estado a Conectado y registrar última actividad
        const result = await pool.query(`
            UPDATE Usuario
            SET conexion = 'Conectado'
            WHERE id = $1 AND activo = 'Activo'
            RETURNING
                id as id_usuario,
                username,
                conexion
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado o inactivo'
            });
        }

        res.json({
            success: true,
            usuario: result.rows[0]
        });
    } catch (err) {
        console.error('Error en ping:', err);
        res.status(500).json({ error: 'Error al procesar ping' });
    }
};
