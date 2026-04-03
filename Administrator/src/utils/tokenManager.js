/**
 * Gestor centralizado de tokens de autenticación
 */

export const tokenManager = {
    /**
     * Guarda el token con tiempo de expiración
     * @param {string} token - Token JWT
     * @param {number} expiresIn - Tiempo de expiración en segundos
     */
    setToken(token, expiresIn = 86400) { // Default: 24 horas
        const expiryTime = Date.now() + expiresIn * 1000;
        localStorage.setItem('auth_token', token);
        localStorage.setItem('token_expiry', expiryTime.toString());
    },

    /**
     * Obtiene el token si no ha expirado
     * @returns {string|null} - Token válido o null
     */
    getToken() {
        const token = localStorage.getItem('auth_token');
        const expiry = localStorage.getItem('token_expiry');

        if (!token || !expiry) return null;

        if (Date.now() > parseInt(expiry)) {
            this.clearToken();
            return null;
        }

        return token;
    },

    /**
     * Limpia todos los datos de autenticación
     */
    clearToken() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token_expiry');
        localStorage.removeItem('user_data');
    },

    /**
     * Verifica si el token ha expirado
     * @returns {boolean}
     */
    isExpired() {
        const expiry = localStorage.getItem('token_expiry');
        return expiry ? Date.now() > parseInt(expiry) : true;
    },

    /**
     * Obtiene el tiempo restante hasta la expiración en segundos
     * @returns {number} - Segundos restantes o 0 si expiró
     */
    getTimeToExpiry() {
        const expiry = localStorage.getItem('token_expiry');
        if (!expiry) return 0;

        const remaining = parseInt(expiry) - Date.now();
        return Math.max(0, Math.floor(remaining / 1000));
    },

    /**
     * Actualiza el token guardando el nuevo
     * @param {string} newToken - Nuevo token
     * @param {number} expiresIn - Tiempo de expiración en segundos
     */
    refreshToken(newToken, expiresIn = 86400) {
        this.setToken(newToken, expiresIn);
    }
};
