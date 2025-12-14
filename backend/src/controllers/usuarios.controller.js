import { pool } from '../config/db.js';

// ==================== CRUD DE USUARIOS ====================

export const getUsuarios = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                id as id_usuario,
                id_empresa,
                username,
                correo as email,
                nombre,
                telefono,
                foto,
                activo,
                conexion as estado
            FROM Usuario
            ORDER BY id
        `);

        // Normalizar valores para el frontend
        const usuarios = result.rows.map(u => ({
            ...u,
            activo: normalizarActivoParaFrontend(u.activo),
            estado: normalizarEstadoParaFrontend(u.estado)
        }));

        res.json(usuarios);
    } catch (err) {
        console.error('Error obteniendo usuarios:', err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

// Funciones auxiliares para normalización
function normalizarActivoParaFrontend(valor) {
    const map = {
        'Activo': 'ACTIVO',
        'Suspensión': 'SUSPENDIDO',
        'Baja': 'BAJA'
    };
    return map[valor] || valor;
}

function normalizarEstadoParaFrontend(valor) {
    const map = {
        'Conectado': 'CONECTADO',
        'Desconectado': 'DESCONECTADO'
    };
    return map[valor] || valor;
}

export const getUsuarioById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                id,
                id as id_usuario,
                id_empresa,
                username,
                correo as email,
                contraseña as password,
                nombre,
                telefono,
                foto,
                activo,
                conexion as estado
            FROM Usuario
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Usuario no encontrado' });

        const usuario = {
            ...result.rows[0],
            activo: normalizarActivoParaFrontend(result.rows[0].activo),
            estado: normalizarEstadoParaFrontend(result.rows[0].estado)
        };

        res.json(usuario);
    } catch (err) {
        console.error('Error obteniendo usuario:', err);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
};

export const createUsuario = async (req, res) => {
    try {
        let {
            id_empresa,
            username,
            email,
            password,
            nombre,
            telefono,
            foto,
            activo = 'Activo',
            estado = 'Desconectado'
        } = req.body;

        // Normalizar valores del frontend al formato de la BD
        const normalizarActivo = (valor) => {
            const map = {
                'ACTIVO': 'Activo',
                'SUSPENDIDO': 'Suspensión',
                'BAJA': 'Baja'
            };
            return map[valor?.toUpperCase()] || valor || 'Activo';
        };

        const normalizarEstado = (valor) => {
            const map = {
                'CONECTADO': 'Conectado',
                'DESCONECTADO': 'Desconectado'
            };
            return map[valor?.toUpperCase()] || valor || 'Desconectado';
        };

        activo = normalizarActivo(activo);
        const conexion = normalizarEstado(estado);

        if (!id_empresa || !username || !email || !password || !nombre) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                required: ['id_empresa', 'username', 'email', 'password', 'nombre']
            });
        }

        // Limpiar teléfono: eliminar guiones, espacios y paréntesis
        if (telefono) {
            telefono = telefono.replace(/[-\s()]/g, '');
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
                conexion as estado
        `, [id_empresa, username, email, password, nombre, telefono || null, foto || null, activo, conexion]);

        const usuario = {
            ...result.rows[0],
            activo: normalizarActivoParaFrontend(result.rows[0].activo),
            estado: normalizarEstadoParaFrontend(result.rows[0].estado)
        };
        res.status(201).json(usuario);
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
        let {
            id_empresa,
            username,
            email,
            password,
            nombre,
            telefono,
            foto,
            activo,
            estado
        } = req.body;

        // Normalizar valores del frontend al formato de la BD
        const normalizarActivo = (valor) => {
            if (!valor) return undefined;
            const map = {
                'ACTIVO': 'Activo',
                'SUSPENDIDO': 'Suspensión',
                'BAJA': 'Baja'
            };
            return map[valor?.toUpperCase()] || valor;
        };

        const normalizarEstado = (valor) => {
            if (!valor) return undefined;
            const map = {
                'CONECTADO': 'Conectado',
                'DESCONECTADO': 'Desconectado'
            };
            return map[valor?.toUpperCase()] || valor;
        };

        // Aplicar normalización si se proporcionan
        if (activo) activo = normalizarActivo(activo);
        const conexion = estado ? normalizarEstado(estado) : undefined;

        // Validar campos requeridos
        if (!username || !email || !nombre) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                required: ['username', 'email', 'nombre']
            });
        }

        // Limpiar teléfono: eliminar guiones, espacios y paréntesis
        if (telefono) {
            telefono = telefono.replace(/[-\s()]/g, '');
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
        let params = [username, email, nombre, telefono || null, foto || null, id_empresa];
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
                conexion as estado
        `;
        params.push(id);

        const result = await pool.query(query, params);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Usuario no encontrado' });

        const usuario = {
            ...result.rows[0],
            activo: normalizarActivoParaFrontend(result.rows[0].activo),
            estado: normalizarEstadoParaFrontend(result.rows[0].estado)
        };

        res.json(usuario);
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
        let { estado } = req.body;

        // Normalizar estado del frontend al formato de la BD
        const normalizarEstado = (valor) => {
            const map = {
                'CONECTADO': 'Conectado',
                'DESCONECTADO': 'Desconectado'
            };
            return map[valor?.toUpperCase()] || valor;
        };

        estado = normalizarEstado(estado);

        if (!['Conectado', 'Desconectado'].includes(estado)) {
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
                conexion as estado
        `, [estado, id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Usuario no encontrado' });

        const usuario = {
            ...result.rows[0],
            estado: normalizarEstadoParaFrontend(result.rows[0].estado)
        };

        res.json(usuario);
    } catch (err) {
        console.error('Error actualizando estado:', err);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
};

export const filterUsuarios = async (req, res) => {
    try {
        let { activo, estado } = req.query;

        // Normalizar valores del frontend al formato de la BD
        const normalizarActivo = (valor) => {
            const map = {
                'ACTIVO': 'Activo',
                'SUSPENDIDO': 'Suspensión',
                'BAJA': 'Baja'
            };
            return map[valor?.toUpperCase()] || valor;
        };

        const normalizarEstado = (valor) => {
            const map = {
                'CONECTADO': 'Conectado',
                'DESCONECTADO': 'Desconectado'
            };
            return map[valor?.toUpperCase()] || valor;
        };

        if (activo) activo = normalizarActivo(activo);
        if (estado) estado = normalizarEstado(estado);

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
                conexion as estado
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

        if (estado) {
            query += ` AND conexion = $${paramIndex}`;
            params.push(estado);
            paramIndex++;
        }

        query += ' ORDER BY id';

        const result = await pool.query(query, params);

        // Normalizar valores para el frontend
        const usuarios = result.rows.map(u => ({
            ...u,
            activo: normalizarActivoParaFrontend(u.activo),
            estado: normalizarEstadoParaFrontend(u.estado)
        }));

        res.json(usuarios);
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
                conexion as estado
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado o inactivo'
            });
        }

        const usuario = {
            ...result.rows[0],
            estado: normalizarEstadoParaFrontend(result.rows[0].estado)
        };

        res.json({
            success: true,
            usuario
        });
    } catch (err) {
        console.error('Error en ping:', err);
        res.status(500).json({ error: 'Error al procesar ping' });
    }
};

// ==================== GESTIÓN DE ROLES DE USUARIO ====================

/**
 * Obtener roles de un usuario
 */
export const getRolesDeUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                ur.id,
                ur.id_usuario,
                ur.id_rol,
                r.nombre as rol_nombre,
                r.descripcion as rol_descripcion,
                r.color as rol_color,
                r.jerarquia
            FROM usuario_rol ur
            INNER JOIN rol r ON ur.id_rol = r.id
            WHERE ur.id_usuario = $1
            ORDER BY r.jerarquia ASC
        `, [id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error obteniendo roles del usuario:', err);
        res.status(500).json({ error: 'Error al obtener roles del usuario' });
    }
};

/**
 * Asignar un rol a un usuario
 */
export const asignarRolAUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_rol } = req.body;

        if (!id_rol) {
            return res.status(400).json({ error: 'id_rol es requerido' });
        }

        // Verificar que el usuario existe
        const userCheck = await pool.query('SELECT id FROM Usuario WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar que el rol existe
        const roleCheck = await pool.query('SELECT id FROM rol WHERE id = $1', [id_rol]);
        if (roleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }

        // Verificar si ya tiene ese rol asignado
        const existingRole = await pool.query(
            'SELECT id FROM usuario_rol WHERE id_usuario = $1 AND id_rol = $2',
            [id, id_rol]
        );

        if (existingRole.rows.length > 0) {
            return res.status(409).json({ error: 'El usuario ya tiene este rol asignado' });
        }

        // Asignar el rol
        const result = await pool.query(`
            INSERT INTO usuario_rol (id_usuario, id_rol, fecha_asignacion)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            RETURNING *
        `, [id, id_rol]);

        res.status(201).json({
            message: 'Rol asignado exitosamente',
            asignacion: result.rows[0]
        });
    } catch (err) {
        console.error('Error asignando rol:', err);
        res.status(500).json({ error: 'Error al asignar rol' });
    }
};

/**
 * Remover un rol de un usuario
 */
export const removerRolDeUsuario = async (req, res) => {
    try {
        const { id, idRol } = req.params;

        const result = await pool.query(`
            DELETE FROM usuario_rol
            WHERE id_usuario = $1 AND id_rol = $2
            RETURNING *
        `, [id, idRol]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Asignación de rol no encontrada' });
        }

        res.json({
            message: 'Rol removido exitosamente',
            asignacion: result.rows[0]
        });
    } catch (err) {
        console.error('Error removiendo rol:', err);
        res.status(500).json({ error: 'Error al remover rol' });
    }
};
