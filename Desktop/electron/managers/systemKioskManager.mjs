/**
 * SystemKioskManager — Gestión de configuraciones del sistema operativo para Modo Kiosco
 * Automatiza:
 * 1. Arranque automático con Windows
 * 2. Deshabilitación del Administrador de Tareas (requiere permisos de Administrador)
 */

import { app } from "electron";
import { exec } from "child_process";
import util from "util";
import path from "path";
import * as configHelper from "../utils/configHelper.mjs";

const execPromise = util.promisify(exec);

// Claves de Registro para Task Manager
const REG_KEY_POLICIES = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System";
const REG_VALUE_TASKMGR = "DisableTaskMgr";

/**
 * Configura el arranque automático de la aplicación al iniciar sesión en Windows
 * @param {boolean} enable - true para activar, false para desactivar
 */
export function configureAutoLaunch(enable = true) {
    try {
        const appPath = app.getPath("exe");

        console.log(`⚙️ [Kiosk] Configurando auto-launch: ${enable}`);

        app.setLoginItemSettings({
            openAtLogin: enable,
            path: appPath,
            args: [
                '--kiosk-mode' // Argumento opcional para detectar arranque auto
            ]
        });

        configHelper.setConfig("autoLaunch", enable);
        return { success: true, enabled: enable };
    } catch (error) {
        console.error("❌ [Kiosk] Error configurando auto-launch:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Habilita o deshabilita el Administrador de Tareas de Windows modificando el registro
 * REQUIERE EJECUCIÓN COMO ADMINISTRADOR
 * @param {boolean} disable - true para BLOQUEAR (deshabilitar), false para PERMITIR
 */
export async function configureTaskManager(disable = true) {
    try {
        console.log(`⚙️ [Kiosk] Configurando Task Manager: ${disable ? 'BLOQUEADO' : 'PERMITIDO'}`);

        if (disable) {
            // Agregar valor al registro: DisableTaskMgr = 1
            // /f fuerza la sobrescritura sin preguntar
            const command = `REG ADD "${REG_KEY_POLICIES}" /v ${REG_VALUE_TASKMGR} /t REG_DWORD /d 1 /f`;
            await execPromise(command);
        } else {
            // Eliminar valor del registro
            const command = `REG DELETE "${REG_KEY_POLICIES}" /v ${REG_VALUE_TASKMGR} /f`;
            await execPromise(command);
        }

        configHelper.setConfig("disableTaskMgr", disable);
        return { success: true, disabled: disable };
    } catch (error) {
        console.error("❌ [Kiosk] Error configurando Task Manager (¿Faltan permisos de Admin?):", error.message);
        return { success: false, error: error.message, requiresAdmin: true };
    }
}

/**
 * Ejecuta la configuración completa del sistema para kiosco
 * Recomendado para correr en el primer inicio o instalación
 */
export async function setupKioskSystem() {
    console.log("🚀 [Kiosk] Iniciando setup automático del sistema...");

    // 1. Auto Launch
    const autoLaunch = configureAutoLaunch(true);
    if (autoLaunch.success) {
        console.log("✅ [Kiosk] Arranque automático activado");
    } else {
        console.warn("⚠️ [Kiosk] Falló configuración de arranque automático");
    }

    // 2. Disable Task Manager
    // Intentamos bloquearlo. Si falla (por permisos), no rompemos la app, solo avisamos.
    const taskMgr = await configureTaskManager(true);
    if (taskMgr.success) {
        console.log("✅ [Kiosk] Administrador de Tareas bloqueado");
    } else {
        console.warn("⚠️ [Kiosk] No se pudo bloquear Task Manager. Ejecuta la app como Administrador.");
    }

    return {
        autoLaunch: autoLaunch.success,
        taskManagerDisabled: taskMgr.success
    };
}

export default {
    configureAutoLaunch,
    configureTaskManager,
    setupKioskSystem
};
