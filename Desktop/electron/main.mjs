/**
 * Proceso principal de Electron
 * Este archivo maneja la ventana de la aplicación y la comunicación con el sistema
 */

import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import os from "os";
import fs from "fs";
import { fileURLToPath } from "url";
import { spawn, execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

/**
 * Obtiene la ruta del BiometricMiddleware según el entorno
 * En desarrollo: electron/BiometricMiddleware/bin/
 * En producción: resources/BiometricMiddleware/
 */
function getBiometricPath() {
  if (app.isPackaged) {
    // Producción: extraResources se copia a resources/BiometricMiddleware
    return path.join(process.resourcesPath, "BiometricMiddleware");
  } else {
    // Desarrollo: ruta relativa al archivo main.mjs
    return path.join(__dirname, "BiometricMiddleware", "bin");
  }
}
let biometricProcess = null;

// Suprimir logs de errores internos de Chromium (GPU, video capture, etc.)
app.commandLine.appendSwitch("log-level", "3");

/**
 * Función para compilar el BiometricMiddleware si no existe el ejecutable
 * @returns {boolean} - true si el ejecutable existe o se compiló correctamente
 */
function buildBiometricMiddlewareIfNeeded() {
  const biometricDir = getBiometricPath();
  const middlewarePath = path.join(biometricDir, "BiometricMiddleware.exe");

  // Si ya existe el ejecutable, no hacer nada
  if (fs.existsSync(middlewarePath)) {
    return true;
  }

  // En producción, el ejecutable debe existir en extraResources
  if (app.isPackaged) {
    console.error("[ERROR] BiometricMiddleware.exe no encontrado en producción:", middlewarePath);
    return false;
  }

  console.log("[BIOMETRIC] Compilando BiometricMiddleware...");

  const middlewareDir = path.join(__dirname, "BiometricMiddleware");

  // Verificar que existe el proyecto
  const csprojPath = path.join(middlewareDir, "BiometricMiddleware.csproj");
  if (!fs.existsSync(csprojPath)) {
    console.error("[ERROR] BiometricMiddleware.csproj no encontrado en:", csprojPath);
    return false;
  }

  try {

    // Ejecutar dotnet build directamente
    execSync("dotnet build BiometricMiddleware.csproj -c Release -p:Platform=x86", {
      cwd: middlewareDir,
      stdio: "inherit",
      encoding: "utf8",
    });

    // Crear carpeta bin si no existe
    const binDir = path.join(middlewareDir, "bin");
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    // Copiar ejecutable y DLLs (x86 porque se compila con Platform=x86)
    const releaseDir = path.join(middlewareDir, "bin", "x86", "Release", "net48");
    const exeSrc = path.join(releaseDir, "BiometricMiddleware.exe");

    if (fs.existsSync(exeSrc)) {
      fs.copyFileSync(exeSrc, middlewarePath);

      // Copiar DLLs
      const files = fs.readdirSync(releaseDir);
      for (const file of files) {
        if (file.endsWith(".dll")) {
          fs.copyFileSync(path.join(releaseDir, file), path.join(binDir, file));
        }
      }
    }

    // Verificar que se creó el ejecutable
    if (fs.existsSync(middlewarePath)) {
      return true;
    } else {
      console.error("[ERROR] La compilacion termino pero no se creo el ejecutable");
      return false;
    }
  } catch (error) {
    console.error("[ERROR] Error al compilar BiometricMiddleware:", error.message);
    console.error("[INFO] Asegurate de tener .NET SDK instalado");
    return false;
  }
}

/**
 * Función para iniciar el BiometricMiddleware como administrador
 */
function startBiometricMiddleware() {
  try {
    // Compilar si es necesario
    if (!buildBiometricMiddlewareIfNeeded()) {
      console.error("[ERROR] No se pudo obtener el ejecutable de BiometricMiddleware");
      return;
    }

    // Ejecutable compilado (usa ruta según entorno)
    const biometricDir = getBiometricPath();
    const middlewarePath = path.join(biometricDir, "BiometricMiddleware.exe");
    const workingDir = biometricDir;


    if (process.platform === "win32") {
      // En Windows, ejecutar directamente con spawn

      biometricProcess = spawn(middlewarePath, [], {
        cwd: workingDir,
        shell: false,
        windowsHide: false, // Mostrar ventana para debugging
        detached: false,
      });

      biometricProcess.stdout.on("data", () => {});

      biometricProcess.stderr.on("data", (data) => {
        console.error(`[BiometricMiddleware] ${data.toString().trim()}`);
      });

      biometricProcess.on("close", () => {
        biometricProcess = null;
      });

      biometricProcess.on("error", (error) => {
        console.error("[ERROR] Error al iniciar BiometricMiddleware:", error.message);
        biometricProcess = null;
      });
    } else {
      // En otros sistemas operativos, ejecutar normalmente
      biometricProcess = spawn(middlewarePath, [], {
        cwd: workingDir,
      });

      biometricProcess.stdout.on("data", () => {});

      biometricProcess.stderr.on("data", (data) => {
        console.error(`[BiometricMiddleware] ${data.toString().trim()}`);
      });

      biometricProcess.on("close", () => {
        biometricProcess = null;
      });

      biometricProcess.on("error", (error) => {
        console.error("[ERROR] Error al iniciar BiometricMiddleware:", error.message);
        biometricProcess = null;
      });
    }
  } catch (error) {
    console.error("[ERROR] Error al iniciar BiometricMiddleware:", error);
  }
}

/**
 * Función para detener el BiometricMiddleware
 */
function stopBiometricMiddleware() {
  if (biometricProcess) {
    try {
      biometricProcess.kill();
      biometricProcess = null;
    } catch (error) {
      console.error("[ERROR] Error al detener BiometricMiddleware:", error.message);
    }
  }
}

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
      preload: path.join(__dirname, "preload.cjs"),
      enableWebSQL: false,
      v8CacheOptions: "code",
      // Mejorar rendimiento de video
      backgroundThrottling: false,
      // Deshabilitar seguridad web para permitir CORS en desarrollo
      webSecurity: process.env.NODE_ENV !== "development" ? true : false,
    },
    frame: true,
    backgroundColor: "#ffffff",
    show: false, // No mostrar hasta que esté listo
    autoHideMenuBar: true, // Ocultar el menú automáticamente
  });

  // Cargar la aplicación
  if (process.env.NODE_ENV === "development") {
    // En desarrollo, cargar desde el servidor de desarrollo de Vite
    mainWindow.loadURL("http://localhost:5173");
    // Abrir DevTools solo si se necesita para debugging
    // mainWindow.webContents.openDevTools();
  } else {
    // En producción, cargar el archivo index.html compilado desde la app empaquetada
    const indexPath = path.join(app.getAppPath(), "dist", "index.html");

    mainWindow.loadFile(indexPath).catch((err) => {
      console.error("[ERROR] Error cargando index.html:", err);
    });
  }

  // Mostrar cuando esté listo para evitar flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Log de errores de carga
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("[ERROR] Error de carga:", errorCode, errorDescription);
    },
  );

  // Emitted when the window is closed.
  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

// Este método se llamará cuando Electron haya terminado la inicialización
app.whenReady().then(() => {
  // Iniciar el BiometricMiddleware
  startBiometricMiddleware();

  // Crear la ventana principal
  createWindow();

  app.on("activate", function () {
    // En macOS es común recrear una ventana cuando se hace clic en el icono del dock
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Salir cuando todas las ventanas estén cerradas, excepto en macOS
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    // Detener el BiometricMiddleware antes de salir
    stopBiometricMiddleware();
    app.quit();
  }
});

// Detener el BiometricMiddleware cuando la app se cierre
app.on("will-quit", () => {
  stopBiometricMiddleware();
});

// ===== IPC Handlers =====

/**
 * Obtener información del sistema
 */
ipcMain.handle("get-system-info", async () => {
  try {
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = "No detectada";
    let macAddress = "No detectada";

    // Buscar la primera interfaz IPv4 que no sea localhost
    for (const name of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === "IPv4" && !net.internal) {
          ipAddress = net.address;
          macAddress = net.mac.toUpperCase();
          break;
        }
      }
      if (ipAddress !== "No detectada") break;
    }

    // Formatear el nombre del sistema operativo de forma más amigable
    let osName = os.type();
    const release = os.release();

    if (osName === "Windows_NT") {
      // Detectar versión de Windows basado en el build number
      const buildNumber = parseInt(release.split(".")[2] || "0");
      if (buildNumber >= 22000) {
        osName = "Windows 11";
      } else if (buildNumber >= 10240) {
        osName = "Windows 10";
      } else {
        osName = "Windows";
      }
    } else if (osName === "Darwin") {
      osName = "macOS";
    }

    return {
      ipAddress,
      macAddress,
      operatingSystem: osName,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      totalMemory: `${Math.round(os.totalmem() / 1024 ** 3)} GB`,
      freeMemory: `${Math.round(os.freemem() / 1024 ** 3)} GB`,
      cpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || "No disponible",
      uptime: Math.floor(os.uptime() / 3600), // horas
    };
  } catch (error) {
    console.error("Error obteniendo información del sistema:", error);
    return {
      error: "No se pudo obtener la información del sistema",
    };
  }
});

/**
 * Obtener información de red detallada
 */
ipcMain.handle("get-network-info", async () => {
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
    console.error("Error obteniendo información de red:", error);
    return [];
  }
});

/**
 * Minimizar ventana
 */
ipcMain.on("minimize-window", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

/**
 * Maximizar/Restaurar ventana
 */
ipcMain.on("maximize-window", () => {
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
ipcMain.on("close-window", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

/**
 * Obtener si la ventana está maximizada
 */
ipcMain.handle("is-maximized", () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

/**
 * Gestión de configuración persistente en archivo
 * La configuración se guarda en la carpeta de datos de usuario de la aplicación
 */
const getConfigPath = () => {
  return path.join(app.getPath("userData"), "app-config.json");
};

/**
 * Leer configuración desde archivo
 */
ipcMain.handle("config-get", async (event, key) => {
  try {
    const configPath = getConfigPath();

    // Si el archivo no existe, retornar null
    if (!fs.existsSync(configPath)) {
      return null;
    }

    // Leer el archivo
    const data = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(data);

    return key ? config[key] : config;
  } catch (error) {
    console.error("Error leyendo configuración:", error);
    return null;
  }
});

/**
 * Guardar configuración en archivo
 */
ipcMain.handle("config-set", async (event, key, value) => {
  try {
    const configPath = getConfigPath();
    let config = {};

    // Si el archivo existe, leer la configuración actual
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf8");
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
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

    return true;
  } catch (error) {
    console.error("Error guardando configuración:", error);
    return false;
  }
});

/**
 * Eliminar una clave de configuración
 */
ipcMain.handle("config-remove", async (event, key) => {
  try {
    const configPath = getConfigPath();

    if (!fs.existsSync(configPath)) {
      return true;
    }

    const data = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(data);

    delete config[key];

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

    return true;
  } catch (error) {
    console.error("Error eliminando configuración:", error);
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
    throw new Error("Los descriptores deben tener la misma longitud");
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
  let backendUrl = "https://9dm7dqf9-3001.usw3.devtunnels.ms";

  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf8");
      const config = JSON.parse(data);
      backendUrl = config.backendUrl || backendUrl;
    }
  } catch (error) {
    // Usar URL por defecto si hay error leyendo configuración
  }

  // Eliminar barra final si existe
  return backendUrl.replace(/\/$/, "");
}

/**
 * Verificar usuario por reconocimiento facial
 * Recibe un descriptor facial y lo compara con todos los registrados en la DB
 */
ipcMain.handle("verificar-usuario", async (event, descriptor) => {
  try {
    const backendUrl = getBackendUrl();

    // Obtener todos los descriptores faciales de la base de datos
    const response = await fetch(
      `${backendUrl}/api/credenciales/descriptores`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Error HTTP: ${response.status} - ${response.statusText}`,
      );
    }

    const credenciales = await response.json();

    if (credenciales.length === 0) {
      return {
        success: false,
        message: "No hay descriptores faciales registrados en la base de datos",
      };
    }

    // Comparar el descriptor recibido con cada uno de la base de datos
    const THRESHOLD = 0.65; // Umbral de similitud más permisivo (< 0.65 es una buena coincidencia)
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const credencial of credenciales) {
      if (!credencial.descriptor_facial) {
        continue;
      }

      // El descriptor viene como array de números desde la BD
      const storedDescriptor = credencial.descriptor_facial;

      if (storedDescriptor.length !== descriptor.length) {
        continue;
      }

      const distance = calculateEuclideanDistance(descriptor, storedDescriptor);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = credencial;
      }
    }

    if (bestMatch && bestDistance < THRESHOLD) {

      // Obtener información del empleado
      const empleadoResponse = await fetch(
        `${backendUrl}/api/empleados/${bestMatch.empleado_id}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!empleadoResponse.ok) {
        throw new Error(
          `Error obteniendo datos del empleado: ${empleadoResponse.status}`,
        );
      }

      const empleado = await empleadoResponse.json();

      return {
        success: true,
        empleado: empleado,
        distancia: bestDistance,
        message: "Usuario identificado correctamente",
      };
    } else {
      return {
        success: false,
        message: "Rostro no identificado",
        distancia: bestDistance,
        mejorCandidato: bestMatch
          ? {
              nombre: bestMatch.nombre,
              distancia: bestDistance,
            }
          : null,
      };
    }
  } catch (error) {
    console.error("[ERROR] Error verificando usuario:", error);
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
ipcMain.handle("registrar-asistencia-facial", async (event, empleadoId) => {
  try {
    const backendUrl = getBackendUrl();

    // Registrar la asistencia
    const response = await fetch(
      `${backendUrl}/api/asistencia/registrar-facial`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          id_empleado: empleadoId,
          tipo: "Escritorio", // Tipo de ubicación del dispositivo
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ERROR] Respuesta del servidor:", errorText);
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: "Asistencia registrada correctamente",
      data: result,
    };
  } catch (error) {
    console.error("[ERROR] Error registrando asistencia:", error);
    return {
      success: false,
      message: `Error de conexión: ${error.message}`,
      error: error.toString(),
    };
  }
});

/**
 * Leer template de huella dactilar desde archivo .fpt
 * Lee el archivo guardado por BiometricMiddleware y lo convierte a Base64
 */
ipcMain.handle("read-fingerprint-template", async (event, userId) => {
  try {

    const templatePath = path.join(
      getBiometricPath(),
      "FingerprintTemplates",
      `${userId}.fpt`,
    );

    // Verificar que el archivo existe
    if (!fs.existsSync(templatePath)) {
      console.error(
        `[ERROR] Archivo de template no encontrado: ${templatePath}`,
      );
      return null;
    }

    // Leer el archivo como Buffer
    const buffer = fs.readFileSync(templatePath);
    const base64 = buffer.toString("base64");

    return base64;
  } catch (error) {
    console.error("[ERROR] Error leyendo template de huella:", error);
    return null;
  }
});

/**
 * Registrar descriptor facial para un empleado
 * Convierte el descriptor array a Base64 (igual que las huellas) y lo guarda en la DB como BYTEA
 */
ipcMain.handle(
  "registrar-descriptor-facial",
  async (event, empleadoId, descriptor) => {
    try {
      const backendUrl = getBackendUrl();

      // Verificar que el descriptor sea válido
      if (
        !descriptor ||
        !Array.isArray(descriptor) ||
        descriptor.length === 0
      ) {
        throw new Error("Descriptor facial inválido");
      }

      // Convertir el descriptor array a Float32Array y luego a Base64
      // Esto es necesario porque el backend espera BYTEA (igual que las huellas)
      const float32Array = new Float32Array(descriptor);
      const buffer = Buffer.from(float32Array.buffer);
      const descriptorBase64 = buffer.toString("base64");

      // Enviar el descriptor al backend usando el endpoint correcto
      const response = await fetch(`${backendUrl}/api/credenciales/facial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          empleado_id: empleadoId,
          facial: descriptorBase64,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ERROR] Respuesta del servidor:", errorText);
        throw new Error(`Error HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        message: "Descriptor facial registrado correctamente",
        data: {
          id_credencial: result.id,
          descriptor_size: descriptorBase64.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("[ERROR] Error registrando descriptor facial:", error);
      return {
        success: false,
        message: `Error de conexión: ${error.message}`,
        error: error.toString(),
      };
    }
  },
);

// ===== Detección de Dispositivos USB =====

/**
 * Detectar dispositivos USB conectados al sistema
 * En Windows usa WMIC, en Linux/Mac usa lsusb o system_profiler
 */
ipcMain.handle("detect-usb-devices", async () => {
  try {
    const devices = [];

    if (process.platform === "win32") {
      // Windows: Usar PowerShell para obtener información detallada de dispositivos USB
      try {
        // Obtener dispositivos USB con PowerShell - incluir más clases
        // Usar Base64 para evitar problemas de escape
        const psScript = `Get-PnpDevice -Status OK | Where-Object { $_.Class -match 'USB|Biometric|Camera|Image|SmartCard|HID|Sensor|WPD|Media|Ports|Authentication' -or $_.InstanceId -like 'USB*' } | Select-Object Class, FriendlyName, InstanceId, Status | ConvertTo-Json -Compress`;
        const encodedCommand = Buffer.from(psScript, "utf16le").toString(
          "base64",
        );

        const result = execSync(
          `powershell -NoProfile -EncodedCommand ${encodedCommand}`,
          {
            encoding: "utf8",
            timeout: 15000,
            windowsHide: true,
          },
        );

        if (result && result.trim()) {
          const parsed = JSON.parse(result);
          const deviceList = Array.isArray(parsed) ? parsed : [parsed];

          for (const dev of deviceList) {
            if (!dev.FriendlyName) continue;

            // Limpiar caracteres especiales del nombre (®, ™, etc.)
            const rawName = dev.FriendlyName;
            const name = rawName
              .replace(/[®™©�´┐¢\uFFFD]/g, "") // Remover símbolos de marca y caracteres inválidos
              .replace(/\s+/g, " ") // Normalizar espacios
              .trim();
            const nameLower = name.toLowerCase();
            const classLower = (dev.Class || "").toLowerCase();
            const instanceLower = (dev.InstanceId || "").toLowerCase();

            // Detectar tipo de dispositivo basado en nombre y clase
            let type = "unknown";
            let connection = "USB";

            // Vendor IDs conocidos de lectores biométricos
            const isDigitalPersonaVID = instanceLower.includes("vid_05ba"); // DigitalPersona
            const isSecuGenVID = instanceLower.includes("vid_1162"); // SecuGen
            const isZKTecoVID = instanceLower.includes("vid_1b55"); // ZKTeco

            // Lectores de huella - ampliar detección
            if (
              nameLower.includes("fingerprint") ||
              nameLower.includes("biometric") ||
              nameLower.includes("huella") ||
              nameLower.includes("digital persona") ||
              nameLower.includes("digitalpersona") ||
              nameLower.includes("u.are.u") ||
              nameLower.includes("uareu") ||
              nameLower.includes("uru") ||
              nameLower.includes("4500") || // U.are.U 4500
              nameLower.includes("5100") || // U.are.U 5100
              nameLower.includes("5160") || // U.are.U 5160
              nameLower.includes("5300") || // U.are.U 5300
              nameLower.includes("eikon") ||
              nameLower.includes("secugen") ||
              nameLower.includes("hamster") ||
              nameLower.includes("suprema") ||
              nameLower.includes("zkteco") ||
              nameLower.includes("zk ") ||
              nameLower.includes("zk4500") ||
              nameLower.includes("live20r") ||
              nameLower.includes("anviz") ||
              nameLower.includes("morpho") ||
              nameLower.includes("crossmatch") ||
              nameLower.includes("nitgen") ||
              nameLower.includes("futronic") ||
              (nameLower.includes("sensor") && nameLower.includes("finger")) ||
              classLower === "biometric" ||
              classLower.includes("biometric") ||
              classLower.includes("authentication") ||
              isDigitalPersonaVID ||
              isSecuGenVID ||
              isZKTecoVID
            ) {
              type = "fingerprint";
            }
            // Cámaras (filtrar virtuales)
            else if (
              (nameLower.includes("camera") ||
                nameLower.includes("webcam") ||
                nameLower.includes("cámara") ||
                nameLower.includes("imaging") ||
                nameLower.includes("video") ||
                nameLower.includes("cam ") ||
                (nameLower.includes("logitech") &&
                  !nameLower.includes("keyboard") &&
                  !nameLower.includes("mouse")) ||
                classLower === "camera" ||
                classLower === "image" ||
                classLower.includes("camera")) &&
              // Filtrar cámaras virtuales
              !nameLower.includes("obs") &&
              !nameLower.includes("virtual") &&
              !nameLower.includes("manycam") &&
              !nameLower.includes("xsplit") &&
              !nameLower.includes("snap camera") &&
              !nameLower.includes("droidcam") &&
              !nameLower.includes("iriun") &&
              !nameLower.includes("epoccam") &&
              !nameLower.includes("ndi") &&
              !nameLower.includes("newtek") &&
              !nameLower.includes("camtwist") &&
              !nameLower.includes("sparkocam") &&
              !nameLower.includes("splitcam") &&
              !nameLower.includes("youcam") &&
              !nameLower.includes("cyberlink") &&
              !nameLower.includes("avatarify") &&
              !nameLower.includes("chromacam") &&
              !nameLower.includes("vcam") &&
              !nameLower.includes("fake")
            ) {
              type = "camera";
            }
            // Lectores RFID / Smart Card
            else if (
              nameLower.includes("rfid") ||
              nameLower.includes("card reader") ||
              nameLower.includes("smart card") ||
              nameLower.includes("smartcard") ||
              nameLower.includes("nfc") ||
              nameLower.includes("mifare") ||
              nameLower.includes("proximity") ||
              nameLower.includes("contactless") ||
              classLower === "smartcardreader" ||
              classLower.includes("smartcard")
            ) {
              type = "rfid";
            }
            // Escáneres
            else if (
              nameLower.includes("scanner") ||
              nameLower.includes("escáner") ||
              (nameLower.includes("scan") && !nameLower.includes("keyboard"))
            ) {
              type = "scanner";
            }

            // Verificar si es un dispositivo biométrico por VID
            const isBiometricVID =
              isDigitalPersonaVID || isSecuGenVID || isZKTecoVID;

            // Filtrar dispositivos USB genéricos y hubs (excepto biométricos)
            const isGenericOrHub =
              nameLower.includes("hub") ||
              nameLower.includes("root") ||
              nameLower.includes("host controller") ||
              nameLower.includes("composite device") ||
              nameLower.includes("generic usb") ||
              (nameLower.includes("usb input device") &&
                !nameLower.includes("biometric") &&
                !isBiometricVID) ||
              nameLower.includes("mass storage") ||
              nameLower.includes("disk drive") ||
              nameLower.includes("keyboard") ||
              nameLower.includes("mouse") ||
              nameLower.includes("audio") ||
              nameLower.includes("bluetooth") ||
              nameLower.includes("wireless");

            if (isGenericOrHub && type === "unknown") {
              continue; // Ignorar hubs y controladores genéricos
            }

            // Si es un dispositivo USB que no reconocemos pero tiene características interesantes, incluirlo
            if (type === "unknown") {
              // Verificar si está conectado por USB y tiene un nombre interesante
              continue;
            }

            // Agregar dispositivos relevantes
            devices.push({
              id: Date.now() + Math.random(),
              name: name,
              type: type,
              connection: connection,
              ip: "",
              port: "",
              deviceClass: dev.Class || "USB",
              instanceId: dev.InstanceId || "",
              detected: true,
            });

          }
        }
      } catch (psError) {
        console.error(
          "[USB] Error con PowerShell, intentando WMIC:",
          psError.message,
        );

        // Fallback a WMIC
        try {
          const wmicResult = execSync(
            "wmic path Win32_PnPEntity where \"Status='OK'\" get Name,DeviceID,PNPClass /format:csv",
            {
              encoding: "utf8",
              timeout: 10000,
              windowsHide: true,
            },
          );

          const lines = wmicResult.split("\n").filter((line) => line.trim());

          for (const line of lines.slice(1)) {
            // Skip header
            const parts = line.split(",");
            if (parts.length < 4) continue;

            const [, deviceId, name, pnpClass] = parts;
            if (!name || !deviceId) continue;

            const nameLower = name.toLowerCase();
            const classLower = (pnpClass || "").toLowerCase();

            // Misma lógica de detección
            let type = "unknown";

            if (
              nameLower.includes("fingerprint") ||
              nameLower.includes("biometric") ||
              classLower === "biometric"
            ) {
              type = "fingerprint";
            } else if (
              nameLower.includes("camera") ||
              nameLower.includes("webcam") ||
              classLower === "camera" ||
              classLower === "image"
            ) {
              type = "camera";
            } else if (
              nameLower.includes("rfid") ||
              nameLower.includes("smart card") ||
              classLower === "smartcardreader"
            ) {
              type = "rfid";
            } else if (nameLower.includes("scanner")) {
              type = "scanner";
            }

            if (type !== "unknown") {
              devices.push({
                id: Date.now() + Math.random(),
                name: name.trim(),
                type: type,
                connection: "USB",
                ip: "",
                port: "",
                deviceClass: pnpClass || "USB",
                instanceId: deviceId || "",
                detected: true,
              });
            }
          }
        } catch (wmicError) {
          console.error("[USB] Error con WMIC:", wmicError.message);
        }
      }
    } else if (process.platform === "darwin") {
      // macOS: Usar system_profiler
      try {
        const result = execSync("system_profiler SPUSBDataType -json", {
          encoding: "utf8",
          timeout: 10000,
        });

        const data = JSON.parse(result);
        const usbData = data.SPUSBDataType || [];

        const processUSBItems = (items) => {
          for (const item of items) {
            const name = item._name || "";
            const nameLower = name.toLowerCase();

            let type = "unknown";

            if (
              nameLower.includes("fingerprint") ||
              nameLower.includes("biometric")
            ) {
              type = "fingerprint";
            } else if (
              nameLower.includes("camera") ||
              nameLower.includes("facetime")
            ) {
              type = "camera";
            } else if (
              nameLower.includes("rfid") ||
              nameLower.includes("card reader")
            ) {
              type = "rfid";
            } else if (nameLower.includes("scanner")) {
              type = "scanner";
            }

            if (type !== "unknown") {
              devices.push({
                id: Date.now() + Math.random(),
                name: name,
                type: type,
                connection: "USB",
                ip: "",
                port: "",
                detected: true,
              });
            }

            // Procesar dispositivos hijos recursivamente
            if (item._items) {
              processUSBItems(item._items);
            }
          }
        };

        processUSBItems(usbData);
      } catch (macError) {
        console.error("[USB] Error en macOS:", macError.message);
      }
    } else {
      // Linux: Usar lsusb
      try {
        const result = execSync("lsusb -v 2>/dev/null || lsusb", {
          encoding: "utf8",
          timeout: 10000,
        });

        const lines = result.split("\n");

        for (const line of lines) {
          const nameLower = line.toLowerCase();
          let type = "unknown";

          if (
            nameLower.includes("fingerprint") ||
            nameLower.includes("biometric")
          ) {
            type = "fingerprint";
          } else if (
            nameLower.includes("camera") ||
            nameLower.includes("webcam")
          ) {
            type = "camera";
          } else if (
            nameLower.includes("rfid") ||
            nameLower.includes("card reader")
          ) {
            type = "rfid";
          } else if (nameLower.includes("scanner")) {
            type = "scanner";
          }

          if (type !== "unknown") {
            // Extraer nombre del dispositivo de la línea lsusb
            const match = line.match(/ID \w+:\w+ (.+)/);
            const name = match ? match[1].trim() : line.trim();

            devices.push({
              id: Date.now() + Math.random(),
              name: name,
              type: type,
              connection: "USB",
              ip: "",
              port: "",
              detected: true,
            });
          }
        }
      } catch (linuxError) {
        console.error("[USB] Error en Linux:", linuxError.message);
      }
    }

    return {
      success: true,
      devices: devices,
      count: devices.length,
    };
  } catch (error) {
    console.error("[USB] Error detectando dispositivos:", error);
    return {
      success: false,
      devices: [],
      error: error.message,
    };
  }
});

/**
 * Listar TODOS los dispositivos USB para diagnóstico
 */
ipcMain.handle("list-all-usb-devices", async () => {
  try {

    if (process.platform === "win32") {
      // Obtener todos los dispositivos conectados por USB o biométricos
      const psScript = `Get-PnpDevice -Status OK | Where-Object { $_.InstanceId -like 'USB*' -or $_.Class -like '*Biometric*' -or $_.Class -like '*Authentication*' } | Select-Object Class, FriendlyName, InstanceId | ConvertTo-Json`;
      const encodedCommand = Buffer.from(psScript, "utf16le").toString(
        "base64",
      );

      const result = execSync(
        `powershell -NoProfile -EncodedCommand ${encodedCommand}`,
        {
          encoding: "utf8",
          timeout: 15000,
          windowsHide: true,
        },
      );

      if (result && result.trim()) {
        const parsed = JSON.parse(result);
        const deviceList = Array.isArray(parsed) ? parsed : [parsed];

        return {
          success: true,
          devices: deviceList
            .filter((d) => d.FriendlyName)
            .map((d) => ({
              name: d.FriendlyName,
              class: d.Class,
              instanceId: d.InstanceId,
            })),
        };
      }
    }

    return { success: true, devices: [] };
  } catch (error) {
    console.error("[USB-DEBUG] Error:", error.message);
    return { success: false, error: error.message };
  }
});

/**
 * Verificar si el servidor biométrico está activo
 */
ipcMain.handle("check-biometric-server", async () => {
  try {
    // Verificar conexión WebSocket al servidor biométrico
    const WebSocket = (await import("ws")).default;

    return new Promise((resolve) => {
      const ws = new WebSocket("ws://localhost:8787/");
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ connected: false, message: "Timeout al conectar" });
      }, 3000);

      ws.on("open", () => {
        clearTimeout(timeout);
        ws.close();
        resolve({ connected: true, message: "Servidor biométrico activo" });
      });

      ws.on("error", (error) => {
        clearTimeout(timeout);
        resolve({ connected: false, message: error.message });
      });
    });
  } catch (error) {
    return { connected: false, message: error.message };
  }
});
