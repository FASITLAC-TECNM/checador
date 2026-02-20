/**
 * Rate Limiter simple para proteger autenticación offline
 * Evita ataques de fuerza bruta contra PIN y biometría
 */
class RateLimiter {
    constructor() {
        this.attempts = new Map(); // Guarda { count, blockUntil } por key

        // Configuración por defecto
        this.MAX_ATTEMPTS = 5;       // 5 intentos fallidos
        this.BLOCK_DURATION = 30000; // 30 segundos de bloqueo inicial
    }

    /**
     * Verifica si una clave (ej: 'pin-auth') está bloqueada
     * @param {string} key - Identificador de la acción
     * @returns {object} - { blocked: boolean, remainingMs: number }
     */
    check(key) {
        const record = this.attempts.get(key);

        if (!record) return { blocked: false, remainingMs: 0 };

        if (record.blockUntil && Date.now() < record.blockUntil) {
            return {
                blocked: true,
                remainingMs: record.blockUntil - Date.now()
            };
        }

        // Si ya pasó el tiempo de bloqueo, limpiar
        if (record.blockUntil && Date.now() >= record.blockUntil) {
            this.attempts.delete(key);
        }

        return { blocked: false, remainingMs: 0 };
    }

    /**
     * Registra un intento fallido
     * @param {string} key 
     */
    registerFailure(key) {
        let record = this.attempts.get(key) || { count: 0, blockUntil: 0 };

        record.count++;

        if (record.count >= this.MAX_ATTEMPTS) {
            // Bloqueo exponencial: 30s, 60s, 120s...
            const multiplier = Math.pow(2, record.count - this.MAX_ATTEMPTS);
            const duration = this.BLOCK_DURATION * multiplier;

            record.blockUntil = Date.now() + duration;
            console.warn(`[Security] ${key} bloqueado por ${duration / 1000}s debido a demasiados intentos fallidos.`);
        }

        this.attempts.set(key, record);

        return {
            blocked: record.blockUntil > 0,
            attempts: record.count,
            remainingAttempts: Math.max(0, this.MAX_ATTEMPTS - record.count)
        };
    }

    /**
     * Resetea el contador tras un éxito
     * @param {string} key 
     */
    reset(key) {
        this.attempts.delete(key);
    }
}

export const rateLimiter = new RateLimiter();
