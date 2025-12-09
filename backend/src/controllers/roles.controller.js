import { pool } from '../config/db.js';

// Obtener todos los roles
export const getRoles = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                r.id,
                r.nombre,
                r.descripcion,
                r.contador_retardos,
                r.fecha_creacion,
                r.fecha_edicion,
                r.jerarquia,
                r.id_tolerancia,
                COUNT(DISTINCT ur.id_usuario) as usuarios_asignados
            FROM rol r
            LEFT JOIN usuario_rol ur ON r.id = ur.id_rol
            GROUP BY r.id
            ORDER BY r.jerarquia ASC, r.nombre ASC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo roles:', error);
        res.status(500).json({
            error: 'Error al obtener roles',
            details: error.message
        });
    }
};

// Obtener un rol por ID con sus módulos/permisos
export const getRolById = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener información del rol
        const rolResult = await pool.query(`
            SELECT
                r.id,
                r.nombre,
                r.descripcion,
                r.contador_retardos,
                r.fecha_creacion,
                r.fecha_edicion,
                r.jerarquia,
                r.id_tolerancia,
                COUNT(DISTINCT ur.id_usuario) as usuarios_asignados
            FROM rol r
            LEFT JOIN usuario_rol ur ON r.id = ur.id_rol
            WHERE r.id = $1
            GROUP BY r.id
        `, [id]);

        if (rolResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }

        // Obtener permisos del rol
        const permisosResult = await pool.query(`
            SELECT
                m.id as id_modulo,
                m.nombre as modulo,
                rm.crear as can_create,
                rm.ver as can_read,
                rm.editar as can_update,
                rm.eliminar as can_delete
            FROM rolmodulo rm
            INNER JOIN modulo m ON rm.id_modulo = m.id
            WHERE rm.id_rol = $1
        `, [id]);

        const rol = {
            ...rolResult.rows[0],
            permisos: permisosResult.rows
        };

        res.json(rol);
    } catch (error) {
        console.error('Error obteniendo rol:', error);
        res.status(500).json({
            error: 'Error al obtener rol',
            details: error.message
        });
    }
};

// Crear un nuevo rol
export const createRol = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            nombre,
            descripcion,
            jerarquia,
            id_tolerancia,
            permisos // Array de objetos: [{id_modulo, can_create, can_read, can_update, can_delete}]
        } = req.body;

        // Validaciones
        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ error: 'El nombre del rol es requerido' });
        }

        await client.query('BEGIN');

        // Insertar rol
        const rolResult = await client.query(`
            INSERT INTO rol (nombre, descripcion, jerarquia, id_tolerancia, fecha_creacion)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            RETURNING *
        `, [nombre.trim(), descripcion || null, jerarquia || 10, id_tolerancia || null]);

        const nuevoRol = rolResult.rows[0];

        // Insertar permisos si se proporcionaron
        if (permisos && Array.isArray(permisos) && permisos.length > 0) {
            for (const permiso of permisos) {
                await client.query(`
                    INSERT INTO rolmodulo (id_rol, id_modulo, crear, ver, editar, eliminar)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    nuevoRol.id,
                    permiso.id_modulo,
                    permiso.can_create || false,
                    permiso.can_read || false,
                    permiso.can_update || false,
                    permiso.can_delete || false
                ]);
            }
        }

        await client.query('COMMIT');

        // Obtener el rol completo con permisos
        const rolCompleto = await getRolWithPermissions(nuevoRol.id);

        res.status(201).json(rolCompleto);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creando rol:', error);
        res.status(500).json({
            error: 'Error al crear rol',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// Actualizar un rol
export const updateRol = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            nombre,
            descripcion,
            jerarquia,
            id_tolerancia,
            permisos // Array de objetos: [{id_modulo, can_create, can_read, can_update, can_delete}]
        } = req.body;

        // Verificar que el rol existe
        const existeRol = await client.query('SELECT id FROM rol WHERE id = $1', [id]);
        if (existeRol.rows.length === 0) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }

        await client.query('BEGIN');

        // Actualizar información del rol
        await client.query(`
            UPDATE rol
            SET nombre = $1,
                descripcion = $2,
                jerarquia = $3,
                id_tolerancia = $4,
                fecha_edicion = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [nombre, descripcion, jerarquia, id_tolerancia, id]);

        // Actualizar permisos si se proporcionaron
        if (permisos && Array.isArray(permisos)) {
            // Eliminar permisos existentes
            await client.query('DELETE FROM rolmodulo WHERE id_rol = $1', [id]);

            // Insertar nuevos permisos
            for (const permiso of permisos) {
                await client.query(`
                    INSERT INTO rolmodulo (id_rol, id_modulo, crear, ver, editar, eliminar)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    id,
                    permiso.id_modulo,
                    permiso.can_create || false,
                    permiso.can_read || false,
                    permiso.can_update || false,
                    permiso.can_delete || false
                ]);
            }
        }

        await client.query('COMMIT');

        // Obtener el rol actualizado con permisos
        const rolActualizado = await getRolWithPermissions(id);

        res.json(rolActualizado);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error actualizando rol:', error);
        res.status(500).json({
            error: 'Error al actualizar rol',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// Eliminar un rol
export const deleteRol = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        // Verificar que el rol existe
        const rolResult = await client.query('SELECT id FROM rol WHERE id = $1', [id]);
        if (rolResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }

        // Verificar que no haya usuarios asignados
        const usuariosResult = await client.query(
            'SELECT COUNT(*) as count FROM usuario_rol WHERE id_rol = $1',
            [id]
        );

        if (parseInt(usuariosResult.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar el rol porque tiene usuarios asignados',
                usuarios_asignados: parseInt(usuariosResult.rows[0].count)
            });
        }

        await client.query('BEGIN');

        // Eliminar permisos del rol
        await client.query('DELETE FROM rolmodulo WHERE id_rol = $1', [id]);

        // Eliminar rol
        await client.query('DELETE FROM rol WHERE id = $1', [id]);

        await client.query('COMMIT');

        res.json({
            message: 'Rol eliminado exitosamente',
            id: parseInt(id)
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error eliminando rol:', error);
        res.status(500).json({
            error: 'Error al eliminar rol',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// Obtener todos los módulos disponibles
export const getModulos = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, nombre, descripcion, estado
            FROM modulo
            WHERE estado = true
            ORDER BY nombre ASC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo módulos:', error);
        res.status(500).json({
            error: 'Error al obtener módulos',
            details: error.message
        });
    }
};

// Función auxiliar para obtener rol con permisos
async function getRolWithPermissions(rolId) {
    const rolResult = await pool.query(`
        SELECT
            r.id,
            r.nombre,
            r.descripcion,
            r.contador_retardos,
            r.fecha_creacion,
            r.fecha_edicion,
            r.jerarquia,
            r.id_tolerancia,
            COUNT(DISTINCT ur.id_usuario) as usuarios_asignados
        FROM rol r
        LEFT JOIN usuario_rol ur ON r.id = ur.id_rol
        WHERE r.id = $1
        GROUP BY r.id
    `, [rolId]);

    const permisosResult = await pool.query(`
        SELECT
            m.id as id_modulo,
            m.nombre as modulo,
            rm.crear as can_create,
            rm.ver as can_read,
            rm.editar as can_update,
            rm.eliminar as can_delete
        FROM rolmodulo rm
        INNER JOIN modulo m ON rm.id_modulo = m.id
        WHERE rm.id_rol = $1
    `, [rolId]);

    return {
        ...rolResult.rows[0],
        permisos: permisosResult.rows
    };
}
