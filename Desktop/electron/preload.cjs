/**
 * Script de preload para Electron
 * Expone APIs seguras al renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs de forma segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Información del sistema
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),

  // Control de ventana
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),

  // Gestión de configuración persistente
  configGet: (key) => ipcRenderer.invoke('config-get', key),
  configSet: (key, value) => ipcRenderer.invoke('config-set', key, value),
  configRemove: (key) => ipcRenderer.invoke('config-remove', key),

  // Reconocimiento Facial
  verificarUsuario: (descriptor) => ipcRenderer.invoke('verificar-usuario', descriptor),
  registrarDescriptorFacial: (empleadoId, descriptor) => ipcRenderer.invoke('registrar-descriptor-facial', empleadoId, descriptor),
  registrarAsistenciaFacial: (empleadoId) => ipcRenderer.invoke('registrar-asistencia-facial', empleadoId),

  // Información del entorno
  isElectron: true,
  platform: process.platform,
  versions: process.versions,
});
