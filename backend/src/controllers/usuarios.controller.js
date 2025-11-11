import { pool } from '../config/db.js';

// ==================== CRUD DE USUARIOS ====================

export const getUsuarios = async (req, res) => {
    try {
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
      ORDER BY id_usuario
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
      WHERE id_usuario = $1
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
            username,
            email,
            password,
            nombre,
            telefono,
            foto,
            activo = 'ACTIVO',
            estado = 'DESCONECTADO'
        } = req.body;

        if (!username || !email || !password || !nombre) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                required: ['username', 'email', 'password', 'nombre']
            });
        }

        // Validar longitud de campos
        const validaciones = [
            { campo: 'username', valor: username, max: 50 },
            { campo: 'email', valor: email, max: 100 },
            { campo: 'password', valor: password, max: 255 },
            { campo: 'nombre', valor: nombre, max: 100 },
            { campo: 'telefono', valor: telefono, max: 20 },
            { campo: 'foto', valor: foto, max: 255 }
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
      INSERT INTO usuarios (
        username,
        correo,
        contraseña,
        nombre,
        telefono,
        foto,
        activo,
        estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id_usuario as id,
        username,
        correo as email,
        nombre,
        telefono,
        foto,
        activo,
        estado
    `, [username, email, password, nombre, telefono || null, foto || null, activo, estado]);

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
                error: 'Uno de los campos excede el límite de caracteres permitidos',
                detalles: 'Verifica que los campos no excedan sus límites: username(50), email(100), password(255), nombre(100), telefono(20), foto(255)'
            });
        }
        res.status(500).json({ error: 'Error al crear usuario' });
    }
};

export const updateUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            username,
            email,
            password,
            nombre,
            telefono,
            foto,
            activo,
            estado
        } = req.body;

        // Validar campos requeridos
        if (!username || !email || !nombre) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                required: ['username', 'email', 'nombre']
            });
        }

        // Validar longitud de campos
        const validaciones = [
            { campo: 'username', valor: username, max: 50 },
            { campo: 'email', valor: email, max: 100 },
            { campo: 'password', valor: password, max: 255 },
            { campo: 'nombre', valor: nombre, max: 100 },
            { campo: 'telefono', valor: telefono, max: 20 },
            { campo: 'foto', valor: foto, max: 255 }
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

        // Validar valores ENUM si se proporcionan
        const validActivo = ['ACTIVO', 'SUSPENDIDO', 'BAJA'];
        const validEstado = ['CONECTADO', 'DESCONECTADO'];

        if (activo && !validActivo.includes(activo)) {
            return res.status(400).json({
                error: 'Valor inválido para activo',
                valid: validActivo
            });
        }

        if (estado && !validEstado.includes(estado)) {
            return res.status(400).json({
                error: 'Valor inválido para estado',
                valid: validEstado
            });
        }

        let query = `
      UPDATE usuarios
      SET username = $1,
          correo = $2,
          nombre = $3,
          telefono = $4,
          foto = $5
    `;
        let params = [username, email, nombre, telefono || null, foto || null];
        let paramIndex = 6;

        // Solo actualizar activo si se proporciona
        if (activo) {
            query += `, activo = $${paramIndex}`;
            params.push(activo);
            paramIndex++;
        }

        // Solo actualizar estado si se proporciona
        if (estado) {
            query += `, estado = $${paramIndex}`;
            params.push(estado);
            paramIndex++;
        }

        if (password && password.trim() !== '') {
            query += `, contraseña = $${paramIndex}`;
            params.push(password);
            paramIndex++;
        }

        query += ` WHERE id_usuario = $${paramIndex}
      RETURNING
          id_usuario as id,
          username,
          correo as email,
          nombre,
          telefono,
          foto,
          activo,
          estado
    `;
        params.push(id);

        const result = await pool.query(query, params);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Usuario no encontrado' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error actualizando usuario:', err);
        console.error('Error details:', err.detail);
        console.error('Error hint:', err.hint);
        if (err.code === '23505') {
            return res.status(409).json({
                error: 'El username o email ya están registrados'
            });
        }
        if (err.code === '22001') {
            return res.status(400).json({
                error: 'Uno de los campos excede el límite de caracteres permitidos',
                detalles: 'Verifica que los campos no excedan sus límites: username(50), email(100), password(255), nombre(100), telefono(20), foto(255)'
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
            'DELETE FROM usuarios WHERE id_usuario = $1 RETURNING *',
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
        const { estado } = req.body;

        if (!['CONECTADO', 'DESCONECTADO'].includes(estado)) {
            return res.status(400).json({
                error: 'Estado inválido',
                valid: ['CONECTADO', 'DESCONECTADO']
            });
        }

        const result = await pool.query(`
      UPDATE usuarios 
      SET estado = $1
      WHERE id_usuario = $2
      RETURNING 
        id_usuario as id,
        username,
        nombre,
        estado
    `, [estado, id]);

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
        const { activo, estado } = req.query;

        let query = `
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
            query += ` AND estado = $${paramIndex}`;
            params.push(estado);
            paramIndex++;
        }

        query += ' ORDER BY id_usuario';

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
          COUNT(*) as total_usuarios,
          COUNT(CASE WHEN activo = 'ACTIVO' THEN 1 END) as activos,
          COUNT(CASE WHEN activo = 'SUSPENDIDO' THEN 1 END) as suspendidos,
          COUNT(CASE WHEN activo = 'BAJA' THEN 1 END) as baja,
          COUNT(CASE WHEN estado = 'CONECTADO' THEN 1 END) as conectados,
          COUNT(CASE WHEN estado = 'DESCONECTADO' THEN 1 END) as desconectados
      FROM usuarios
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

        // Actualizar estado a CONECTADO y registrar última actividad
        const result = await pool.query(`
            UPDATE usuarios
            SET estado = 'CONECTADO'
            WHERE id_usuario = $1 AND activo = 'ACTIVO'
            RETURNING
                id_usuario as id,
                username,
                estado
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
