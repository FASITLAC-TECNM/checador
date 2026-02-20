/**
 * Proceso principal de Electron
 * Este archivo maneja la ventana de la aplicación y la comunicación con el sistema
 */

import { app, globalShortcut, BrowserWindow, session } from "electron";
import path from "path";
import { fileURLToPath } from "url";

// Offline-First modules
import syncManager from "./offline/syncManager.mjs";

// Services & Managers
import * as biometricService from "./services/biometricService.mjs";
import * as networkService from "./services/networkService.mjs";
import * as windowManager from "./managers/windowManager.mjs";
import * as ipcManager from "./managers/ipcManager.mjs";
import * as systemKioskManager from "./managers/systemKioskManager.mjs";
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

  // ============================================================
  // CONTENT SECURITY POLICY
  // Controla qué recursos puede cargar la app. Protege contra XSS.
  // ============================================================
  const isDev = process.env.NODE_ENV === "development";

  // Orígenes permitidos para scripts y conexiones de red
  // Usar configHelper para obtener la URL del backend
  const backendOrigin = configHelper.getBackendUrl().replace(/\/$/, "");
  const viteDevOrigin = isDev ? "http://localhost:5173 ws://localhost:5173" : "";

  // CSP diferente para dev (necesita 'unsafe-eval' para Vite HMR) y prod
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' blob: ${viteDevOrigin}`
    : `'self' blob:`;

  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,                                          // JS permitido
    `style-src 'self' 'unsafe-inline'`,                                 // CSS inline (React/inyección de estilos)
    `img-src 'self' data: blob: ${backendOrigin} https://www.google.com https://www.cloudflare.com`, // Imágenes + Pings de conectividad
    `media-src 'self' blob:`,                                           // Cámara / video
    `connect-src 'self' ${backendOrigin} ws://localhost:* ${viteDevOrigin} https://www.google.com https://www.cloudflare.com`, // Fetch / WebSocket
    `font-src 'self' data:`,                                            // Fuentes locales
    `object-src 'none'`,                                                // Bloquear plugins (Flash, etc.)
    `base-uri 'self'`,                                                  // Bloquear base tag injection
    `form-action 'self'`,                                               // Formularios solo a sí mismo
    `frame-ancestors 'none'`,                                           // No puede ser embebido en frame
  ].join("; ");

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });

  console.log("🔒 [Security] CSP configurado correctamente");

  // Iniciar monitoreo de red
  networkService.startMonitoring(mainWindow);

  // ==========================================
  // CONFIGURACIÓN AUTOMÁTICA DE KIOSCO (PRIMER INICIO)
  // ==========================================
  if (process.env.NODE_ENV !== "development") {
    const isKioskSetupDone = configHelper.getConfig("kioskSetupDone", false);

    if (!isKioskSetupDone) {
      console.log("🛠️ [Main] Detectado primer inicio en producción. Ejecutando setup de Kiosco...");
      // Ejecutar setup (async) sin bloquear la interfaz
      systemKioskManager.setupKioskSystem().then((result) => {
        // Marcar como hecho si al menos una cosa funcionó
        // (Aunque falle TaskMgr por permisos, no queremos reintentar infinitamente en cada inicio si no es admin)
        configHelper.setConfig("kioskSetupDone", true);
        console.log("✅ [Main] Setup de Kiosco finalizado. Flags actualizadas.");
      }).catch(err => {
        console.error("❌ [Main] Error crítico en setup de Kiosco:", err);
      });
    }
  }

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
  networkService.stopMonitoring();
  syncManager.destroy();
});
