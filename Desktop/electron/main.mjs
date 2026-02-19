/**
 * Proceso principal de Electron
 * Este archivo maneja la ventana de la aplicación y la comunicación con el sistema
 */

import { app, globalShortcut, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";

// Offline-First modules
import syncManager from "./offline/syncManager.mjs";

// Services & Managers
import * as biometricService from "./services/biometricService.mjs";
import * as windowManager from "./managers/windowManager.mjs";
import * as ipcManager from "./managers/ipcManager.mjs";
import * as configHelper from "./utils/configHelper.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// INICIALIZACIÓN
// ==========================================

// Suprimir logs de errores internos de Chromium
app.commandLine.appendSwitch("log-level", "3");

// Este método se llamará cuando Electron haya terminado la inicialización
app.whenReady().then(() => {

  const ALLOW_DEV_TOOLS = windowManager.ALLOW_DEV_TOOLS;

  // Registrar atajos SOLO si NO se permiten herramientas de desarrollo
  if (!ALLOW_DEV_TOOLS) {
    // 1. Bloquear F12 y Ctrl+Shift+I (DevTools)
    globalShortcut.register('F12', () => {
      console.log('F12 bloqueado por política de seguridad');
    });

    globalShortcut.register('CommandOrControl+Shift+I', () => {
      console.log('DevTools bloqueado por política de seguridad');
    });

    // 2. Bloquear recarga forzada (opcional, evita Ctrl+R)
    globalShortcut.register('CommandOrControl+R', () => {
      console.log('Recarga bloqueada');
    });
  }

  // Comando secreto para cerrar la APP: Ctrl + Shift + Q
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });

  // Comando secreto para minimizar (útil para mantenimiento): Ctrl + Shift + M
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    windowManager.minimizeWindow();
  });

  // Iniciar el BiometricMiddleware
  biometricService.startBiometricMiddleware();

  // Registrar manejadores IPC
  ipcManager.registerIpcHandlers();

  // Crear la ventana principal
  const mainWindow = windowManager.createWindow();

  // Inicializar sistema Offline-First
  try {
    const apiBaseUrl = configHelper.getBackendUrl();
    syncManager.init({
      apiBaseUrl,
      authToken: '', // Se actualizará cuando el usuario inicie sesión
      window: mainWindow,
    });
    // Asumir online inicialmente, el renderer confirmará
    syncManager.setOnlineStatus(true);
    syncManager.startPeriodicSync();
    console.log('🚀 [Main] Sistema Offline-First inicializado');
  } catch (error) {
    console.error('❌ [Main] Error inicializando sistema offline:', error);
  }

  app.on("activate", function () {
    // En macOS es común recrear una ventana cuando se hace clic en el icono del dock
    if (BrowserWindow.getAllWindows().length === 0) windowManager.createWindow();
  });
});

// Salir cuando todas las ventanas estén cerradas, excepto en macOS
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    // Detener el BiometricMiddleware antes de salir
    biometricService.stopBiometricMiddleware();
    app.quit();
  }
});

// Detener el BiometricMiddleware y limpiar recursos offline cuando la app se cierre
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  biometricService.stopBiometricMiddleware();
  syncManager.destroy();
});
