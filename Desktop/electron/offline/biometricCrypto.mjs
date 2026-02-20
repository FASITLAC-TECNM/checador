import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;   // 96 bits óptimo para GCM
const TAG_LEN = 16;  // 128 bits tag

let _key = null;

export function setKey(key) {
    if (!Buffer.isBuffer(key) || key.length !== 32) {
        // Aceptar Uint8Array (ej: retorno de pbkdf2)
        if (key instanceof Uint8Array && key.byteLength === 32) {
            _key = Buffer.from(key);
            return;
        }
        throw new Error('La clave debe ser un Buffer de 32 bytes');
    }
    _key = key;
}

/**
 * Cifra un buffer o string
 * @param {Buffer|Uint8Array|string|null} data 
 * @returns {Buffer|null} [IV(12) | TAG(16) | CIPHERTEXT]
 */
export function encryptField(data) {
    if (data === null || data === undefined) return null;
    if (!_key) throw new Error('Clave biometricCrypto no inicializada');

    let plainBuf;
    if (typeof data === 'string') {
        plainBuf = Buffer.from(data, 'utf8');
    } else {
        plainBuf = Buffer.from(data);
    }

    if (plainBuf.length === 0) return null;

    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, _key, iv);

    const encrypted = Buffer.concat([cipher.update(plainBuf), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Formato: IV + TAG + CIPHERTEXT
    return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Descifra datos
 * @param {Buffer|Uint8Array|null} data 
 * @returns {Buffer|null} Buffer descifrado
 */
export function decryptField(data) {
    if (data === null || data === undefined) return null;
    if (!_key) throw new Error('Clave biometricCrypto no inicializada');

    const buf = Buffer.from(data);

    // Si es muy corto, no es un cifrado válido (IV+TAG mínimo son 28 bytes)
    if (buf.length < IV_LEN + TAG_LEN) {
        // Puede ser dato legacy no cifrado o basura.
        // Devolvemos tal cual para permitir transición suave si hay mix de datos.
        return buf;
    }

    try {
        const iv = buf.subarray(0, IV_LEN);
        const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
        const ct = buf.subarray(IV_LEN + TAG_LEN);

        const decipher = createDecipheriv(ALGO, _key, iv);
        decipher.setAuthTag(tag);

        return Buffer.concat([decipher.update(ct), decipher.final()]);
    } catch (error) {
        console.error('[BiometricCrypto] Error descifrando:', error.message);
        // Si falla el tag, es manipulación o clave incorrecta.
        // Intentar devolver como legacy si falla? No, si falla el tag es peligroso.
        // Pero si el error es 'Unsupported state' podría ser que no estaba cifrado y casualmente parecía sello.
        // Asumimos que si falla crypto, devolvemos null o el buffer original?
        // Mejor null para seguridad.
        return null;
    }
}
