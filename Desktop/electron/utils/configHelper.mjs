import { app } from "electron";
import path from "path";
import fs from "fs";

/**
 * Gestión de configuración persistente en archivo
 * La configuración se guarda en la carpeta de datos de usuario de la aplicación
 */
export const getConfigPath = () => {
    return path.join(app.getPath("userData"), "app-config.json");
};

/**
 * Obtiene el valor de una configuración.
 * @param {string} key - Clave de configuración
 * @param {any} defaultValue - Valor por defecto si no existe
 * @returns {any} Valor de la configuración
 */
export function getConfig(key, defaultValue = null) {
    try {
        const configPath = getConfigPath();
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, "utf8");
            const config = JSON.parse(data);
            return config[key] !== undefined ? config[key] : defaultValue;
        }
    } catch (error) {
        console.error(`Error reading config key ${key}:`, error);
    }
    return defaultValue;
}

/**
 * Guarda un valor en la configuración.
 * @param {string} key - Clave de configuración
 * @param {any} value - Valor a guardar
 */
export function setConfig(key, value) {
    try {
        const configPath = getConfigPath();
        let config = {};

        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, "utf8");
            try {
                config = JSON.parse(data);
            } catch (e) {
                // Si falla el parseo, iniciamos con objeto vacío
            }
        }

        config[key] = value;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
        return true;
    } catch (error) {
        console.error(`Error writing config key ${key}:`, error);
        return false;
    }
}

/**
 * Función auxiliar para obtener la URL del backend
 */
export function getBackendUrl() {
    return getConfig("backendUrl", "https://9dm7dqf9-3002.usw3.devtunnels.ms").replace(/\/$/, "");
}
