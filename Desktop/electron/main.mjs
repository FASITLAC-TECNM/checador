/**
 * Proceso principal de Electron
 * Este archivo maneja la ventana de la aplicación y la comunicación con el sistema
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// Función para crear la ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.mjs')
    },
    frame: true,
    backgroundColor: '#ffffff',
    show: false, // No mostrar hasta que esté listo
    autoHideMenuBar: true, // Ocultar el menú automáticamente
  });

  // Cargar la aplicación
  if (process.env.NODE_ENV === 'development') {
    // En desarrollo, cargar desde el servidor de desarrollo de Vite
    mainWindow.loadURL('http://localhost:5173');
    // Abrir DevTools solo si se necesita para debugging
    // mainWindow.webContents.openDevTools();
  } else {
    // En producción, cargar el archivo index.html compilado
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Mostrar cuando esté listo para evitar flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Este método se llamará cuando Electron haya terminado la inicialización
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // En macOS es común recrear una ventana cuando se hace clic en el icono del dock
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Salir cuando todas las ventanas estén cerradas, excepto en macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// ===== IPC Handlers =====

/**
 * Obtener información del sistema
 */
ipcMain.handle('get-system-info', async () => {
  try {
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = 'No detectada';
    let macAddress = 'No detectada';

    // Buscar la primera interfaz IPv4 que no sea localhost
    for (const name of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
          ipAddress = net.address;
          macAddress = net.mac.toUpperCase();
          break;
        }
      }
      if (ipAddress !== 'No detectada') break;
    }

    // Formatear el nombre del sistema operativo de forma más amigable
    let osName = os.type();
    const release = os.release();

    if (osName === 'Windows_NT') {
      // Detectar versión de Windows basado en el build number
      const buildNumber = parseInt(release.split('.')[2] || '0');
      if (buildNumber >= 22000) {
        osName = 'Windows 11';
      } else if (buildNumber >= 10240) {
        osName = 'Windows 10';
      } else {
        osName = 'Windows';
      }
    } else if (osName === 'Darwin') {
      osName = 'macOS';
    }

    return {
      ipAddress,
      macAddress,
      operatingSystem: osName,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      totalMemory: `${Math.round(os.totalmem() / (1024 ** 3))} GB`,
      freeMemory: `${Math.round(os.freemem() / (1024 ** 3))} GB`,
      cpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'No disponible',
      uptime: Math.floor(os.uptime() / 3600), // horas
    };
  } catch (error) {
    console.error('Error obteniendo información del sistema:', error);
    return {
      error: 'No se pudo obtener la información del sistema',
    };
  }
});

/**
 * Obtener información de red detallada
 */
ipcMain.handle('get-network-info', async () => {
  try {
    const networkInterfaces = os.networkInterfaces();
    const interfaces = [];

    for (const [name, nets] of Object.entries(networkInterfaces)) {
      for (const net of nets) {
        interfaces.push({
          name,
          family: net.family,
          address: net.address,
          mac: net.mac,
          internal: net.internal,
          cidr: net.cidr,
        });
      }
    }

    return interfaces;
  } catch (error) {
    console.error('Error obteniendo información de red:', error);
    return [];
  }
});

/**
 * Minimizar ventana
 */
ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

/**
 * Maximizar/Restaurar ventana
 */
ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  }
});

/**
 * Cerrar ventana
 */
ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

/**
 * Obtener si la ventana está maximizada
 */
ipcMain.handle('is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});
