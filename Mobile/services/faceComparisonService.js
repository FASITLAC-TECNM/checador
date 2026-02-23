// services/faceComparisonService.js
// Servicio para comparación facial usando características geométricas
// Compatible con react-native-vision-camera-face-detector

import * as SecureStore from 'expo-secure-store';

/**
 * Extraer características geométricas del rostro para crear un "descriptor"
 * Basado en distancias relativas entre landmarks y proporciones
 *
 * @param {Object} faceData - Datos del rostro de react-native-vision-camera-face-detector
 * @returns {Array} - Vector de características (descriptor simplificado)
 */
export const extractFaceFeatures = (faceData) => {
    try {
        const features = [];

        // Resolver landmarks: soporta tanto formato nuevo (landmarks.LEFT_EYE)
        // como formato mapeado (leftEyePosition) de FacialCaptureScreen
        const leftEye = faceData.leftEyePosition || faceData.landmarks?.LEFT_EYE;
        const rightEye = faceData.rightEyePosition || faceData.landmarks?.RIGHT_EYE;
        const nose = faceData.noseBasePosition || faceData.landmarks?.NOSE_BASE;
        const mouth = faceData.mouthPosition || faceData.landmarks?.MOUTH_BOTTOM;
        const leftCheek = faceData.leftCheekPosition || faceData.landmarks?.LEFT_CHEEK;
        const rightCheek = faceData.rightCheekPosition || faceData.landmarks?.RIGHT_CHEEK;

        // 1. Proporciones del rostro (normalizadas)
        const faceWidth = faceData.bounds.width;
        const faceHeight = faceData.bounds.height;
        const aspectRatio = faceWidth / faceHeight;
        features.push(aspectRatio);

        // 2. Ángulos faciales (normalizados entre -1 y 1)
        features.push(normalizeAngle(faceData.rollAngle));
        features.push(normalizeAngle(faceData.yawAngle));
        features.push(normalizeAngle(faceData.pitchAngle || 0));

        // 3. Distancias entre landmarks (normalizadas por tamaño del rostro)
        if (leftEye && rightEye) {
            // Distancia entre ojos
            const eyeDistance = calculateDistance(leftEye, rightEye) / faceWidth;
            features.push(eyeDistance);

            // Centro de los ojos (como punto de referencia)
            const eyeCenter = {
                x: (leftEye.x + rightEye.x) / 2,
                y: (leftEye.y + rightEye.y) / 2
            };

            // 4. Distancias desde ojos a nariz (si disponible)
            if (nose) {
                const leftEyeToNose = calculateDistance(leftEye, nose) / faceWidth;
                const rightEyeToNose = calculateDistance(rightEye, nose) / faceWidth;
                features.push(leftEyeToNose, rightEyeToNose);

                const eyeCenterToNose = calculateDistance(eyeCenter, nose) / faceHeight;
                features.push(eyeCenterToNose);
            }

            // 5. Distancias desde ojos a boca (si disponible)
            if (mouth) {
                const leftEyeToMouth = calculateDistance(leftEye, mouth) / faceWidth;
                const rightEyeToMouth = calculateDistance(rightEye, mouth) / faceWidth;
                features.push(leftEyeToMouth, rightEyeToMouth);

                if (nose) {
                    const noseToMouth = calculateDistance(nose, mouth) / faceHeight;
                    features.push(noseToMouth);
                }
            }

            // 6. Distancias a mejillas (si disponibles)
            if (leftCheek) {
                const leftEyeToCheek = calculateDistance(leftEye, leftCheek) / faceWidth;
                features.push(leftEyeToCheek);
            }

            if (rightCheek) {
                const rightEyeToCheek = calculateDistance(rightEye, rightCheek) / faceWidth;
                features.push(rightEyeToCheek);
            }
        }

        // 7. Posiciones relativas de landmarks (normalizadas)
        if (leftEye) {
            features.push(
                (leftEye.x - faceData.bounds.x) / faceWidth,
                (leftEye.y - faceData.bounds.y) / faceHeight
            );
        }

        if (rightEye) {
            features.push(
                (rightEye.x - faceData.bounds.x) / faceWidth,
                (rightEye.y - faceData.bounds.y) / faceHeight
            );
        }

        return features;
    } catch (error) {
        throw new Error('No se pudieron extraer características faciales');
    }
};

/**
 * Calcular distancia euclidiana entre dos puntos
 */
const calculateDistance = (point1, point2) => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Normalizar ángulo entre -1 y 1
 */
const normalizeAngle = (angle) => {
    // Asumimos que los ángulos están en el rango [-180, 180]
    return angle / 180.0;
};

/**
 * Calcular similitud entre dos vectores de características
 * Usa distancia euclidiana normalizada
 *
 * @param {Array} features1 - Vector de características 1
 * @param {Array} features2 - Vector de características 2
 * @returns {number} - Similitud en porcentaje (0-100)
 */
export const calculateSimilarity = (features1, features2) => {
    try {
        if (features1.length !== features2.length) {
            // Tomar el mínimo
            const minLength = Math.min(features1.length, features2.length);
            features1 = features1.slice(0, minLength);
            features2 = features2.slice(0, minLength);
        }

        // Calcular distancia euclidiana
        let sumSquaredDiff = 0;
        for (let i = 0; i < features1.length; i++) {
            const diff = features1[i] - features2[i];
            sumSquaredDiff += diff * diff;
        }

        const distance = Math.sqrt(sumSquaredDiff);

        // Normalizar distancia (asumiendo un rango típico de 0 a sqrt(features.length))
        const maxDistance = Math.sqrt(features1.length);
        const normalizedDistance = distance / maxDistance;

        // Convertir a similitud (0 = diferentes, 1 = idénticos)
        const similarity = Math.max(0, 1 - normalizedDistance);

        // Convertir a porcentaje
        const similarityPercent = similarity * 100;

        return similarityPercent;
    } catch (error) {
        return 0;
    }
};

/**
 * Guardar características faciales localmente
 *
 * @param {string} empleadoId - ID del empleado
 * @param {Array} features - Vector de características
 * @param {string} photoUri - URI de la foto (opcional)
 * @returns {Promise<Object>}
 */
export const saveFaceFeatures = async (empleadoId, features, photoUri = null) => {
    try {
        const faceData = {
            empleadoId,
            features,
            timestamp: Date.now(),
            photoUri,
            version: '1.0' // Por si necesitamos actualizar el formato
        };

        await SecureStore.setItemAsync(
            `face_features_${empleadoId}`,
            JSON.stringify(faceData)
        );

        return {
            success: true,
            message: 'Características faciales guardadas'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || 'Error al guardar características faciales'
        };
    }
};

/**
 * Obtener características faciales guardadas
 *
 * @param {string} empleadoId - ID del empleado
 * @returns {Promise<Object>}
 */
export const getFaceFeatures = async (empleadoId) => {
    try {
        const data = await SecureStore.getItemAsync(`face_features_${empleadoId}`);

        if (!data) {
            return {
                success: false,
                error: 'No hay características faciales registradas para este empleado'
            };
        }

        const faceData = JSON.parse(data);

        return {
            success: true,
            data: faceData
        };

    } catch (error) {
        return {
            success: false,
            error: error.message || 'Error al obtener características faciales'
        };
    }
};

/**
 * Verificar rostro actual contra el registrado
 *
 * @param {string} empleadoId - ID del empleado
 * @param {Object} currentFaceData - Datos del rostro actual
 * @returns {Promise<Object>} - Resultado de la verificación
 */
export const verifyFace = async (empleadoId, currentFaceData) => {
    try {
        // 1. Obtener características guardadas
        const savedResult = await getFaceFeatures(empleadoId);

        if (!savedResult.success) {
            return {
                success: false,
                verified: false,
                error: savedResult.error
            };
        }

        // 2. Extraer características del rostro actual
        const currentFeatures = extractFaceFeatures(currentFaceData);

        // 3. Comparar características
        const similarity = calculateSimilarity(
            currentFeatures,
            savedResult.data.features
        );

        // 4. Definir umbral de aceptación
        const SIMILARITY_THRESHOLD = 65; // 65% de similitud mínima

        const verified = similarity >= SIMILARITY_THRESHOLD;

        return {
            success: true,
            verified,
            similarity,
            threshold: SIMILARITY_THRESHOLD,
            message: verified
                ? 'Rostro verificado exitosamente'
                : 'El rostro no coincide con el registrado'
        };

    } catch (error) {
        return {
            success: false,
            verified: false,
            error: error.message || 'Error al verificar rostro'
        };
    }
};

/**
 * Eliminar características faciales guardadas
 *
 * @param {string} empleadoId - ID del empleado
 * @returns {Promise<Object>}
 */
export const deleteFaceFeatures = async (empleadoId) => {
    try {
        await SecureStore.deleteItemAsync(`face_features_${empleadoId}`);

        return {
            success: true,
            message: 'Características faciales eliminadas'
        };

    } catch (error) {
        return {
            success: false,
            error: error.message || 'Error al eliminar características faciales'
        };
    }
};

/**
 * Verificar si un empleado tiene características faciales registradas
 *
 * @param {string} empleadoId - ID del empleado
 * @returns {Promise<boolean>}
 */
export const hasFaceFeatures = async (empleadoId) => {
    try {
        const data = await SecureStore.getItemAsync(`face_features_${empleadoId}`);
        return data !== null;
    } catch (error) {
        return false;
    }
};
