// services/faceRecognitionService.js
// Servicio de reconocimiento facial usando backend con face-api.js
// Compatible con la implementación de Desktop

import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');

/**
 * Procesar imagen y generar descriptor facial en el backend
 * El backend usa face-api.js (igual que Desktop) para garantizar compatibilidad
 *
 * @param {string} imageUri - URI de la imagen capturada
 * @returns {Promise<Object>} - Descriptor facial en Base64
 */
export const processFaceImage = async (imageUri) => {
    try {
        console.log('📤 Enviando imagen al backend para procesamiento...');

        // Crear FormData para enviar la imagen
        const formData = new FormData();

        // Agregar la imagen al FormData
        const fileName = imageUri.split('/').pop();
        const fileType = fileName.split('.').pop();

        formData.append('image', {
            uri: imageUri,
            type: `image/${fileType}`,
            name: fileName
        });

        // Enviar al backend para procesar
        const response = await fetch(`${API_URL}/credenciales/facial/process-mobile`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del backend:', errorText);
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Descriptor recibido del backend');

        if (!result.success || !result.descriptor) {
            throw new Error(result.message || 'No se pudo extraer el descriptor facial');
        }

        return {
            success: true,
            descriptorBase64: result.descriptor,
            detectionInfo: result.detection
        };

    } catch (error) {
        console.error('❌ Error procesando imagen:', error);
        return {
            success: false,
            error: error.message || 'Error al procesar la imagen'
        };
    }
};

/**
 * Registrar descriptor facial para un empleado
 * Usa el mismo endpoint que Desktop
 *
 * @param {string} empleadoId - ID del empleado
 * @param {string} descriptorBase64 - Descriptor facial en Base64
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} - Resultado del registro
 */
export const registrarDescriptorFacial = async (empleadoId, descriptorBase64, token) => {
    try {
        console.log(`💾 Registrando descriptor facial para empleado ${empleadoId}...`);

        const response = await fetch(`${API_URL}/credenciales/facial`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                empleado_id: String(empleadoId).trim(),
                facial: descriptorBase64,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Error HTTP: ${response.status}`;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('✅ Descriptor facial registrado exitosamente');

        return {
            success: true,
            data: {
                id_credencial: result.id,
                descriptor_size: descriptorBase64.length,
                timestamp: new Date().toISOString(),
            },
        };

    } catch (error) {
        console.error('❌ Error registrando descriptor facial:', error);
        return {
            success: false,
            error: error.message || 'Error al registrar descriptor facial',
        };
    }
};

/**
 * Identificar usuario por descriptor facial
 * Usa el mismo endpoint que Desktop
 *
 * @param {string} descriptorBase64 - Descriptor facial en Base64
 * @returns {Promise<Object>} - Usuario identificado o error
 */
export const identificarPorFacial = async (descriptorBase64) => {
    try {
        console.log('🔍 Iniciando identificación facial...');

        const response = await fetch(`${API_URL}/credenciales/facial/identify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                facial: descriptorBase64,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Error HTTP: ${response.status}`;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('📨 Respuesta del backend:', result);

        if (!result.success || !result.data) {
            return {
                success: false,
                error: result.message || 'Rostro no reconocido en el sistema',
            };
        }

        const { empleado, matchScore } = result.data;
        console.log('👤 Empleado identificado:', empleado);

        return {
            success: true,
            usuario: empleado,
            matchScore: matchScore || 100,
        };

    } catch (error) {
        console.error('❌ Error en identificación facial:', error);
        return {
            success: false,
            error: error.message || 'Error al identificar rostro',
        };
    }
};

/**
 * Flujo completo: Capturar imagen → Procesar → Identificar
 *
 * @param {string} imageUri - URI de la imagen capturada
 * @returns {Promise<Object>} - Usuario identificado o error
 */
export const captureAndIdentify = async (imageUri) => {
    try {
        // 1. Procesar imagen y obtener descriptor
        console.log('🎯 Paso 1: Procesando imagen...');
        const processResult = await processFaceImage(imageUri);

        if (!processResult.success) {
            return {
                success: false,
                error: processResult.error
            };
        }

        // 2. Identificar usuario con el descriptor
        console.log('🎯 Paso 2: Identificando usuario...');
        const identifyResult = await identificarPorFacial(processResult.descriptorBase64);

        return identifyResult;

    } catch (error) {
        console.error('❌ Error en flujo completo:', error);
        return {
            success: false,
            error: error.message || 'Error en el proceso de identificación'
        };
    }
};

/**
 * Flujo completo: Capturar imagen → Procesar → Registrar
 *
 * @param {string} imageUri - URI de la imagen capturada
 * @param {string} empleadoId - ID del empleado
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} - Resultado del registro
 */
export const captureAndRegister = async (imageUri, empleadoId, token) => {
    try {
        // 1. Procesar imagen y obtener descriptor
        console.log('🎯 Paso 1: Procesando imagen...');
        const processResult = await processFaceImage(imageUri);

        if (!processResult.success) {
            return {
                success: false,
                error: processResult.error
            };
        }

        // 2. Registrar descriptor
        console.log('🎯 Paso 2: Registrando descriptor...');
        const registerResult = await registrarDescriptorFacial(
            empleadoId,
            processResult.descriptorBase64,
            token
        );

        return registerResult;

    } catch (error) {
        console.error('❌ Error en flujo completo:', error);
        return {
            success: false,
            error: error.message || 'Error en el proceso de registro'
        };
    }
};
