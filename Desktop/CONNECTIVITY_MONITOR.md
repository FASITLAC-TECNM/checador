# Sistema de Monitoreo de Conectividad

## Descripción

Sistema de detección en tiempo real de conectividad a Internet y Base de Datos, implementado con una **estrategia híbrida reactiva** para máxima confiabilidad y rendimiento.

## Componentes Implementados

### 1. Hook de Conectividad (`src/hooks/useConnectivity.js`)

Hook personalizado que monitorea la conectividad usando tres estrategias combinadas:

#### Estrategia Híbrida Reactiva

1. **Detección Instantánea Nativa**
   - Escucha eventos `online`/`offline` del navegador
   - Reacción inmediata (0ms) cuando el usuario desconecta el cable Ethernet o WiFi
   - No requiere esperar al heartbeat

2. **Verificación Agresiva con Electron**
   - Cuando se detecta reconexión (`online` event), dispara verificación inmediata
   - No espera al intervalo del heartbeat
   - Usa `fetch` con timeout de 5 segundos

3. **Latido de Fondo (Heartbeat)**
   - Intervalo de 3 segundos para detectar caídas silenciosas
   - Detecta cuando el proveedor de Internet falla pero la conexión WiFi/Ethernet sigue activa
   - Previene falsos positivos por DNS bloqueados

#### APIs Expuestas

```javascript
const {
  isOnline,              // Estado nativo del navegador (navigator.onLine)
  isInternetConnected,   // Conectividad real verificada (ping a servidores)
  isDatabaseConnected,   // Estado de conexión a la base de datos
  lastChecked,           // Última vez que se verificó (Date)
  refresh                // Función para forzar verificación manual
} = useConnectivity();
```

#### Verificación de Internet

- **Electron**: Hace ping a `https://www.google.com/favicon.ico` con timeout de 5s
- **Navegador**: Intenta múltiples endpoints (Google, Cloudflare) para evitar falsos negativos

#### Verificación de Base de Datos

- Hace petición a `/health` endpoint del servidor API
- Timeout de 5 segundos
- Verifica que el servidor responda con `status: 'ok'` y `database: 'connected'`

### 2. Componentes Visuales (`src/components/common/ConnectionStatus.jsx`)

#### WifiStatus
- Icono verde (`Wifi`) cuando hay conexión a Internet
- Icono rojo (`WifiOff`) cuando no hay conexión

#### DatabaseStatus
- Icono verde cuando la BD está conectada
- Icono rojo con punto pulsante cuando la BD está desconectada

#### ConnectionStatusPanel
- Componente compuesto que muestra ambos estados
- Se integra en la barra lateral del KioskScreen

### 3. Endpoint de Health Check (Backend)

**Ubicación**: `backend/src/app.js`

```javascript
GET /health
```

**Respuesta Exitosa (200)**:
```json
{
  "status": "ok",
  "service": "FASITLAC API",
  "database": "connected",
  "timestamp": "2025-12-09T12:34:56.789Z"
}
```

**Respuesta con Error (503)**:
```json
{
  "status": "error",
  "service": "FASITLAC API",
  "database": "disconnected",
  "error": "mensaje del error",
  "timestamp": "2025-12-09T12:34:56.789Z"
}
```

## Configuración

### Variables de Entorno

Archivo `.env` en la raíz del proyecto Desktop:

```env
VITE_API_URL=https://6l4v7pjl-3000.usw3.devtunnels.ms
```

### Intervalos Configurables

En `src/hooks/useConnectivity.js`:

```javascript
const HEARTBEAT_INTERVAL = 3000;        // 3 segundos (latido de fondo)
const ELECTRON_VERIFY_TIMEOUT = 5000;   // Timeout para verificación Electron
```

## Flujo de Funcionamiento

### Escenario 1: Usuario desconecta cable Ethernet

1. **Inmediato (0ms)**: Evento `offline` dispara `handleOffline()`
2. **Acción**: Iconos cambian a rojo instantáneamente
3. **Estado**: `isOnline = false`, `isInternetConnected = false`, `isDatabaseConnected = false`

### Escenario 2: Usuario reconecta cable Ethernet

1. **Inmediato (0ms)**: Evento `online` dispara `handleOnline()`
2. **Acción inmediata**: Llama `checkConnectivity()` sin esperar heartbeat
3. **Verificación agresiva**:
   - Ping a Google/Cloudflare
   - Si hay internet → Verifica `/health` endpoint
4. **Actualización**: Iconos cambian a verde cuando se confirma conectividad

### Escenario 3: Proveedor de Internet falla (WiFi conectado pero sin Internet)

1. **Detección**: Heartbeat detecta la caída en próximo ciclo (max 3s)
2. **Verificación**: Fetch a Google/Cloudflare falla
3. **Acción**: Icono WiFi cambia a rojo
4. **Efecto cascada**: Al no haber internet, icono DB también cambia a rojo

### Escenario 4: Base de datos cae pero Internet funciona

1. **Detección**: Heartbeat detecta la caída en próximo ciclo (max 3s)
2. **Verificación Internet**: OK ✅
3. **Verificación DB**: `/health` endpoint falla o retorna error
4. **Acción**: Icono WiFi verde, icono DB rojo con punto pulsante

## Ventajas de la Estrategia Híbrida

### vs Simple Bucle `is-online`
- ❌ **Problema**: Satura CPU con `while(true)` sin pausa
- ✅ **Solución**: Eventos nativos + heartbeat con intervalo controlado

### vs Verificación Agresiva Electron (sin latido)
- ❌ **Problema**: No detecta caídas silenciosas (DNS bloqueado, proveedor falla)
- ✅ **Solución**: Heartbeat de fondo detecta caídas que eventos nativos no capturan

### vs Solo Heartbeat (sin eventos nativos)
- ❌ **Problema**: Latencia de hasta 3s para detectar desconexión física
- ✅ **Solución**: Eventos nativos dan respuesta instantánea

## Integración en KioskScreen

```javascript
import { useConnectivity } from "../hooks/useConnectivity";
import { ConnectionStatusPanel } from "../components/common/ConnectionStatus";

export default function KioskScreen() {
  const { isInternetConnected, isDatabaseConnected } = useConnectivity();

  return (
    <div>
      <ConnectionStatusPanel
        isInternetConnected={isInternetConnected}
        isDatabaseConnected={isDatabaseConnected}
      />
    </div>
  );
}
```

## Rendimiento

- **Consumo CPU**: Mínimo (solo eventos + intervalo de 3s)
- **Consumo Red**:
  - Heartbeat: ~1 request cada 3s
  - Health check DB: ~1 request cada 3s
  - Total: ~2 peticiones ligeras cada 3s
- **Latencia detección**:
  - Desconexión física: 0ms (instantáneo)
  - Caída silenciosa: Max 3s (próximo heartbeat)
  - Reconexión: ~100-500ms (verificación agresiva inmediata)

## Pruebas Recomendadas

1. **Desconectar cable Ethernet**: Iconos deben cambiar instantáneamente a rojo
2. **Reconectar cable Ethernet**: Iconos deben volver a verde en <1s
3. **Desactivar WiFi**: Mismo comportamiento que cable Ethernet
4. **Apagar servidor backend**: Icono WiFi verde, icono DB rojo
5. **Apagar base de datos**: Icono WiFi verde, icono DB rojo
6. **Bloquear DNS (firewall)**: Heartbeat debe detectar en max 3s

## Archivos Modificados/Creados

### Nuevos Archivos
- ✅ `src/hooks/useConnectivity.js` - Hook de monitoreo
- ✅ `src/components/common/ConnectionStatus.jsx` - Componentes visuales
- ✅ `.env` - Variables de entorno
- ✅ `CONNECTIVITY_MONITOR.md` - Esta documentación

### Archivos Modificados
- ✅ `src/pages/KioskScreen.jsx` - Integración del hook y componentes
- ✅ `backend/src/app.js` - Endpoint `/health` añadido
- ✅ `.gitignore` - Excluye `.env` del repositorio

## Mantenimiento Futuro

### Ajustar sensibilidad
Modificar `HEARTBEAT_INTERVAL` en `useConnectivity.js`:
- Más rápido (1-2s): Mayor consumo, detección más rápida
- Más lento (5-10s): Menor consumo, detección más lenta

### Agregar más endpoints de verificación
Añadir URLs al array en `verifyInternetConnectivity()`:
```javascript
const endpoints = [
  'https://www.google.com/favicon.ico',
  'https://www.cloudflare.com/favicon.ico',
  'https://tu-servidor-backup.com/ping'  // Agregar aquí
];
```

### Logging y Debugging
Descomentar/agregar `console.log()` en:
- `handleOnline()` / `handleOffline()` - Para eventos nativos
- `checkConnectivity()` - Para verificaciones del heartbeat
- `verifyDatabaseConnectivity()` - Para estado de DB
