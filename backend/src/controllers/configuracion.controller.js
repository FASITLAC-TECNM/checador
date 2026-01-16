import { pool } from '../config/db.js';

// Obtener la configuración actual
export const getConfiguracion = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM configuracion ORDER BY id DESC LIMIT 1');

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró configuración' });
        }

        const config = result.rows[0];

        // Parsear los campos JSON
        const configuracion = {
            ...config,
            paleta_colores: typeof config.paleta_colores === 'string'
                ? JSON.parse(config.paleta_colores)
                : config.paleta_colores,
            credenciales_orden: typeof config.credenciales_orden === 'string'
                ? JSON.parse(config.credenciales_orden)
                : config.credenciales_orden
        };

        res.json(configuracion);
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({ error: 'Error al obtener configuración' });
    }
};

// Actualizar la configuración
export const updateConfiguracion = async (req, res) => {
    try {
        const {
            nombre_empresa,
            logo_empresa,
            paleta_colores,
            mantenimiento,
            formato_fecha,
            formato_hora,
            zona_horaria,
            idioma,
            max_intentos,
            credenciales_orden
        } = req.body;

        // Obtener el ID de la configuración actual
        const currentConfig = await pool.query('SELECT id FROM configuracion ORDER BY id DESC LIMIT 1');

        if (currentConfig.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró configuración' });
        }

        const configId = currentConfig.rows[0].id;

        // Preparar los valores para actualizar
        const paletaJson = typeof paleta_colores === 'object'
            ? JSON.stringify(paleta_colores)
            : paleta_colores;

        const credencialesJson = typeof credenciales_orden === 'object'
            ? JSON.stringify(credenciales_orden)
            : credenciales_orden;

        const result = await pool.query(
            `UPDATE configuracion
            SET nombre_empresa = COALESCE($1, nombre_empresa),
                logo_empresa = COALESCE($2, logo_empresa),
                paleta_colores = COALESCE($3, paleta_colores),
                mantenimiento = COALESCE($4, mantenimiento),
                formato_fecha = COALESCE($5, formato_fecha),
                formato_hora = COALESCE($6, formato_hora),
                zona_horaria = COALESCE($7, zona_horaria),
                idioma = COALESCE($8, idioma),
                max_intentos = COALESCE($9, max_intentos),
                credenciales_orden = COALESCE($10, credenciales_orden)
            WHERE id = $11
            RETURNING *`,
            [
                nombre_empresa,
                logo_empresa,
                paletaJson,
                mantenimiento,
                formato_fecha,
                formato_hora,
                zona_horaria,
                idioma,
                max_intentos,
                credencialesJson,
                configId
            ]
        );

        const updatedConfig = result.rows[0];

        // Parsear los campos JSON para la respuesta
        const configuracion = {
            ...updatedConfig,
            paleta_colores: typeof updatedConfig.paleta_colores === 'string'
                ? JSON.parse(updatedConfig.paleta_colores)
                : updatedConfig.paleta_colores,
            credenciales_orden: typeof updatedConfig.credenciales_orden === 'string'
                ? JSON.parse(updatedConfig.credenciales_orden)
                : updatedConfig.credenciales_orden
        };

        res.json(configuracion);
    } catch (error) {
        console.error('Error al actualizar configuración:', error);
        res.status(500).json({ error: 'Error al actualizar configuración' });
    }
};

// Alternar modo mantenimiento
export const toggleMantenimiento = async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE configuracion
            SET mantenimiento = NOT mantenimiento
            WHERE id = (SELECT id FROM configuracion ORDER BY id DESC LIMIT 1)
            RETURNING *`
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró configuración' });
        }

        res.json({
            mantenimiento: result.rows[0].mantenimiento,
            message: result.rows[0].mantenimiento ? 'Modo mantenimiento activado' : 'Modo mantenimiento desactivado'
        });
    } catch (error) {
        console.error('Error al alternar mantenimiento:', error);
        res.status(500).json({ error: 'Error al alternar modo mantenimiento' });
    }
};
