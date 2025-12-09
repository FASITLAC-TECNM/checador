import { pool } from '../config/db.js';

// ==================== CRUD DE CREDENCIALES ====================

/**
 * Obtener credenciales de un empleado
 */
export const getCredencialesByEmpleado = async (req, res) => {
    try {
        const { id_empleado } = req.params;

        const result = await pool.query(`
            SELECT
                id,
                id_empleado,
                pin,
                fecha_creacion,
                fecha_actualizacion
            FROM Credenciales
            WHERE id_empleado = $1
        `, [id_empleado]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Credenciales no encontradas para este empleado'
            });
        }

        // No devolver datos biométricos binarios en GET normal
        const credenciales = result.rows[0];
        res.json(credenciales);
    } catch (err) {
        console.error('Error obteniendo credenciales:', err);
        res.status(500).json({ error: 'Error al obtener credenciales' });
    }
};

/**
 * Crear credenciales para un empleado
 */
export const createCredenciales = async (req, res) => {
    try {
        const { id_empleado, pin } = req.body;

        if (!id_empleado) {
            return res.status(400).json({
                error: 'id_empleado es requerido'
            });
        }

        // Validar PIN si se proporciona
        if (pin) {
            if (!/^\d{4}$/.test(pin.toString())) {
                return res.status(400).json({
                    error: 'El PIN debe ser un número de 4 dígitos'
                });
            }
        }

        // Verificar que el empleado existe
        const empleadoCheck = await pool.query(
            'SELECT id FROM Empleado WHERE id = $1',
            [id_empleado]
        );

        if (empleadoCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'El empleado especificado no existe'
            });
        }

        // Verificar que no existan credenciales previas
        const credencialesCheck = await pool.query(
            'SELECT id FROM Credenciales WHERE id_empleado = $1',
            [id_empleado]
        );

        if (credencialesCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Este empleado ya tiene credenciales registradas'
            });
        }

        const result = await pool.query(`
            INSERT INTO Credenciales (id_empleado, pin, fecha_creacion)
            VALUES ($1, $2, CURRENT_DATE)
            RETURNING
                id,
                id_empleado,
                pin,
                fecha_creacion,
                fecha_actualizacion
        `, [id_empleado, pin || null]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creando credenciales:', err);
        if (err.code === '23505') {
            return res.status(409).json({
                error: 'Las credenciales para este empleado ya existen'
            });
        }
        res.status(500).json({ error: 'Error al crear credenciales' });
    }
};

/**
 * Actualizar credenciales (principalmente PIN)
 */
export const updateCredenciales = async (req, res) => {
    try {
        const { id_empleado } = req.params;
        const { pin } = req.body;

        // Validar PIN si se proporciona
        if (pin !== undefined && pin !== null) {
            if (!/^\d{4}$/.test(pin.toString())) {
                return res.status(400).json({
                    error: 'El PIN debe ser un número de 4 dígitos'
                });
            }
        }

        const result = await pool.query(`
            UPDATE Credenciales
            SET pin = COALESCE($1, pin),
                fecha_actualizacion = CURRENT_DATE
            WHERE id_empleado = $2
            RETURNING
                id,
                id_empleado,
                pin,
                fecha_creacion,
                fecha_actualizacion
        `, [pin || null, id_empleado]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Credenciales no encontradas para este empleado'
            });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error actualizando credenciales:', err);
        res.status(500).json({ error: 'Error al actualizar credenciales' });
    }
};

/**
 * Eliminar credenciales de un empleado
 */
export const deleteCredenciales = async (req, res) => {
    try {
        const { id_empleado } = req.params;

        const result = await pool.query(
            'DELETE FROM Credenciales WHERE id_empleado = $1 RETURNING *',
            [id_empleado]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Credenciales no encontradas para este empleado'
            });
        }

        res.json({
            message: 'Credenciales eliminadas',
            credenciales: result.rows[0]
        });
    } catch (err) {
        console.error('Error eliminando credenciales:', err);
        res.status(500).json({ error: 'Error al eliminar credenciales' });
    }
};

/**
 * Validar PIN de un empleado
 */
export const validarPin = async (req, res) => {
    try {
        const { id_empleado, pin } = req.body;

        if (!id_empleado || !pin) {
            return res.status(400).json({
                error: 'id_empleado y pin son requeridos'
            });
        }

        const result = await pool.query(`
            SELECT pin
            FROM Credenciales
            WHERE id_empleado = $1
        `, [id_empleado]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'No se encontraron credenciales para este empleado',
                valido: false
            });
        }

        const credenciales = result.rows[0];
        const pinValido = credenciales.pin === parseInt(pin);

        res.json({
            valido: pinValido,
            message: pinValido ? 'PIN correcto' : 'PIN incorrecto'
        });
    } catch (err) {
        console.error('Error validando PIN:', err);
        res.status(500).json({ error: 'Error al validar PIN' });
    }
};

/**
 * Actualizar datos biométricos (huella dactilar)
 * Nota: Los datos biométricos se envían como Buffer en el body
 */
export const updateDactilar = async (req, res) => {
    try {
        const { id_empleado } = req.params;
        const { dactilar } = req.body; // Se espera un Buffer o base64

        if (!dactilar) {
            return res.status(400).json({
                error: 'Los datos dactilares son requeridos'
            });
        }

        const result = await pool.query(`
            UPDATE Credenciales
            SET dactilar = $1,
                fecha_actualizacion = CURRENT_DATE
            WHERE id_empleado = $2
            RETURNING id, id_empleado, fecha_actualizacion
        `, [dactilar, id_empleado]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Credenciales no encontradas para este empleado'
            });
        }

        res.json({
            message: 'Huella dactilar actualizada correctamente',
            ...result.rows[0]
        });
    } catch (err) {
        console.error('Error actualizando huella dactilar:', err);
        res.status(500).json({ error: 'Error al actualizar huella dactilar' });
    }
};

/**
 * Actualizar datos biométricos (reconocimiento facial)
 * Nota: Los datos biométricos se envían como Buffer en el body
 */
export const updateFacial = async (req, res) => {
    try {
        const { id_empleado } = req.params;
        const { facial } = req.body; // Se espera un Buffer o base64

        if (!facial) {
            return res.status(400).json({
                error: 'Los datos faciales son requeridos'
            });
        }

        const result = await pool.query(`
            UPDATE Credenciales
            SET facial = $1,
                fecha_actualizacion = CURRENT_DATE
            WHERE id_empleado = $2
            RETURNING id, id_empleado, fecha_actualizacion
        `, [facial, id_empleado]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Credenciales no encontradas para este empleado'
            });
        }

        res.json({
            message: 'Reconocimiento facial actualizado correctamente',
            ...result.rows[0]
        });
    } catch (err) {
        console.error('Error actualizando reconocimiento facial:', err);
        res.status(500).json({ error: 'Error al actualizar reconocimiento facial' });
    }
};

/**
 * Verificar qué métodos de autenticación tiene configurados un empleado
 */
export const getMetodosAutenticacion = async (req, res) => {
    try {
        const { id_empleado } = req.params;

        const result = await pool.query(`
            SELECT
                id_empleado,
                (pin IS NOT NULL) as tiene_pin,
                (dactilar IS NOT NULL) as tiene_dactilar,
                (facial IS NOT NULL) as tiene_facial
            FROM Credenciales
            WHERE id_empleado = $1
        `, [id_empleado]);

        if (result.rows.length === 0) {
            return res.json({
                tiene_pin: false,
                tiene_dactilar: false,
                tiene_facial: false,
                configurado: false
            });
        }

        const metodos = result.rows[0];
        metodos.configurado = metodos.tiene_pin || metodos.tiene_dactilar || metodos.tiene_facial;

        res.json(metodos);
    } catch (err) {
        console.error('Error obteniendo métodos de autenticación:', err);
        res.status(500).json({ error: 'Error al obtener métodos de autenticación' });
    }
};
