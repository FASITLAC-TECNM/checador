// services/visionCameraService.js
import { Camera } from 'react-native-vision-camera';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Servicio para captura facial usando react-native-vision-camera
 * Migrado desde expo-face-detector
 */

// Solicitar permisos de cámara
export const requestCameraPermission = async () => {
    try {
        let cameraPermission = await Camera.getCameraPermissionStatus();

        if (cameraPermission !== 'granted') {
            cameraPermission = await Camera.requestCameraPermission();
        }

        if (cameraPermission !== 'granted') {
            return {
                granted: false,
                message: 'Se necesitan permisos de cámara para usar reconocimiento facial'
            };
        }

        return { granted: true };

    } catch (error) {
        console.error('Error al solicitar permisos de cámara:', error);
        return {
            granted: false,
            message: 'Error al solicitar permisos de cámara'
        };
    }
};

// Verificar si la cámara está disponible
export const checkCameraAvailability = async () => {
    try {
        const permission = await requestCameraPermission();

        if (!permission.granted) {
            return {
                available: false,
                message: permission.message
            };
        }

        // En Vision Camera v3, no hay getAvailableCameraDevices()
        // Simplemente asumimos que la cámara frontal existe
        return {
            available: true,
            message: 'Cámara disponible'
        };

    } catch (error) {
        console.error('Error al verificar la cámara:', error);
        return {
            available: false,
            message: 'Error al verificar la cámara'
        };
    }
};

// Procesar datos del rostro detectado desde react-native-vision-camera-face-detector
export const processFaceData = (face) => {
    // Soporta tanto formato nuevo (landmarks.LEFT_EYE) como viejo (leftEyePosition)
    const leftEye = face.landmarks?.LEFT_EYE || face.leftEyePosition;
    const rightEye = face.landmarks?.RIGHT_EYE || face.rightEyePosition;
    const nose = face.landmarks?.NOSE_BASE || face.noseBasePosition;
    const mouth = face.landmarks?.MOUTH_BOTTOM || face.mouthPosition;
    const leftCheek = face.landmarks?.LEFT_CHEEK || face.leftCheekPosition;
    const rightCheek = face.landmarks?.RIGHT_CHEEK || face.rightCheekPosition;

    console.log('📊 Procesando datos faciales de Vision Camera:', {
        bounds: face.bounds,
        rollAngle: face.rollAngle,
        yawAngle: face.yawAngle,
        hasLandmarks: !!(leftEye && rightEye)
    });

    const faceFeatures = {
        bounds: {
            x: face.bounds?.x || 0,
            y: face.bounds?.y || 0,
            width: face.bounds?.width || 0,
            height: face.bounds?.height || 0
        },
        rollAngle: face.rollAngle || 0,
        yawAngle: face.yawAngle || 0,
        pitchAngle: face.pitchAngle || 0,
        smilingProbability: face.smilingProbability || 0,
        leftEyeOpenProbability: face.leftEyeOpenProbability || 0,
        rightEyeOpenProbability: face.rightEyeOpenProbability || 0,
        landmarks: {}
    };

    if (leftEye) faceFeatures.landmarks.leftEye = leftEye;
    if (rightEye) faceFeatures.landmarks.rightEye = rightEye;
    if (nose) faceFeatures.landmarks.nose = nose;
    if (mouth) faceFeatures.landmarks.mouth = mouth;
    if (leftCheek) faceFeatures.landmarks.leftCheek = leftCheek;
    if (rightCheek) faceFeatures.landmarks.rightCheek = rightCheek;

    return faceFeatures;
};

// Validar calidad del rostro capturado
export const validateFaceQuality = (faceData) => {
    const validations = {
        isValid: true,
        errors: [],
        warnings: []
    };

    console.log('✅ Validando calidad facial:', {
        eyesOpen: `L:${faceData.leftEyeOpenProbability} R:${faceData.rightEyeOpenProbability}`,
        angles: `Yaw:${faceData.yawAngle}° Roll:${faceData.rollAngle}° Pitch:${faceData.pitchAngle}°`,
        size: `${faceData.bounds.width}x${faceData.bounds.height}`
    });

    // 1. Verificar que ambos ojos estén abiertos
    if (faceData.leftEyeOpenProbability > 0 || faceData.rightEyeOpenProbability > 0) {
        if (faceData.leftEyeOpenProbability < 0.4 || faceData.rightEyeOpenProbability < 0.4) {
            validations.isValid = false;
            validations.errors.push('Mantén los ojos abiertos');
        }
    }

    // 2. Verificar que el rostro esté de frente (yaw angle cerca de 0)
    const yawThreshold = 20; // grados
    if (Math.abs(faceData.yawAngle) > yawThreshold) {
        validations.isValid = false;
        validations.errors.push('Mira directamente a la cámara');
    }

    // 3. Verificar inclinación de la cabeza (roll angle)
    const rollThreshold = 20; // grados
    if (Math.abs(faceData.rollAngle) > rollThreshold) {
        validations.isValid = false;
        validations.errors.push('Mantén la cabeza recta');
    }

    // 4. Verificar inclinación vertical (pitch angle)
    const pitchThreshold = 15; // grados
    if (Math.abs(faceData.pitchAngle) > pitchThreshold) {
        validations.warnings.push('Mantén la cabeza nivelada');
    }

    // 5. Verificar tamaño del rostro (debe ser suficientemente grande)
    const minFaceSize = 100; // píxeles
    if (faceData.bounds.width < minFaceSize || faceData.bounds.height < minFaceSize) {
        validations.isValid = false;
        validations.errors.push('Acércate más a la cámara');
    }

    // 6. Verificar que no esté muy lejos
    const maxFaceSize = 600; // píxeles
    if (faceData.bounds.width > maxFaceSize || faceData.bounds.height > maxFaceSize) {
        validations.warnings.push('Aléjate un poco de la cámara');
    }

    console.log('✅ Resultado validación:', validations.isValid ? 'VÁLIDO' : 'INVÁLIDO', validations.errors);

    return validations;
};

// Generar template facial a partir de las características
export const generateFacialTemplate = async (faceData, photoUri, empleadoId) => {
    try {
        console.log('🔐 Generando template facial para empleado:', empleadoId);

        const timestamp = Date.now();
        const deviceId = await getDeviceId();

        // Crear un objeto con toda la información facial
        const facialBiometric = {
            empleadoId,
            timestamp,
            deviceId,
            type: 'facial_vision_camera',

            // Características del rostro
            features: {
                // Geometría facial
                faceWidth: faceData.bounds.width,
                faceHeight: faceData.bounds.height,
                aspectRatio: faceData.bounds.width / faceData.bounds.height,

                // Ángulos
                rollAngle: faceData.rollAngle,
                yawAngle: faceData.yawAngle,
                pitchAngle: faceData.pitchAngle,

                // Expresión
                smilingProbability: faceData.smilingProbability,

                // Ojos
                leftEyeOpen: faceData.leftEyeOpenProbability,
                rightEyeOpen: faceData.rightEyeOpenProbability,

                // Landmarks (puntos de referencia normalizados)
                landmarks: normalizeLandmarks(faceData.landmarks, faceData.bounds)
            },

            // Metadata
            captureQuality: 'HIGH',
            securityLevel: 'HIGH',
            platform: Platform.OS
        };

        // Generar hash único del template
        const templateString = JSON.stringify(facialBiometric);
        const template = await generateTemplateHash(templateString);

        // Guardar datos localmente para verificación futura
        await SecureStore.setItemAsync(
            `facial_vision_${empleadoId}`,
            JSON.stringify({
                timestamp,
                template: template.substring(0, 200), // Solo una muestra
                features: facialBiometric.features
            })
        );

        return {
            success: true,
            template,
            timestamp,
            deviceId,
            photoUri // También devolvemos la URI de la foto
        };

    } catch (error) {
        console.error('Error al generar template facial:', error);
        throw new Error('Error al generar template facial');
    }
};

// Normalizar landmarks relativos al tamaño del rostro
const normalizeLandmarks = (landmarks, bounds) => {
    const normalized = {};

    Object.keys(landmarks).forEach(key => {
        if (landmarks[key]) {
            normalized[key] = {
                x: (landmarks[key].x - bounds.x) / bounds.width,
                y: (landmarks[key].y - bounds.y) / bounds.height
            };
        }
    });

    return normalized;
};

// Generar hash del template
const generateTemplateHash = async (data) => {
    try {
        // Crear hash único
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        const hashHex = Math.abs(hash).toString(16).padStart(8, '0');

        // Agregar entropía adicional
        const salt = Math.random().toString(36).substring(2, 20);
        const timestamp = Date.now().toString(36);

        const templateParts = [
            'facial_vc', // vision camera
            hashHex,
            salt,
            timestamp
        ].join('_');

        // Agregar más entropía
        const extraEntropy = Array.from({ length: 48 }, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join('');

        const finalTemplate = `${templateParts}_${extraEntropy}`;

        // Convertir a base64
        const base64Template = btoa(unescape(encodeURIComponent(finalTemplate)));

        return base64Template;

    } catch (error) {
        console.error('Error al generar hash:', error);
        throw error;
    }
};

// Obtener Device ID
const getDeviceId = async () => {
    try {
        let deviceId = await SecureStore.getItemAsync('deviceId');

        if (!deviceId) {
            deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            await SecureStore.setItemAsync('deviceId', deviceId);
        }

        return deviceId;
    } catch (error) {
        console.error('Error al obtener device ID:', error);
        return `device_fallback_${Date.now()}`;
    }
};

// Limpiar datos faciales locales
export const clearLocalFacialData = async (empleadoId) => {
    try {
        await SecureStore.deleteItemAsync(`facial_vision_${empleadoId}`);
        return { success: true };
    } catch (error) {
        console.error('Error al limpiar datos faciales:', error);
        return { success: false };
    }
};

// Verificar si existe registro facial local
export const checkLocalFacialData = async (empleadoId) => {
    try {
        const data = await SecureStore.getItemAsync(`facial_vision_${empleadoId}`);

        if (data) {
            const parsed = JSON.parse(data);
            return { exists: true, data: parsed };
        }

        return { exists: false };
    } catch (error) {
        console.error('Error al verificar datos faciales:', error);
        return { exists: false };
    }
};
