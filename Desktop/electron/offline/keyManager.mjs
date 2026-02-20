import { createHash, pbkdf2Sync } from 'node:crypto';
import { machineIdSync } from 'node-machine-id';

const SALT = 'checador-biometric-salt-v1';
const ITERATIONS = 100_000;

let derivedKey = null;

export function initKey() {
    if (derivedKey) return derivedKey;

    // machineId = hash SHA-256 del serial del disco + UUID del hardware
    let machineId;
    try {
        machineId = machineIdSync(true); // true = hash el ID real
    } catch (error) {
        console.warn('[KeyManager] node-machine-id falló o no está instalado, usando fallback:', error.message);
        // Fallback si no está disponible o falla el require
        const fallbackId = (process.env.COMPUTERNAME || 'unknown-pc') +
            (process.env.PROCESSOR_IDENTIFIER || 'unknown-cpu') +
            (process.env.USERNAME || 'unknown-user');

        machineId = createHash('sha256')
            .update(fallbackId)
            .digest('hex');
    }

    // Derivar clave de 32 bytes (256 bits) usando PBKDF2
    derivedKey = pbkdf2Sync(machineId, SALT, ITERATIONS, 32, 'sha512');
    console.log('[KeyManager] Clave de cifrado derivada exitosamente');

    return derivedKey;
}

export function getKey() {
    if (!derivedKey) throw new Error('KeyManager no inicializado. Llame a initKey() primero.');
    return derivedKey;
}
