import { pool } from '../config/db.js';

// ==================== AUTENTICACIÓN ====================

export const login = async (req, res) => {
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
            WHERE (username = $1 OR correo = $1) AND activo = 'Activo'
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

        // Obtener información del empleado si existe
        const empleadoResult = await pool.query(`
            SELECT
                id as id_empleado,
                id_usuario,
                rfc,
                nss,
                fecha_registro,
                fecha_modificacion,
                estado
            FROM Empleado
            WHERE id_usuario = $1
        `, [usuario.id_usuario]);

        const empleado = empleadoResult.rows.length > 0 ? empleadoResult.rows[0] : null;

        // Obtener rol del usuario y sus permisos
        const rolResult = await pool.query(`
            SELECT
                r.id as id_rol,
                r.nombre as nombre_rol,
                r.descripcion as descripcion_rol,
                ur.estado as rol_activo,
                ur.fecha_asignacion,
                t.id as id_tolerancia,
                t.nombre as nombre_tolerancia,
                t.tipo_tolerancia,
                t.max_retardos,
                t.dias_aplicables,
                t.estado as tolerancia_activa
            FROM Usuario_rol ur
            INNER JOIN Rol r ON ur.id_rol = r.id
            LEFT JOIN Tolerancia t ON r.id_tolerancia = t.id
            WHERE ur.id_usuario = $1 AND ur.estado = true
            ORDER BY ur.fecha_asignacion DESC
            LIMIT 1
        `, [usuario.id_usuario]);

        const rol = rolResult.rows.length > 0 ? rolResult.rows[0] : null;

        // Obtener permisos del rol (módulos)
        let permisos = [];
        if (rol) {
            const permisosResult = await pool.query(`
                SELECT
                    m.id as id_modulo,
                    m.nombre as nombre_modulo,
                    m.descripcion as descripcion_modulo,
                    m.estado as modulo_activo,
                    rhm.ver,
                    rhm.crear,
                    rhm.editar,
                    rhm.eliminar
                FROM rolmodulo rhm
                INNER JOIN Modulo m ON rhm.id_modulo = m.id
                WHERE rhm.id_rol = $1 AND m.estado = true
            `, [rol.id_rol]);

            permisos = permisosResult.rows;
        }

        // Obtener departamento del empleado si existe
        let departamento = null;
        if (empleado) {
            const deptoResult = await pool.query(`
                SELECT
                    d.id_departamento,
                    d.nombre as nombre_departamento,
                    d.descripcion,
                    d.ubicacion,
                    d.color,
                    ed.fecha_asignacion,
                    ed.estado
                FROM empleado_departamento ed
                INNER JOIN Departamento d ON ed.id_departamento = d.id_departamento
                WHERE ed.id_empleado = $1 AND ed.estado = true
                ORDER BY ed.fecha_asignacion DESC
                LIMIT 1
            `, [empleado.id_empleado]);

            departamento = deptoResult.rows.length > 0 ? deptoResult.rows[0] : null;
        }

        // Actualizar estado a Conectado
        await pool.query(`
            UPDATE Usuario
            SET conexion = 'Conectado'
            WHERE id = $1
        `, [usuario.id_usuario]);

        // No enviar el password en la respuesta
        delete usuario.password;
        usuario.conexion = 'Conectado';

        res.json({
            success: true,
            message: 'Login exitoso',
            usuario,
            empleado,
            rol,
            permisos,
            departamento
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
};

export const logout = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: 'userId es requerido'
            });
        }

        // Actualizar estado a Desconectado
        await pool.query(`
            UPDATE Usuario
            SET conexion = 'Desconectado'
            WHERE id = $1
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

export const verificarSesion = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                error: 'userId es requerido'
            });
        }

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
            WHERE id = $1 AND activo = 'Activo'
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado o inactivo'
            });
        }

        const usuario = result.rows[0];

        // Obtener información del empleado si existe
        const empleadoResult = await pool.query(`
            SELECT
                id as id_empleado,
                id_usuario,
                rfc,
                nss,
                fecha_registro,
                fecha_modificacion,
                estado
            FROM Empleado
            WHERE id_usuario = $1
        `, [usuario.id_usuario]);

        const empleado = empleadoResult.rows.length > 0 ? empleadoResult.rows[0] : null;

        // Obtener rol del usuario
        const rolResult = await pool.query(`
            SELECT
                r.id as id_rol,
                r.nombre as nombre_rol,
                r.descripcion as descripcion_rol,
                ur.estado as rol_activo,
                ur.fecha_asignacion
            FROM Usuario_rol ur
            INNER JOIN Rol r ON ur.id_rol = r.id
            WHERE ur.id_usuario = $1 AND ur.estado = true
            ORDER BY ur.fecha_asignacion DESC
            LIMIT 1
        `, [usuario.id_usuario]);

        const rol = rolResult.rows.length > 0 ? rolResult.rows[0] : null;

        // Obtener permisos del rol (módulos)
        let permisos = [];
        if (rol) {
            const permisosResult = await pool.query(`
                SELECT
                    m.id as id_modulo,
                    m.nombre as nombre_modulo,
                    m.descripcion as descripcion_modulo,
                    m.estado as modulo_activo,
                    rhm.ver,
                    rhm.crear,
                    rhm.editar,
                    rhm.eliminar
                FROM rolmodulo rhm
                INNER JOIN Modulo m ON rhm.id_modulo = m.id
                WHERE rhm.id_rol = $1 AND m.estado = true
            `, [rol.id_rol]);

            permisos = permisosResult.rows;
        }

        res.json({
            success: true,
            usuario,
            empleado,
            rol,
            permisos
        });
    } catch (err) {
        console.error('Error verificando sesión:', err);
        res.status(500).json({ error: 'Error al verificar sesión' });
    }
};
