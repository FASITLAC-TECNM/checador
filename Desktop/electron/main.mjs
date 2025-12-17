/**
 * Proceso principal de Electron
 * Este archivo maneja la ventana de la aplicación y la comunicación con el sistema
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// Desactivar aceleración de hardware GPU para evitar errores en Windows
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');

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
      preload: path.join(__dirname, 'preload.cjs'),
      enableWebSQL: false,
      v8CacheOptions: 'code',
      // Mejorar rendimiento de video
      backgroundThrottling: false,
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
    // En producción, cargar el archivo index.html compilado desde la app empaquetada
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    console.log('📂 Cargando desde:', indexPath);
    console.log('📂 App path:', app.getAppPath());

    mainWindow.loadFile(indexPath).catch(err => {
      console.error('❌ Error cargando index.html:', err);
    });

    // Abrir DevTools en producción para ver errores
    mainWindow.webContents.openDevTools();
  }

  // Mostrar cuando esté listo para evitar flash
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Ventana lista para mostrar');
    mainWindow.show();
  });

  // Log de errores de carga
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Error de carga:', errorCode, errorDescription);
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

/**
 * Gestión de configuración persistente en archivo
 * La configuración se guarda en la carpeta de datos de usuario de la aplicación
 */
const getConfigPath = () => {
  return path.join(app.getPath('userData'), 'app-config.json');
};

/**
 * Leer configuración desde archivo
 */
ipcMain.handle('config-get', async (event, key) => {
  try {
    const configPath = getConfigPath();

    // Si el archivo no existe, retornar null
    if (!fs.existsSync(configPath)) {
      return null;
    }

    // Leer el archivo
    const data = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(data);

    return key ? config[key] : config;
  } catch (error) {
    console.error('Error leyendo configuración:', error);
    return null;
  }
});

/**
 * Guardar configuración en archivo
 */
ipcMain.handle('config-set', async (event, key, value) => {
  try {
    const configPath = getConfigPath();
    let config = {};

    // Si el archivo existe, leer la configuración actual
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(data);
    }

    // Actualizar el valor
    config[key] = value;

    // Asegurar que el directorio existe
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Guardar el archivo
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    return true;
  } catch (error) {
    console.error('Error guardando configuración:', error);
    return false;
  }
});

/**
 * Eliminar una clave de configuración
 */
ipcMain.handle('config-remove', async (event, key) => {
  try {
    const configPath = getConfigPath();

    if (!fs.existsSync(configPath)) {
      return true;
    }

    const data = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(data);

    delete config[key];

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    return true;
  } catch (error) {
    console.error('Error eliminando configuración:', error);
    return false;
  }
});

// ===== Reconocimiento Facial =====

/**
 * Calcular distancia euclidiana entre dos descriptores faciales
 * @param {Array} descriptor1 - Primer descriptor (128 dimensiones)
 * @param {Array} descriptor2 - Segundo descriptor (128 dimensiones)
 * @returns {number} - Distancia euclidiana
 */
function calculateEuclideanDistance(descriptor1, descriptor2) {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Los descriptores deben tener la misma longitud');
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Función auxiliar para obtener la URL del backend
 */
function getBackendUrl() {
  const configPath = getConfigPath();
  // URL por defecto - Dev Tunnel
  let backendUrl = 'https://9dm7dqf9-3001.usw3.devtunnels.ms';

  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(data);
      backendUrl = config.backendUrl || backendUrl;
    }
  } catch (error) {
    console.error('⚠️ Error leyendo configuración, usando URL por defecto:', error);
  }

  // Eliminar barra final si existe
  return backendUrl.replace(/\/$/, '');
}

/**
 * Verificar usuario por reconocimiento facial
 * Recibe un descriptor facial y lo compara con todos los registrados en la DB
 */
ipcMain.handle('verificar-usuario', async (event, descriptor) => {
  try {
    console.log('🔍 Verificando usuario por reconocimiento facial...');

    const backendUrl = getBackendUrl();
    console.log(`📡 Conectando a: ${backendUrl}`);

    // Obtener todos los descriptores faciales de la base de datos
    const response = await fetch(`${backendUrl}/api/credenciales/descriptores`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }

    const credenciales = await response.json();
    console.log(`📊 Comparando con ${credenciales.length} descriptores en la BD...`);

    if (credenciales.length === 0) {
      return {
        success: false,
        message: 'No hay descriptores faciales registrados en la base de datos',
      };
    }

    // Comparar el descriptor recibido con cada uno de la base de datos
    const THRESHOLD = 0.6; // Umbral de similitud (< 0.6 es una buena coincidencia)
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const credencial of credenciales) {
      if (!credencial.descriptor_facial) continue;

      // El descriptor viene como array de números desde la BD
      const storedDescriptor = credencial.descriptor_facial;
      const distance = calculateEuclideanDistance(descriptor, storedDescriptor);

      console.log(`Comparando con empleado ${credencial.empleado_id}: distancia = ${distance.toFixed(4)}`);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = credencial;
      }
    }

    if (bestMatch && bestDistance < THRESHOLD) {
      console.log(`✅ Usuario identificado: ${bestMatch.empleado_id} (distancia: ${bestDistance.toFixed(4)})`);

      // Obtener información del empleado
      const empleadoResponse = await fetch(`${backendUrl}/api/empleados/${bestMatch.empleado_id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!empleadoResponse.ok) {
        throw new Error(`Error obteniendo datos del empleado: ${empleadoResponse.status}`);
      }

      const empleado = await empleadoResponse.json();

      return {
        success: true,
        empleado: empleado,
        distancia: bestDistance,
        message: 'Usuario identificado correctamente',
      };
    } else {
      console.log(`❌ No se encontró coincidencia (mejor distancia: ${bestDistance.toFixed(4)})`);
      return {
        success: false,
        message: 'Rostro no identificado',
        distancia: bestDistance,
      };
    }
  } catch (error) {
    console.error('❌ Error verificando usuario:', error);
    return {
      success: false,
      message: `Error de conexión: ${error.message}`,
      error: error.toString(),
    };
  }
});

/**
 * Registrar asistencia con reconocimiento facial
 * Verifica el usuario y registra su asistencia
 */
ipcMain.handle('registrar-asistencia-facial', async (event, empleadoId) => {
  try {
    console.log(`📝 Registrando asistencia para empleado ${empleadoId}...`);

    const backendUrl = getBackendUrl();
    console.log(`📡 Conectando a: ${backendUrl}`);

    // Registrar la asistencia
    const response = await fetch(`${backendUrl}/api/asistencia/registrar-facial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        id_empleado: empleadoId,
        tipo: 'Entrada', // Por defecto registramos entrada
        metodo_registro: 'Facial',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Respuesta del servidor:', errorText);
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Asistencia registrada exitosamente');

    return {
      success: true,
      message: 'Asistencia registrada correctamente',
      data: result,
    };
  } catch (error) {
    console.error('❌ Error registrando asistencia:', error);
    return {
      success: false,
      message: `Error de conexión: ${error.message}`,
      error: error.toString(),
    };
  }
});

/**
 * Registrar descriptor facial para un empleado
 * Convierte el Float32Array a Buffer y lo guarda en la DB como BYTEA
 */
ipcMain.handle('registrar-descriptor-facial', async (event, empleadoId, descriptor) => {
  try {
    console.log(`💾 Registrando descriptor facial para empleado ${empleadoId}...`);

    const backendUrl = getBackendUrl();
    console.log(`📡 Conectando a: ${backendUrl}`);

    // Verificar que el descriptor sea válido
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length === 0) {
      throw new Error('Descriptor facial inválido');
    }

    console.log(`📊 Descriptor: ${descriptor.length} dimensiones`);

    // Enviar el descriptor al backend para guardarlo
    const response = await fetch(`${backendUrl}/api/credenciales/descriptor-facial/${empleadoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ descriptor }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Respuesta del servidor:', errorText);
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Descriptor facial guardado exitosamente');

    return {
      success: true,
      message: 'Descriptor facial registrado correctamente',
      data: result,
    };
  } catch (error) {
    console.error('❌ Error registrando descriptor facial:', error);
    return {
      success: false,
      message: `Error de conexión: ${error.message}`,
      error: error.toString(),
    };
  }
});