/**
 * Componente para mostrar el estado de conexión con iconos dinámicos
 */

import { Wifi, WifiOff, Database } from 'lucide-react';

/**
 * Icono de WiFi con estado dinámico
 */
export function WifiStatus({ isConnected, className = "" }) {
  if (isConnected) {
    return (
      <div className={`flex flex-col items-center gap-1 text-green-600 p-2 ${className}`}>
        <Wifi className="w-5 h-5" />
        <span className="text-xs font-semibold">WiFi</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-1 text-red-600 p-2 ${className}`}>
      <WifiOff className="w-5 h-5" />
      <span className="text-xs font-semibold">WiFi</span>
    </div>
  );
}

/**
 * Icono de Base de Datos con estado dinámico
 */
export function DatabaseStatus({ isConnected, className = "" }) {
  const iconColor = isConnected ? 'text-green-600' : 'text-red-600';

  return (
    <div className={`flex flex-col items-center gap-1 ${iconColor} p-2 ${className}`}>
      <div className="relative">
        <Database className="w-5 h-5" />
        {!isConnected && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
        )}
      </div>
      <span className="text-xs font-semibold">BD</span>
    </div>
  );
}

/**
 * Componente compuesto que muestra ambos estados
 */
export function ConnectionStatusPanel({ isInternetConnected, isDatabaseConnected }) {
  return (
    <>
      <WifiStatus isConnected={isInternetConnected} />
      <DatabaseStatus isConnected={isDatabaseConnected} />
    </>
  );
}

export default ConnectionStatusPanel;
