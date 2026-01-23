// services/facialCameraService.js
import { Camera } from 'expo-camera';
import * as SecureStore from 'expo-secure-store';

/**
 * Servicio para captura facial usando la cámara
 * Similar a Mercado Libre, Uber, etc.
 */

// Solicitar permisos de cámara
export const requestCameraPermission = async () => {
    try {
        console.log('[Facial Camera] Solicitando permisos de cámara...');
        
        const { status } = await Camera.requestCameraPermissionsAsync();
        
        if (status !== 'granted') {
            console.log('[Facial Camera] ❌ Permisos de cámara denegados');
            return { 
                granted: false, 
                message: 'Se necesitan permisos de cámara para usar reconocimiento facial' 
            };
        }

        console.log('[Facial Camera] ✅ Permisos de cámara concedidos');
        return { granted: true };
        
    } catch (error) {
        console.error('[Facial Camera] Error solicitando permisos:', error);
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

        return {
            available: true,
            message: 'Cámara disponible'
        };
        
    } catch (error) {
        console.error('[Facial Camera] Error verificando disponibilidad:', error);
        return {
            available: false,
            message: 'Error al verificar la cámara'
        };
    }
};

// Procesar datos del rostro detectado
export const processFaceData = (face) => {
    console.log('[Facial Camera] Procesando datos del rostro...');
    
    // Extraer características clave del rostro
    const faceFeatures = {
        // Posición y tamaño
        bounds: {
            x: face.bounds.origin.x,
            y: face.bounds.origin.y,
            width: face.bounds.size.width,
            height: face.bounds.size.height
        },
        
        // Ángulos de rotación
        rollAngle: face.rollAngle,
        yawAngle: face.yawAngle,
        
        // Probabilidades de expresiones
        smilingProbability: face.smilingProbability,
        leftEyeOpenProbability: face.leftEyeOpenProbability,
        rightEyeOpenProbability: face.rightEyeOpenProbability,
        
        // Puntos de referencia del rostro
        landmarks: {}
    };

    // Agregar landmarks si están disponibles
    if (face.leftEyePosition) {
        faceFeatures.landmarks.leftEye = face.leftEyePosition;
    }
    if (face.rightEyePosition) {
        faceFeatures.landmarks.rightEye = face.rightEyePosition;
    }
    if (face.noseBasePosition) {
        faceFeatures.landmarks.nose = face.noseBasePosition;
    }
    if (face.bottomMouthPosition) {
        faceFeatures.landmarks.mouth = face.bottomMouthPosition;
    }
    if (face.leftCheekPosition) {
        faceFeatures.landmarks.leftCheek = face.leftCheekPosition;
    }
    if (face.rightCheekPosition) {
        faceFeatures.landmarks.rightCheek = face.rightCheekPosition;
    }

    return faceFeatures;
};

// Validar calidad del rostro capturado
export const validateFaceQuality = (faceData) => {
    const validations = {
        isValid: true,
        errors: [],
        warnings: []
    };

    // 1. Verificar que ambos ojos estén abiertos
    if (faceData.leftEyeOpenProbability < 0.5 || faceData.rightEyeOpenProbability < 0.5) {
        validations.isValid = false;
        validations.errors.push('Mantén los ojos abiertos');
    }

    // 2. Verificar que el rostro esté de frente (yaw angle cerca de 0)
    const yawThreshold = 15; // grados
    if (Math.abs(faceData.yawAngle) > yawThreshold) {
        validations.isValid = false;
        validations.errors.push('Mira directamente a la cámara');
    }

    // 3. Verificar inclinación de la cabeza (roll angle)
    const rollThreshold = 15; // grados
    if (Math.abs(faceData.rollAngle) > rollThreshold) {
        validations.warnings.push('Mantén la cabeza recta');
    }

    // 4. Verificar tamaño del rostro (debe ser suficientemente grande)
    const minFaceSize = 150; // píxeles
    if (faceData.bounds.width < minFaceSize || faceData.bounds.height < minFaceSize) {
        validations.isValid = false;
        validations.errors.push('Acércate más a la cámara');
    }

    // 5. Verificar que no esté muy lejos
    const maxFaceSize = 500; // píxeles
    if (faceData.bounds.width > maxFaceSize || faceData.bounds.height > maxFaceSize) {
        validations.warnings.push('Aléjate un poco de la cámara');
    }

    console.log('[Facial Camera] Validación del rostro:', validations);
    return validations;
};

// Generar template facial a partir de las características
export const generateFacialTemplate = async (faceData, photoUri, empleadoId) => {
    try {
        console.log('[Facial Camera] Generando template facial...');

        const timestamp = Date.now();
        const deviceId = await getDeviceId();

        // Crear un objeto con toda la información facial
        const facialBiometric = {
            empleadoId,
            timestamp,
            deviceId,
            type: 'facial_camera',
            
            // Características del rostro
            features: {
                // Geometría facial
                faceWidth: faceData.bounds.width,
                faceHeight: faceData.bounds.height,
                aspectRatio: faceData.bounds.width / faceData.bounds.height,
                
                // Ángulos
                rollAngle: faceData.rollAngle,
                yawAngle: faceData.yawAngle,
                
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
            securityLevel: 'HIGH'
        };

        // Generar hash único del template
        const templateString = JSON.stringify(facialBiometric);
        const template = await generateTemplateHash(templateString);

        console.log('[Facial Camera] ✅ Template facial generado exitosamente');
        console.log('[Facial Camera] Template size:', template.length, 'caracteres');

        // Guardar datos localmente para verificación futura
        await SecureStore.setItemAsync(
            `facial_camera_${empleadoId}`,
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
        console.error('[Facial Camera] ❌ Error generando template:', error);
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
            'facial',
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
        console.error('[Facial Camera] Error generando hash:', error);
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
            console.log('[Facial Camera] Nuevo Device ID generado:', deviceId);
        }
        
        return deviceId;
    } catch (error) {
        console.error('[Facial Camera] Error obteniendo device ID:', error);
        return `device_fallback_${Date.now()}`;
    }
};

// Limpiar datos faciales locales
export const clearLocalFacialData = async (empleadoId) => {
    try {
        console.log('[Facial Camera] Limpiando datos faciales locales...');
        await SecureStore.deleteItemAsync(`facial_camera_${empleadoId}`);
        console.log('[Facial Camera] ✅ Datos locales eliminados');
        return { success: true };
    } catch (error) {
        console.error('[Facial Camera] Error limpiando datos:', error);
        return { success: false };
    }
};

// Verificar si existe registro facial local
export const checkLocalFacialData = async (empleadoId) => {
    try {
        const data = await SecureStore.getItemAsync(`facial_camera_${empleadoId}`);
        
        if (data) {
            const parsed = JSON.parse(data);
            console.log('[Facial Camera] ✓ Datos faciales encontrados localmente');
            return { exists: true, data: parsed };
        }
        
        console.log('[Facial Camera] No hay datos faciales locales');
        return { exists: false };
    } catch (error) {
        console.error('[Facial Camera] Error verificando datos locales:', error);
        return { exists: false };
    }
};