# Configuración de Electron para el Sistema de Checador

Este documento explica cómo configurar y ejecutar la aplicación como una aplicación de escritorio usando Electron.

## 📋 Requisitos Previos

- Node.js instalado (versión 16 o superior)
- npm o yarn como gestor de paquetes

## 🚀 Instalación de Dependencias de Electron

Ejecuta el siguiente comando en la raíz del proyecto para instalar Electron:

```bash
npm install --save-dev electron electron-builder concurrently wait-on cross-env
```

O con yarn:

```bash
yarn add -D electron electron-builder concurrently wait-on cross-env
```

## ⚙️ Configuración del package.json

Agrega los siguientes scripts a tu `package.json`:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",

    "electron:dev": "concurrently \"cross-env BROWSER=none npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:mac": "npm run build && electron-builder --mac",
    "electron:build:linux": "npm run build && electron-builder --linux"
  },
  "build": {
    "appId": "com.fasitlac.checador",
    "productName": "Checador FASITLAC",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "public/icon.ico"
    },
    "mac": {
      "target": ["dmg", "zip"],
      "icon": "public/icon.icns",
      "category": "public.app-category.productivity"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "public/icon.png",
      "category": "Office"
    }
  }
}
```

## 🎯 Comandos Disponibles

### Desarrollo

Para ejecutar la aplicación en modo desarrollo con Electron:

```bash
npm run electron:dev
```

Esto iniciará:
1. El servidor de desarrollo de Vite en `http://localhost:5173`
2. La aplicación de Electron que carga el servidor de desarrollo

### Producción

Para compilar la aplicación para distribución:

```bash
# Para el sistema operativo actual
npm run electron:build

# Para Windows específicamente
npm run electron:build:win

# Para macOS específicamente
npm run electron:build:mac

# Para Linux específicamente
npm run electron:build:linux
```

Los archivos compilados se guardarán en la carpeta `dist-electron/`.

## 📦 Estructura de Archivos

```
Desktop/
├── electron/
│   ├── main.js          # Proceso principal de Electron
│   └── preload.js       # Script de preload para exponer APIs
├── src/
│   └── utils/
│       ├── systemInfo.js         # Detección básica (WebRTC, User Agent)
│       └── systemInfoAdvanced.js # Detección avanzada (Electron + API externa)
└── package.json
```

## 🔧 Características Implementadas

### Detección de Información del Sistema

El sistema ahora cuenta con **tres niveles de detección**:

#### 1. Detección Básica (Web)
- **IP Local**: Usando WebRTC (RTCPeerConnection)
- **MAC Address**: Fingerprint único del navegador
- **Sistema Operativo**: Análisis de User Agent

#### 2. Detección Avanzada (Web + API Externa)
- **IP Pública**: API de ipify.org
- **IP Local**: WebRTC mejorado
- Información adicional de hardware

#### 3. Detección Completa (Electron)
- **IP Local Real**: Usando `os.networkInterfaces()` de Node.js
- **MAC Address Real**: Dirección MAC física de la interfaz de red
- **Sistema Operativo**: Información exacta del SO con versión
- **Hardware Completo**: CPU, RAM total/libre, hostname, uptime

### API de Electron Expuesta

La aplicación expone las siguientes APIs al renderer process:

```javascript
// Obtener información del sistema
const systemInfo = await window.electronAPI.getSystemInfo();

// Obtener información de red detallada
const networkInfo = await window.electronAPI.getNetworkInfo();

// Control de ventana
window.electronAPI.minimizeWindow();
window.electronAPI.maximizeWindow();
window.electronAPI.closeWindow();
const isMaximized = await window.electronAPI.isMaximized();

// Verificar si está en Electron
console.log(window.electronAPI.isElectron); // true en Electron
```

## 🔒 Seguridad

El script `preload.js` usa `contextBridge` para exponer APIs de forma segura, evitando el acceso directo a Node.js desde el renderer process.

## 🐛 Solución de Problemas

### Error: "Cannot find module 'electron'"
```bash
npm install --save-dev electron
```

### Error: Puerto 5173 ocupado
Cambia el puerto en `vite.config.js`:
```javascript
export default defineConfig({
  server: {
    port: 3000
  }
})
```

Y actualiza el script en `package.json`:
```json
"electron:dev": "concurrently \"cross-env BROWSER=none npm run dev\" \"wait-on http://localhost:3000 && electron .\""
```

### La aplicación no detecta información del sistema
1. Verifica que `systemInfoAdvanced.js` esté importado correctamente
2. Revisa la consola del navegador/Electron para ver logs
3. Si estás en Electron, verifica que `preload.js` esté cargado

## 📚 Recursos Adicionales

- [Documentación de Electron](https://www.electronjs.org/docs/latest)
- [electron-builder](https://www.electron.build/)
- [API de ipify.org](https://www.ipify.org/)

## ✅ Verificación de Instalación

Para verificar que todo está funcionando:

1. Ejecuta `npm run electron:dev`
2. Ve a la sección de "Configuración" → "General del Nodo"
3. Haz clic en "Autodetectar"
4. Revisa la consola para ver los logs de detección
5. Verifica que la información se muestre correctamente

La información detectada incluirá:
- ✅ IP Local
- ✅ IP Pública (requiere conexión a internet)
- ✅ MAC Address
- ✅ Sistema Operativo
- ✅ Núcleos de CPU
- ✅ Memoria RAM
- ✅ Entorno (Web o Electron)
