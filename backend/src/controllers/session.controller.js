import { pool } from '../config/db.js';

// ==================== AUTENTICACIÓN ====================

export const validate = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: 'Username y password son requeridos'
            });
        }

        // Buscar usuario por username o correo
        const result = await pool.query(`
            SELECT
                id_usuario as id,
                username,
                correo as email,
                contraseña as password,
                nombre,
                telefono,
                foto,
                activo,
                estado
            FROM usuarios
            WHERE (username = $1 OR correo = $1) AND activo = 'ACTIVO'
        `, [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Credenciales inválidas'
            });
        }

        const usuario = result.rows[0];

        // Verificar password (en producción deberías usar bcrypt)
        if (password !== usuario.password) {
            return res.status(401).json({
                error: 'Credenciales inválidas'
            });
        }

        // Actualizar estado a CONECTADO
        await pool.query(`
            UPDATE usuarios
            SET estado = 'CONECTADO'
            WHERE id_usuario = $1
        `, [usuario.id]);

        // No enviar el password en la respuesta
        delete usuario.password;
        usuario.estado = 'CONECTADO';

        res.json({
            success: true,
            message: 'Login exitoso',
            usuario
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
};

export const close = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: 'userId es requerido'
            });
        }

        // Actualizar estado a DESCONECTADO
        await pool.query(`
            UPDATE usuarios
            SET estado = 'DESCONECTADO'
            WHERE id_usuario = $1
        `, [userId]);

        res.json({
            success: true,
            message: 'Logout exitoso'
        });
    } catch (err) {
        console.error('Error en logout:', err);
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
};

export const check = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                error: 'userId es requerido'
            });
        }

        const result = await pool.query(`
            SELECT
                id_usuario as id,
                username,
                correo as email,
                nombre,
                telefono,
                foto,
                activo,
                estado
            FROM usuarios
            WHERE id_usuario = $1 AND activo = 'ACTIVO'
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
        console.error('Error verificando sesión:', err);
        res.status(500).json({ error: 'Error al verificar sesión' });
    }
};
