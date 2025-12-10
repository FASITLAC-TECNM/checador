import { pool } from '../config/db.js';

// Obtener todos los departamentos
export const getDepartamentos = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id_departamento as id,
                nombre,
                descripcion,
                ubicacion,
                jefes,
                fecha_creacion,
                estado as activo,
                color
            FROM departamento
            ORDER BY nombre ASC
        `);

        // Procesar los resultados
        const departamentos = result.rows.map(dept => {
            let jefesArray = [];

            if (dept.jefes) {
                if (typeof dept.jefes === 'string') {
                    const cleanStr = dept.jefes.replace(/[{}]/g, '').trim();
                    if (cleanStr) {
                        jefesArray = cleanStr.split(',')
                            .map(id => parseInt(id.trim()))
                            .filter(id => !isNaN(id));
                    }
                } else if (Array.isArray(dept.jefes)) {
                    jefesArray = dept.jefes.map(id => parseInt(id)).filter(id => !isNaN(id));
                }
                jefesArray = [...new Set(jefesArray)];
            }

            // Parsear ubicación (JSON string a objeto)
            let ubicacionParsed = null;
            if (dept.ubicacion) {
                try {
                    ubicacionParsed = typeof dept.ubicacion === 'string'
                        ? JSON.parse(dept.ubicacion)
                        : dept.ubicacion;
                } catch (e) {
                    console.error('Error parsing ubicacion:', e);
                    ubicacionParsed = null;
                }
            }

            return {
                ...dept,
                jefes: jefesArray,
                ubicacion: ubicacionParsed
            };
        });

        console.log('✅ Departamentos obtenidos:', departamentos.length);
        res.json(departamentos);
    } catch (error) {
        console.error('❌ Error obteniendo departamentos:', error);
        res.status(500).json({
            error: 'Error al obtener departamentos',
            details: error.message
        });
    }
};

// Obtener un departamento por ID
export const getDepartamentoById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                id_departamento as id,
                nombre,
                descripcion,
                ubicacion,
                jefes,
                fecha_creacion,
                estado as activo,
                color
            FROM departamento
            WHERE id_departamento = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Departamento no encontrado' });
        }

        const dept = result.rows[0];
        let jefesArray = [];

        if (dept.jefes) {
            if (typeof dept.jefes === 'string') {
                const cleanStr = dept.jefes.replace(/[{}]/g, '').trim();
                if (cleanStr) {
                    jefesArray = cleanStr.split(',')
                        .map(id => parseInt(id.trim()))
                        .filter(id => !isNaN(id));
                }
            } else if (Array.isArray(dept.jefes)) {
                jefesArray = dept.jefes.map(id => parseInt(id)).filter(id => !isNaN(id));
            }
            jefesArray = [...new Set(jefesArray)];
        }

        // Parsear ubicación
        let ubicacionParsed = null;
        if (dept.ubicacion) {
            try {
                ubicacionParsed = typeof dept.ubicacion === 'string'
                    ? JSON.parse(dept.ubicacion)
                    : dept.ubicacion;
            } catch (e) {
                console.error('Error parsing ubicacion:', e);
                ubicacionParsed = null;
            }
        }

        res.json({
            ...dept,
            jefes: jefesArray,
            ubicacion: ubicacionParsed
        });
    } catch (error) {
        console.error('❌ Error obteniendo departamento:', error);
        res.status(500).json({
            error: 'Error al obtener departamento',
            details: error.message
        });
    }
};

// Crear un nuevo departamento
export const createDepartamento = async (req, res) => {
    try {
        const {
            nombre,
            descripcion,
            ubicacion,
            jefes,
            color = '#3B82F6',
            activo = true
        } = req.body;

        console.log('📥 Creando departamento:', { nombre, descripcion, ubicacion, jefes, color, activo });

        // Validaciones
        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ error: 'El nombre del departamento es requerido' });
        }

        // Convertir array de jefes a formato PostgreSQL
        let jefesFormatted = null;
        if (jefes && Array.isArray(jefes) && jefes.length > 0) {
            const jefesUnicos = [...new Set(jefes)];
            jefesFormatted = jefesUnicos;
            console.log('✅ Jefes formateados:', jefesFormatted);
        }

        // Manejar ubicación - guardar como TEXT (ya viene como JSON string desde frontend)
        let ubicacionFormatted = null;
        if (ubicacion) {
            // Si viene como string JSON, guardarlo directamente
            if (typeof ubicacion === 'string') {
                ubicacionFormatted = ubicacion;
            }
            // Si viene como objeto, convertirlo a string
            else if (typeof ubicacion === 'object') {
                ubicacionFormatted = JSON.stringify(ubicacion);
            }
            console.log('✅ Ubicación formateada:', ubicacionFormatted);
        }

        const result = await pool.query(`
            INSERT INTO departamento (nombre, descripcion, ubicacion, jefes, color, estado, fecha_creacion)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING
                id_departamento as id,
                nombre,
                descripcion,
                ubicacion,
                jefes,
                fecha_creacion,
                estado as activo,
                color
        `, [nombre.trim(), descripcion || null, ubicacionFormatted, jefesFormatted, color, activo]);

        console.log('✅ Departamento creado:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error creando departamento:', error);
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Ya existe un departamento con ese nombre'
            });
        }
        res.status(500).json({
            error: 'Error al crear departamento',
            details: error.message
        });
    }
};

// Actualizar un departamento
export const updateDepartamento = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            descripcion,
            ubicacion,
            jefes,
            color,
            activo
        } = req.body;

        console.log('📥 Actualizando departamento ID:', id);
        console.log('📋 Datos recibidos:', { nombre, descripcion, ubicacion, jefes, color, activo });

        // Validaciones
        if (nombre && !nombre.trim()) {
            return res.status(400).json({ error: 'El nombre del departamento no puede estar vacío' });
        }

        // Preparar los campos a actualizar
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (nombre !== undefined) {
            updates.push(`nombre = $${paramCount++}`);
            values.push(nombre.trim());
        }

        if (descripcion !== undefined) {
            updates.push(`descripcion = $${paramCount++}`);
            values.push(descripcion);
        }

        if (ubicacion !== undefined) {
            updates.push(`ubicacion = $${paramCount++}`);
            // Manejar ubicación - guardar como TEXT
            let ubicacionFormatted = null;
            if (ubicacion) {
                if (typeof ubicacion === 'string') {
                    ubicacionFormatted = ubicacion;
                } else if (typeof ubicacion === 'object') {
                    ubicacionFormatted = JSON.stringify(ubicacion);
                }
            }
            values.push(ubicacionFormatted);
            console.log('✅ Ubicación a guardar:', ubicacionFormatted);
        }

        if (jefes !== undefined) {
            updates.push(`jefes = $${paramCount++}`);
            if (jefes && Array.isArray(jefes) && jefes.length > 0) {
                const jefesUnicos = [...new Set(jefes)];
                values.push(jefesUnicos);
                console.log('✅ Jefes únicos a guardar:', jefesUnicos);
            } else {
                values.push(null);
            }
        }

        if (color !== undefined) {
            updates.push(`color = $${paramCount++}`);
            values.push(color);
        }

        if (activo !== undefined) {
            updates.push(`estado = $${paramCount++}`);
            values.push(activo);
        }

        // Si no hay nada que actualizar
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        // Agregar el ID al final
        values.push(id);

        const query = `
            UPDATE departamento
            SET ${updates.join(', ')}
            WHERE id_departamento = $${paramCount}
            RETURNING
                id_departamento as id,
                nombre,
                descripcion,
                ubicacion,
                jefes,
                fecha_creacion,
                estado as activo,
                color
        `;

        console.log('🔍 Query:', query);
        console.log('🔍 Values:', values);

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Departamento no encontrado' });
        }

        console.log('✅ Departamento actualizado:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error actualizando departamento:', error);
        console.error('❌ Stack:', error.stack);
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Ya existe un departamento con ese nombre'
            });
        }
        res.status(500).json({
            error: 'Error al actualizar departamento',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Eliminar un departamento
export const deleteDepartamento = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM departamento WHERE id_departamento = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Departamento no encontrado' });
        }

        res.json({
            message: 'Departamento eliminado exitosamente',
            departamento: result.rows[0]
        });
    } catch (error) {
        console.error('Error eliminando departamento:', error);
        res.status(500).json({
            error: 'Error al eliminar departamento',
            details: error.message
        });
    }
};