/**
 * Script de preload para Electron
 * Expone APIs seguras al renderer process usando ES modules
 */

import { contextBridge, ipcRenderer } from 'electron';

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

  // Información del entorno
  isElectron: true,
  platform: process.platform,
  versions: process.versions,
});
