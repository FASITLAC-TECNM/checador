# Sistema de Reconocimiento Facial con Estrategia BYTEA

## Descripción General

Este documento describe la implementación completa del sistema de reconocimiento facial para el checador de asistencia, utilizando la estrategia BYTEA para almacenar descriptores faciales en PostgreSQL.

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Detección y Liveness (useFaceDetection Hook)         │  │
│  │     - Detecta rostro con face-api.js                     │  │
│  │     - Valida liveness (parpadeo)                         │  │
│  │     - Extrae descriptor facial (Float32Array - 128 dims) │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  2. Envío seguro via contextBridge                       │  │
│  │     window.electronAPI.verificarUsuario(descriptor)      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                  ELECTRON MAIN PROCESS                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  3. Comparación y Registro (main.mjs)                    │  │
│  │     - Obtiene descriptores de la BD via API              │  │
│  │     - Calcula distancia euclidiana                       │  │
│  │     - Identifica al usuario (threshold < 0.6)            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js + Express)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  4. APIs de Descriptores Faciales                        │  │
│  │     GET  /api/credenciales/descriptores                  │  │
│  │     GET  /api/credenciales/descriptor-facial/:id         │  │
│  │     PUT  /api/credenciales/descriptor-facial/:id         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                   BASE DE DATOS (PostgreSQL)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Tabla: Credenciales                                     │  │
│  │  - descriptor_facial (BYTEA)                             │  │
│  │    Almacena Float32Array como buffer binario             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo Detallado

### 1. Detección y Liveness (Frontend - React)

**Archivo:** `src/hooks/useFaceDetection.js`

1. **Carga de modelos:**
   ```javascript
   - tiny_face_detector (detección rápida de rostros)
   - face_landmark_68_net (puntos de referencia faciales)
   - face_recognition_net (extracción de descriptores)
   ```

2. **Detección de rostro:**
   - Procesa frames del video cada 100ms
   - Detecta rostro con confianza > 0.5
   - Calcula Eye Aspect Ratio (EAR) para detectar parpadeo

3. **Prueba de liveness:**
   - Requiere 2 parpadeos para validar que es una persona real
   - EAR < 0.2 = ojos cerrados
   - EAR > 0.2 = ojos abiertos
   - Detecta transiciones para contar parpadeos

4. **Extracción de descriptor:**
   - Genera Float32Array de 128 dimensiones
   - Representa características únicas del rostro
   - Se envía al proceso principal de Electron

### 2. Comunicación Segura (React ↔ Electron)

**Archivo:** `electron/preload.cjs`

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  verificarUsuario: (descriptor) =>
    ipcRenderer.invoke('verificar-usuario', descriptor),
  registrarDescriptorFacial: (empleadoId, descriptor) =>
    ipcRenderer.invoke('registrar-descriptor-facial', empleadoId, descriptor)
});
```

- Usa `contextBridge` para seguridad
- No expone directamente `ipcRenderer` al frontend
- Previene vulnerabilidades de seguridad

### 3. Comparación Matemática (Electron Main Process)

**Archivo:** `electron/main.mjs`

**Algoritmo de distancia euclidiana:**

```javascript
function calculateEuclideanDistance(descriptor1, descriptor2) {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}
```

**Proceso de verificación:**

1. Obtiene todos los descriptores de la BD via API
2. Compara el descriptor capturado con cada uno almacenado
3. Calcula distancia euclidiana para cada comparación
4. Encuentra la menor distancia (mejor coincidencia)
5. Si distancia < 0.6 → Usuario identificado ✅
6. Si distancia ≥ 0.6 → Usuario no identificado ❌

### 4. APIs del Backend (Node.js + Express)

**Archivo:** `backend/src/controllers/credenciales.controller.js`

#### GET /api/credenciales/descriptores

Obtiene todos los descriptores para comparación:

```javascript
export const getAllDescriptores = async (req, res) => {
  const result = await pool.query(`
    SELECT id_empleado, descriptor_facial
    FROM Credenciales
    WHERE descriptor_facial IS NOT NULL
  `);

  const descriptores = result.rows.map(row => {
    const buffer = row.descriptor_facial;
    const float32Array = new Float32Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.length / Float32Array.BYTES_PER_ELEMENT
    );
    return {
      empleado_id: row.id_empleado,
      descriptor_facial: Array.from(float32Array)
    };
  });

  res.json(descriptores);
};
```

#### PUT /api/credenciales/descriptor-facial/:id_empleado

Guarda un descriptor facial:

```javascript
export const updateDescriptorFacial = async (req, res) => {
  const { id_empleado } = req.params;
  const { descriptor } = req.body; // Array de 128 números

  // Convertir a Float32Array y luego a Buffer para BYTEA
  const float32Array = new Float32Array(descriptor);
  const buffer = Buffer.from(float32Array.buffer);

  await pool.query(`
    UPDATE Credenciales
    SET descriptor_facial = $1
    WHERE id_empleado = $2
  `, [buffer, id_empleado]);

  res.json({ message: 'Descriptor guardado correctamente' });
};
```

### 5. Almacenamiento en PostgreSQL (BYTEA)

**Estrategia de almacenamiento:**

1. **Frontend genera:** Float32Array de 128 números (512 bytes)
2. **Se convierte a:** Array normal de JavaScript para transmisión
3. **Backend recibe:** Array de 128 números
4. **Backend convierte:** Array → Float32Array → Buffer
5. **PostgreSQL almacena:** Buffer como BYTEA (binary data)

**Lectura desde PostgreSQL:**

1. **PostgreSQL devuelve:** Buffer (BYTEA)
2. **Backend convierte:** Buffer → Float32Array → Array
3. **Se transmite como:** Array normal de JavaScript
4. **Electron recibe:** Array de 128 números para comparación

## Estructura de Archivos Clave

```
Desktop/
├── public/
│   └── models/                           # Modelos de face-api.js
│       ├── tiny_face_detector_*          # Detección de rostros
│       ├── face_landmark_68_*            # Puntos faciales
│       └── face_recognition_*            # Descriptores faciales
│
├── src/
│   ├── hooks/
│   │   └── useFaceDetection.js           # Hook de detección facial
│   │
│   ├── components/
│   │   └── kiosk/
│   │       └── CameraModal.jsx           # Modal con cámara
│   │
│   └── pages/
│       └── KioskScreen.jsx               # Pantalla principal
│
└── electron/
    ├── main.mjs                          # Proceso principal (comparación)
    └── preload.cjs                       # Bridge seguro

backend/
└── src/
    ├── controllers/
    │   └── credenciales.controller.js    # Controladores de descriptores
    │
    └── routes/
        └── credenciales.routes.js        # Rutas de API
```

## Endpoints de la API

### Obtener todos los descriptores
```http
GET /api/credenciales/descriptores
Response: [
  {
    "empleado_id": 1,
    "descriptor_facial": [0.123, 0.456, ..., 0.789] // 128 números
  }
]
```

### Obtener descriptor de un empleado
```http
GET /api/credenciales/descriptor-facial/:id_empleado
Response: {
  "empleado_id": 1,
  "descriptor_facial": [0.123, 0.456, ..., 0.789]
}
```

### Guardar descriptor facial
```http
PUT /api/credenciales/descriptor-facial/:id_empleado
Content-Type: application/json

{
  "descriptor": [0.123, 0.456, ..., 0.789] // 128 números
}

Response: {
  "message": "Descriptor facial actualizado correctamente",
  "id": 1,
  "id_empleado": 1,
  "descriptor_size": 128
}
```

## Parámetros de Configuración

### Umbral de similitud
```javascript
const THRESHOLD = 0.6;
```
- Distancia < 0.6 → Rostros coinciden
- Distancia ≥ 0.6 → Rostros diferentes
- Ajustar según precisión vs. falsos positivos

### Confianza mínima de detección
```javascript
const MIN_DETECTION_CONFIDENCE = 0.5;
```
- 0.0 - 1.0 (50% de confianza mínima)
- Mayor valor = más estricto

### Umbral de parpadeo (EAR)
```javascript
const EAR_THRESHOLD = 0.2;
```
- Eye Aspect Ratio < 0.2 → Ojos cerrados
- Detecta parpadeos para liveness

### Parpadeos requeridos
```javascript
const BLINKS_REQUIRED = 2;
```
- Número de parpadeos para validar liveness
- Previene fotos o videos

## Ventajas de la Estrategia BYTEA

1. **Eficiencia de almacenamiento:**
   - 512 bytes por descriptor (vs. JSON que serían ~1KB+)
   - Almacenamiento directo en binario

2. **Performance:**
   - Lectura/escritura más rápida
   - No requiere parsing de JSON

3. **Precisión:**
   - Mantiene precisión de Float32
   - No hay pérdida de datos por conversión

4. **Seguridad:**
   - Datos binarios no son legibles directamente
   - Más difícil de manipular

## Uso en Producción

### Registrar descriptor facial de un empleado

```javascript
// En el componente de registro de empleados
const registrarRostro = async (empleadoId) => {
  // 1. Capturar rostro con la cámara
  const descriptor = await capturarDescriptorFacial();

  // 2. Guardar en la base de datos via Electron
  const result = await window.electronAPI.registrarDescriptorFacial(
    empleadoId,
    descriptor
  );

  if (result.success) {
    console.log('✅ Rostro registrado correctamente');
  }
};
```

### Verificar usuario en el kiosco

```javascript
// Ya implementado en KioskScreen.jsx
const handleFaceDetected = async (descriptor) => {
  const result = await window.electronAPI.verificarUsuario(descriptor);

  if (result.success) {
    console.log('✅ Usuario identificado:', result.empleado.nombre);
    // Registrar asistencia o dar acceso
  } else {
    console.log('❌ Rostro no identificado');
  }
};
```

## Troubleshooting

### Error: "Los modelos aún no están cargados"
- Verificar que los modelos estén en `public/models/`
- Ejecutar los comandos curl del README de modelos

### Error: "Esta funcionalidad requiere Electron"
- Solo funciona en la versión Desktop (Electron)
- No disponible en web browser

### Distancia siempre muy alta (no reconoce)
- Verificar iluminación al capturar rostro
- Asegurar que el rostro esté de frente
- Ajustar THRESHOLD si es necesario

### Falsos positivos (reconoce a personas incorrectas)
- Reducir THRESHOLD (ej. de 0.6 a 0.5)
- Mejorar calidad de captura inicial
- Recapturar descriptores con mejor iluminación

## Próximas Mejoras

1. **Registro de múltiples rostros por persona**
   - Diferentes ángulos
   - Diferentes condiciones de iluminación

2. **Detección de máscaras faciales**
   - Validar si la persona usa cubrebocas

3. **Actualización automática de descriptores**
   - Machine learning para mejorar con el tiempo

4. **Métricas de calidad**
   - Dashboard de precisión del sistema
   - Reportes de falsos positivos/negativos
