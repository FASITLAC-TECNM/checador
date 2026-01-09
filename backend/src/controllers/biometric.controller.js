// controllers/biometric.controller.js
import { pool } from "../config/db.js";

/**
 * 🔐 GUARDAR HUELLA DESDE BIOMETRIC MIDDLEWARE
 * Recibe el template en Base64 desde el componente React
 */
export const guardarHuellaDesdeMiddleware = async (req, res) => {
  try {
    const { id_empleado, template_base64, userId } = req.body;

    console.log("\n" + "=".repeat(70));
    console.log(" GUARDANDO HUELLA DESDE MIDDLEWARE");
    console.log("=".repeat(70));
    console.log(` Empleado ID: ${id_empleado}`);
    console.log(` User ID: ${userId}`);

    // Validaciones
    if (!id_empleado) {
      return res.status(400).json({
        success: false,
        error: "id_empleado es requerido",
      });
    }

    if (!template_base64) {
      return res.status(400).json({
        success: false,
        error: "template_base64 es requerido",
      });
    }

    // Verificar que el empleado existe
    const empleadoCheck = await pool.query(
      "SELECT id, id_usuario FROM empleado WHERE id = $1",
      [id_empleado]
    );

    if (empleadoCheck.rows.length === 0) {
      console.log(`[ERROR] Empleado ${id_empleado} no encontrado`);
      return res.status(404).json({
        success: false,
        error: `Empleado con ID ${id_empleado} no existe`,
      });
    }

    // Convertir Base64 a Buffer (PostgreSQL BYTEA)
    const buffer = Buffer.from(template_base64, "base64");
    console.log(` Template: ${buffer.length} bytes`);

    // Verificar si ya existe una credencial
    const credencialCheck = await pool.query(
      "SELECT id FROM credenciales WHERE id_empleado = $1",
      [id_empleado]
    );

    let result;

    if (credencialCheck.rows.length > 0) {
      // Actualizar huella existente
      console.log(" Actualizando huella existente...");
      result = await pool.query(
        `
                UPDATE credenciales
                SET dactilar = $1,
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id_empleado = $2
                RETURNING id, id_empleado, fecha_actualizacion
            `,
        [buffer, id_empleado]
      );
    } else {
      // Crear nueva credencial
      console.log(" Creando nueva credencial...");
      result = await pool.query(
        `
                INSERT INTO credenciales (
                    id_empleado,
                    dactilar,
                    fecha_creacion,
                    fecha_actualizacion
                )
                VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id, id_empleado, fecha_creacion, fecha_actualizacion
            `,
        [id_empleado, buffer]
      );
    }

    console.log("[OK] Huella guardada exitosamente");
    console.log(`   ID Credencial: ${result.rows[0].id}`);
    console.log("=".repeat(70) + "\n");

    res.status(200).json({
      success: true,
      message: "Huella registrada correctamente",
      data: {
        id_credencial: result.rows[0].id,
        id_empleado: result.rows[0].id_empleado,
        template_size: buffer.length,
        userId: userId,
        timestamp:
          result.rows[0].fecha_actualizacion || result.rows[0].fecha_creacion,
      },
    });
  } catch (error) {
    console.error("[ERROR] Error guardando huella:", error);
    res.status(500).json({
      success: false,
      error: "Error al guardar huella",
      details: error.message,
    });
  }
};

/**
 * VERIFICAR HUELLA DESDE MIDDLEWARE
 * Compara el template capturado con el registrado
 */
export const verificarHuellaDesdeMiddleware = async (req, res) => {
  try {
    const { id_empleado, template_base64 } = req.body;

    console.log("\n" + "=".repeat(70));
    console.log(" VERIFICANDO HUELLA");
    console.log("=".repeat(70));
    console.log(` Empleado ID: ${id_empleado}`);

    if (!id_empleado || !template_base64) {
      return res.status(400).json({
        success: false,
        error: "id_empleado y template_base64 son requeridos",
      });
    }

    // Obtener huella registrada
    const result = await pool.query(
      "SELECT dactilar FROM credenciales WHERE id_empleado = $1",
      [id_empleado]
    );

    if (result.rows.length === 0 || !result.rows[0].dactilar) {
      console.log("[ERROR] No hay huella registrada");
      return res.status(404).json({
        success: false,
        error: "No hay huella registrada para este empleado",
      });
    }

    const huellaRegistrada = result.rows[0].dactilar;
    const huellaCapturada = Buffer.from(template_base64, "base64");

    // NOTA: Esta comparación es EXACTA (byte por byte)
    // En producción, el BiometricMiddleware hace la comparación biométrica real
    const coincide = Buffer.compare(huellaCapturada, huellaRegistrada) === 0;

    console.log(
      `${coincide ? "[OK]" : "[ERROR]"} Resultado: ${
        coincide ? "COINCIDE" : "NO COINCIDE"
      }`
    );
    console.log("=".repeat(70) + "\n");

    res.json({
      success: true,
      verified: coincide,
      message: coincide
        ? "Huella verificada correctamente"
        : "La huella no coincide",
      data: {
        id_empleado: id_empleado,
        match: coincide,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("[ERROR] Error verificando huella:", error);
    res.status(500).json({
      success: false,
      error: "Error al verificar huella",
      details: error.message,
    });
  }
};

/**
 * OBTENER TEMPLATE PARA VERIFICACION
 * Retorna el template en Base64 para que el middleware lo compare
 */
export const obtenerHuellaParaVerificacion = async (req, res) => {
  try {
    const { id_empleado } = req.params;

    console.log(` Obteniendo template para empleado ${id_empleado}`);

    const result = await pool.query(
      "SELECT dactilar FROM credenciales WHERE id_empleado = $1",
      [id_empleado]
    );

    if (result.rows.length === 0 || !result.rows[0].dactilar) {
      return res.status(404).json({
        success: false,
        error: "No hay huella registrada para este empleado",
      });
    }

    const template = result.rows[0].dactilar;
    const base64 = template.toString("base64");

    console.log(`[OK] Template enviado: ${template.length} bytes`);

    res.json({
      success: true,
      data: {
        id_empleado: parseInt(id_empleado),
        template_base64: base64,
        size_bytes: template.length,
      },
    });
  } catch (error) {
    console.error("[ERROR] Error obteniendo template:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener template",
      details: error.message,
    });
  }
};

/**
 * LISTAR USUARIOS CON HUELLA
 * Para poblar el select del componente React
 */
export const listarUsuariosConHuella = async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT
                c.id,
                c.id_empleado,
                e.id_usuario,
                u.nombre,
                u.correo,
                u.foto,
                LENGTH(c.dactilar) as template_size,
                c.fecha_actualizacion
            FROM credenciales c
            INNER JOIN empleado e ON c.id_empleado = e.id
            INNER JOIN usuario u ON e.id_usuario = u.id
            WHERE c.dactilar IS NOT NULL
            ORDER BY u.nombre ASC
        `);

    console.log(` Encontrados ${result.rows.length} usuarios con huella`);

    res.json({
      success: true,
      count: result.rows.length,
      users: result.rows.map((row) => ({
        id_empleado: row.id_empleado,
        id_usuario: row.id_usuario,
        nombre: row.nombre,
        correo: row.correo,
        foto: row.foto,
        template_size: row.template_size,
        fecha_actualizacion: row.fecha_actualizacion,
      })),
    });
  } catch (error) {
    console.error("[ERROR] Error listando usuarios:", error);
    res.status(500).json({
      success: false,
      error: "Error al listar usuarios",
      details: error.message,
    });
  }
};

/**
 * VERIFICAR ESTADO DE HUELLA
 * Verifica si un empleado tiene huella registrada
 */
export const verificarEstadoHuella = async (req, res) => {
  try {
    const { id_empleado } = req.params;

    const result = await pool.query(
      `
            SELECT 
                (dactilar IS NOT NULL) as tiene_huella,
                LENGTH(dactilar) as template_size,
                fecha_actualizacion
            FROM credenciales
            WHERE id_empleado = $1
        `,
      [id_empleado]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        tiene_huella: false,
        message: "No hay credenciales para este empleado",
      });
    }

    res.json({
      success: true,
      tiene_huella: result.rows[0].tiene_huella,
      template_size: result.rows[0].template_size,
      fecha_actualizacion: result.rows[0].fecha_actualizacion,
    });
  } catch (error) {
    console.error("[ERROR] Error verificando estado:", error);
    res.status(500).json({
      success: false,
      error: "Error al verificar estado",
      details: error.message,
    });
  }
};

/**
 * ELIMINAR HUELLA
 */
export const eliminarHuellaEmpleado = async (req, res) => {
  try {
    const { id_empleado } = req.params;

    console.log(` Eliminando huella del empleado ${id_empleado}`);

    const result = await pool.query(
      `
            UPDATE credenciales
            SET dactilar = NULL,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id_empleado = $1
            RETURNING id, id_empleado
        `,
      [id_empleado]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No se encontró credencial para este empleado",
      });
    }

    console.log("[OK] Huella eliminada exitosamente");

    res.json({
      success: true,
      message: "Huella eliminada correctamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("[ERROR] Error eliminando huella:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar huella",
      details: error.message,
    });
  }
};

/**
 * IDENTIFICAR HUELLA (1:N) - Para Login
 * Compara la huella capturada contra TODAS las registradas
 */
export const identificarHuella = async (req, res) => {
  try {
    const { template_base64 } = req.body;

    console.log("\n" + "=".repeat(70));
    console.log(" IDENTIFICACION DE HUELLA (1:N)");
    console.log("=".repeat(70));

    if (!template_base64) {
      return res.status(400).json({
        success: false,
        error: "template_base64 es requerido",
      });
    }

    // Convertir el template capturado a Buffer
    const huellaCapturada = Buffer.from(template_base64, "base64");

    console.log(" TEMPLATE CAPTURADO:");
    console.log(`   - Tamanio: ${huellaCapturada.length} bytes`);
    console.log(`   - Primeros 50 bytes (BYTEA): \\\\x${Buffer.from(huellaCapturada).subarray(0, 50).toString('hex')}`);
    console.log(`   - Base64 (primeros 100 chars): ${template_base64.substring(0, 100)}...`);

    // Obtener TODAS las huellas registradas
    const result = await pool.query(`
            SELECT
                c.id,
                c.id_empleado,
                c.dactilar,
                e.id_usuario,
                u.nombre,
                u.correo
            FROM credenciales c
            INNER JOIN empleado e ON c.id_empleado = e.id
            INNER JOIN usuario u ON e.id_usuario = u.id
            WHERE c.dactilar IS NOT NULL
        `);

    if (result.rows.length === 0) {
      console.log("[ERROR] No hay huellas registradas en el sistema");
      return res.status(404).json({
        success: false,
        error: "No hay huellas registradas en el sistema",
      });
    }

    console.log(`\n Comparando contra ${result.rows.length} huellas registradas...\n`);

    let mejorCoincidencia = null;
    let mejorScore = 0;

    // Comparar contra cada huella registrada
    for (const row of result.rows) {
      try {
        const huellaRegistrada = row.dactilar;

        console.log(`\n Empleado: ${row.nombre} (ID: ${row.id_empleado})`);
        console.log(`   - Tamanio BD: ${huellaRegistrada.length} bytes`);
        console.log(`   - Primeros 50 bytes (BYTEA): \\\\x${Buffer.from(huellaRegistrada).subarray(0, 50).toString('hex')}`);

        // COMPARACIÓN POR SIMILITUD (aproximación simple)
        // NOTA: En producción, usar algoritmo biométrico real (DigitalPersona SDK)

        // Si los tamaños son muy diferentes, no es match
        const sizeDiff = Math.abs(huellaCapturada.length - huellaRegistrada.length);
        const sizeRatio = sizeDiff / Math.max(huellaCapturada.length, huellaRegistrada.length);

        console.log(`   - Diferencia de tamanio: ${sizeDiff} bytes (${(sizeRatio * 100).toFixed(2)}%)`);

        if (sizeRatio > 0.1) {
          // Si la diferencia de tamaño es > 10%, skip
          console.log(`   - Saltando: tamanios muy diferentes`);
          continue;
        }

        // Calcular similitud de bytes
        const minLength = Math.min(huellaCapturada.length, huellaRegistrada.length);
        let bytesCoincidentes = 0;

        for (let i = 0; i < minLength; i++) {
          if (huellaCapturada[i] === huellaRegistrada[i]) {
            bytesCoincidentes++;
          }
        }

        const similitud = (bytesCoincidentes / minLength) * 100;
        console.log(`   - Bytes coincidentes: ${bytesCoincidentes}/${minLength} (${similitud.toFixed(2)}%)`);

        // Threshold de similitud (ajustar según sea necesario)
        const THRESHOLD = 70; // 70% de similitud mínima

        if (similitud >= THRESHOLD) {
          const score = Math.round(similitud);

          if (score > mejorScore) {
            mejorScore = score;
            mejorCoincidencia = {
              id_empleado: row.id_empleado,
              id_usuario: row.id_usuario,
              nombre: row.nombre,
              correo: row.correo,
              score: score,
            };
          }

          console.log(`\n   [OK] MATCH ENCONTRADO: ${row.nombre} (Score: ${score}%)\n`);
        } else {
          console.log(`   - [ERROR] No supera threshold: ${similitud.toFixed(2)}% < ${THRESHOLD}%`);
        }
      } catch (error) {
        console.error(
          ` Error comparando con empleado ${row.id_empleado}:`,
          error
        );
      }
    }

    if (!mejorCoincidencia) {
      console.log("[ERROR] No se encontro coincidencia");
      return res.json({
        success: true,
        verified: false,
        message: "Huella no reconocida en el sistema",
      });
    }

    console.log(
      `[OK] IDENTIFICADO: ${mejorCoincidencia.nombre} (${mejorCoincidencia.score}%)`
    );
    console.log("=".repeat(70) + "\n");

    res.json({
      success: true,
      verified: true,
      id_empleado: mejorCoincidencia.id_empleado,
      id_usuario: mejorCoincidencia.id_usuario,
      nombre: mejorCoincidencia.nombre,
      correo: mejorCoincidencia.correo,
      matchScore: mejorCoincidencia.score,
      message: `Usuario identificado: ${mejorCoincidencia.nombre}`,
    });
  } catch (error) {
    console.error("[ERROR] Error identificando huella:", error);
    res.status(500).json({
      success: false,
      error: "Error al identificar huella",
      details: error.message,
    });
  }
};

/**
 * ESTADISTICAS BIOMETRICAS
 */
export const obtenerEstadisticasBiometricas = async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT 
                COUNT(*) as total_empleados,
                COUNT(c.dactilar) as con_huella,
                COUNT(*) - COUNT(c.dactilar) as sin_huella,
                AVG(LENGTH(c.dactilar)) as tamano_promedio,
                MIN(LENGTH(c.dactilar)) as tamano_minimo,
                MAX(LENGTH(c.dactilar)) as tamano_maximo
            FROM empleado e
            LEFT JOIN credenciales c ON e.id = c.id_empleado
        `);

    const stats = result.rows[0];

    res.json({
      success: true,
      estadisticas: {
        total_empleados: parseInt(stats.total_empleados),
        con_huella: parseInt(stats.con_huella),
        sin_huella: parseInt(stats.sin_huella),
        porcentaje_cobertura:
          stats.total_empleados > 0
            ? ((stats.con_huella / stats.total_empleados) * 100).toFixed(2)
            : 0,
        tamano_promedio: stats.tamano_promedio
          ? parseFloat(stats.tamano_promedio).toFixed(2)
          : 0,
        tamano_minimo: stats.tamano_minimo || 0,
        tamano_maximo: stats.tamano_maximo || 0,
      },
    });
  } catch (error) {
    console.error("[ERROR] Error obteniendo estadisticas:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener estadisticas",
      details: error.message,
    });
  }
};
