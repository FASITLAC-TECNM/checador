# Migración a React Native Vision Camera

Este proyecto ha sido migrado de `expo-face-detector` y `expo-camera` a `react-native-vision-camera` con `vision-camera-face-detector`.

## Cambios Realizados

### 1. Dependencias Actualizadas

Se removieron:
- ❌ `expo-camera`
- ❌ `expo-face-detector`

Se agregaron:
- ✅ `react-native-vision-camera` (v3.9.2)
- ✅ `vision-camera-face-detector` (v0.3.0)
- ✅ `react-native-worklets-core` (v1.3.3)

### 2. Archivos Modificados

- `Mobile/package.json` - Actualizadas dependencias
- `Mobile/services/visionCameraService.js` - Nuevo servicio usando Vision Camera
- `Mobile/services/FacialCaptureScreen.js` - Reescrito con Vision Camera y frame processors
- `Mobile/services/facialCameraService.js` - Ahora es un wrapper hacia visionCameraService

### 3. Archivos Sin Cambios (compatibilidad mantenida)

- `Mobile/components/settingsPages/SecurityScreen.jsx`
- `Mobile/components/settingsPages/Metodoautenticacion.jsx`

## Pasos para Instalar

### 1. Instalar Dependencias Base

```bash
cd Mobile
npm install
```

### 2. Instalar Dependencias de Vision Camera Manualmente

Instala las dependencias de Vision Camera con las versiones compatibles:

```bash
npm install react-native-vision-camera
npm install react-native-worklets-core
npm install vision-camera-face-detector
```

**Versiones recomendadas:**
- `react-native-vision-camera`: v3.x (última estable)
- `react-native-worklets-core`: v1.x
- `vision-camera-face-detector`: v0.3.x o superior

### 3. Configuración de iOS

Edita `Mobile/ios/Podfile` y asegúrate de tener:

```ruby
platform :ios, '13.4' # o superior
```

Luego instala los pods:

```bash
cd ios
pod install
cd ..
```

Edita `Mobile/ios/YourAppName/Info.plist` y agrega:

```xml
<key>NSCameraUsageDescription</key>
<string>Esta aplicación necesita acceso a la cámara para reconocimiento facial</string>
<key>NSMicrophoneUsageDescription</key>
<string>Esta aplicación necesita acceso al micrófono</string>
```

### 4. Configuración de Android

Edita `Mobile/android/app/src/main/AndroidManifest.xml` y asegúrate de tener:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.front" android:required="false" />
```

Edita `Mobile/android/build.gradle` y asegúrate de tener:

```gradle
buildscript {
    ext {
        minSdkVersion = 26  // Vision Camera requiere SDK 26+
    }
}
```

### 5. Configurar Babel (react-native-reanimated)

Edita `Mobile/babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ... otros plugins
      'react-native-reanimated/plugin', // DEBE estar al final
    ],
  };
};
```

### 6. Prebuild (si usas Expo)

```bash
npx expo prebuild --clean
```

### 7. Ejecutar la App

Para iOS:
```bash
npm run ios
```

Para Android:
```bash
npm run android
```

## Características Mejoradas

### Vision Camera vs Expo Camera

✅ **Ventajas de Vision Camera:**
- Frame processors para detección facial en tiempo real
- Mejor rendimiento (60 FPS)
- Más control sobre la cámara
- Plugins nativos para ML
- Menor latencia
- Mejor integración con Reanimated

### Detección Facial Mejorada

- **Frame Processor**: Detección en tiempo real mientras el usuario se posiciona
- **Feedback visual instantáneo**: El óvalo cambia de color cuando detecta un rostro válido
- **Mejor UX**: El usuario sabe inmediatamente si está bien posicionado
- **Validación antes de captura**: No captura hasta que el rostro esté correctamente posicionado

## Estructura de Datos

Los datos faciales mantienen la misma estructura:

```javascript
{
  bounds: { x, y, width, height },
  rollAngle: number,
  yawAngle: number,
  pitchAngle: number, // NUEVO: Vision Camera también provee pitch
  smilingProbability: number,
  leftEyeOpenProbability: number,
  rightEyeOpenProbability: number,
  landmarks: {
    leftEye: { x, y },
    rightEye: { x, y },
    nose: { x, y },
    mouth: { x, y },
    leftCheek: { x, y },
    rightCheek: { x, y }
  }
}
```

## Troubleshooting

### Error: "Frame Processor Plugin not found"

Asegúrate de:
1. Haber ejecutado `pod install` en iOS
2. Haber hecho un clean build
3. Tener `react-native-reanimated/plugin` al final de `babel.config.js`

### Error: "Native module not found"

1. Limpia el build:
   ```bash
   # iOS
   cd ios && pod deintegrate && pod install && cd ..

   # Android
   cd android && ./gradlew clean && cd ..
   ```

2. Reconstruye:
   ```bash
   npm run ios
   # o
   npm run android
   ```

### La cámara se ve en negro

1. Verifica los permisos en el dispositivo
2. Verifica que el `device` esté disponible
3. Verifica que `isActive={true}` en el componente Camera

## Compatibilidad

- iOS 12.4+
- Android SDK 24+ (Android 7.0+)
- React Native 0.70+
- Expo SDK 50+

**Nota:** Estamos usando Vision Camera v3.9.2 (versión estable) en lugar de v4 que aún está en beta.

## Soporte

Para más información:
- [React Native Vision Camera Docs](https://react-native-vision-camera.com/)
- [Vision Camera Face Detector](https://github.com/rodgomesc/vision-camera-face-detector)
