/**
 * OfflineAuthService — Servicio de autenticación contra la caché local SQLite (Mobile)
 * Valida PIN, huella y facial cuando no hay conexión al servidor.
 * Archivo .mjs — ES Module
 *
 * Adaptado de Desktop.
 */

import sqliteManager from './sqliteManager.mjs';

// ============================================================
// HELPERS
// ============================================================

/**
 * Calcula distancia euclidiana entre dos descriptores faciales
 * @param {Array|Float32Array} desc1
 * @param {Array|Float32Array} desc2
 * @returns {number}
 */
function calcularDistanciaEuclidiana(desc1, desc2) {
    if (desc1.length !== desc2.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        const diff = desc1[i] - desc2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

/**
 * Convierte un BLOB/Base64 a Float32Array
 */
function bufferToFloat32Array(data) {
    if (!data) return null;

    try {
        if (data instanceof Float32Array) return data;
        if (Array.isArray(data)) return new Float32Array(data);

        if (typeof data === 'string') {
            try {
                // Intentar parsear como JSON (array de números)
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) return new Float32Array(parsed);
            } catch (e) {
                // Si no es JSON, es Base64
                const binaryString = atob(data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return new Float32Array(bytes.buffer);
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

// ============================================================
// IDENTIFICACIÓN OFFLINE
// ============================================================

export async function identificarPorPinOffline(pinIngresado) {
    try {
        const credenciales = await sqliteManager.getAllCredenciales();

        if (!credenciales || credenciales.length === 0) {
            return null;
        }

        // FIX: SQLite puede devolver pin_hash como número (INTEGER) aunque fue
        // guardado como string. String() en ambos lados evita que === falle.
        const pinStr = String(pinIngresado).trim();

        for (const cred of credenciales) {
            if (!cred.pin_hash && cred.pin_hash !== 0) continue;

            if (String(cred.pin_hash).trim() === pinStr) {
                const empleado = await sqliteManager.getEmpleado(cred.empleado_id);
                if (empleado && empleado.estado_cuenta === 'activo') {
                    return {
                        empleado_id: cred.empleado_id,
                        nombre: empleado.nombre || cred.nombre,
                        usuario_id: empleado.usuario_id,
                        metodo: 'PIN',
                    };
                }
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

export async function identificarPorFacialOffline(descriptorCapturado, umbral = 0.45) {
    try {
        const credenciales = await sqliteManager.getAllCredenciales();
        const conFacial = credenciales.filter(c => c.facial_descriptor);

        if (conFacial.length === 0) {
            return null;
        }

        let bestMatch = null;
        let bestDistance = Infinity;

        for (const cred of conFacial) {
            const storedDescriptor = bufferToFloat32Array(cred.facial_descriptor);
            if (!storedDescriptor || storedDescriptor.length === 0) continue;

            const distance = calcularDistanciaEuclidiana(
                Array.from(descriptorCapturado),
                Array.from(storedDescriptor)
            );

            if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = cred;
            }
        }

        if (bestMatch && bestDistance < umbral) {
            const empleado = await sqliteManager.getEmpleado(bestMatch.empleado_id);

            return {
                empleado_id: bestMatch.empleado_id,
                nombre: empleado?.nombre || bestMatch.nombre,
                usuario_id: empleado?.usuario_id,
                distancia: bestDistance,
                metodo: 'FACIAL',
            };
        }

        return null;
    } catch (error) {
        return null;
    }
}

export async function cargarDatosOffline(empleadoId) {
    try {
        const [horario, tolerancia, registrosHoy] = await Promise.all([
            sqliteManager.getHorario(empleadoId),
            sqliteManager.getTolerancia(empleadoId),
            sqliteManager.getRegistrosHoy(empleadoId),
        ]);

        return {
            horario: horario ? {
                id: horario.horario_id,
                configuracion: horario.configuracion,
                es_activo: horario.es_activo,
            } : null,
            tolerancia: tolerancia,
            registrosHoy: registrosHoy || [],
        };
    } catch (error) {
        return { horario: null, tolerancia: null, registrosHoy: [] };
    }
}

export default {
    identificarPorPinOffline,
    identificarPorFacialOffline,
    cargarDatosOffline,
};
