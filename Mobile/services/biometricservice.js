// services/biometric.service.js
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Servicio para captura y gestión de datos biométricos
 */

// Verificar compatibilidad del dispositivo
export const checkBiometricSupport = async () => {
    try {

        const hasHardware = await LocalAuthentication.hasHardwareAsync();

        if (!hasHardware) {
            return {
                supported: false,
                message: 'Tu dispositivo no tiene sensor biométrico'
            };
        }

        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!isEnrolled) {
            return {
                supported: false,
                message: 'No tienes huellas registradas en tu dispositivo. Ve a Ajustes > Seguridad para registrarlas.'
            };
        }

        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

        return {
            supported: true,
            types: supportedTypes,
            hasFingerprint: supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
            hasFaceId: supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
        };
    } catch (error) {
        return { supported: false, message: 'Error al verificar soporte biométrico' };
    }
};

// Capturar huella dactilar
export const capturarHuellaDigital = async (empleadoId) => {
    try {

        // Verificar soporte
        const support = await checkBiometricSupport();
        if (!support.supported) {
            throw new Error(support.message);
        }

        if (!support.hasFingerprint) {
            throw new Error('Tu dispositivo no soporta lectura de huellas dactilares');
        }

        // Autenticar con huella
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Coloca tu dedo en el sensor',
            fallbackLabel: 'Usar código',
            disableDeviceFallback: false,
            cancelLabel: 'Cancelar',
        });


        if (!result.success) {
            throw new Error('Autenticación cancelada o fallida');
        }

        // Generar template único basado en la autenticación exitosa
        // En producción, aquí usarías un SDK específico del fabricante para obtener el template real
        // Por ahora, generamos un hash único y seguro
        const timestamp = Date.now();
        const deviceId = await getDeviceId();
        const biometricData = {
            empleadoId,
            timestamp,
            deviceId,
            type: 'fingerprint',
            authSuccess: result.success,
            // En producción aquí iría el template real del sensor
            securityLevel: 'HIGH'
        };


        // Crear un hash único representativo
        const template = await generateBiometricTemplate(biometricData);

        // Guardar localmente de forma segura
        await SecureStore.setItemAsync(
            `fingerprint_${empleadoId}`,
            JSON.stringify({ timestamp, template: template.substring(0, 100) })
        );

        return {
            success: true,
            template,
            timestamp,
            deviceId
        };

    } catch (error) {
        throw error;
    }
};

// Capturar reconocimiento facial usando LocalAuthentication
export const capturarReconocimientoFacial = async (empleadoId) => {
    try {

        // 1. Verificar soporte biométrico general
        const support = await checkBiometricSupport();
        if (!support.supported) {
            throw new Error(support.message);
        }

        // 2. Verificar específicamente Face ID / Reconocimiento Facial
        if (!support.hasFaceId) {
            throw new Error('Tu dispositivo no tiene Face ID o reconocimiento facial habilitado.\n\nPara Android: Activa el desbloqueo facial en Configuración > Seguridad.\nPara iOS: Configura Face ID en Ajustes.');
        }

        // 3. Solicitar autenticación facial
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Reconocimiento Facial',
            fallbackLabel: 'Usar PIN del dispositivo',
            disableDeviceFallback: false,
            cancelLabel: 'Cancelar',
        });

        if (!result.success) {
            if (result.error === 'user_cancel') {
                throw new Error('Autenticación cancelada');
            } else if (result.error === 'lockout') {
                throw new Error('Demasiados intentos fallidos. Intenta de nuevo más tarde.');
            } else if (result.error === 'not_enrolled') {
                throw new Error('No tienes configurado reconocimiento facial en tu dispositivo.');
            } else {
                throw new Error('Autenticación facial fallida. Intenta de nuevo.');
            }
        }

        // 4. Generar template biométrico único
        const timestamp = Date.now();
        const deviceId = await getDeviceId();
        const facialData = {
            empleadoId,
            timestamp,
            deviceId,
            type: 'facial_recognition',
            authSuccess: result.success,
            securityLevel: 'HIGH',
            platform: Platform.OS
        };

        const template = await generateBiometricTemplate(facialData);

        // 5. Guardar localmente de forma segura
        await SecureStore.setItemAsync(
            `facial_${empleadoId}`,
            JSON.stringify({
                timestamp,
                template: template.substring(0, 100),
                registered: true,
                platform: Platform.OS
            })
        );

        return {
            success: true,
            template,
            timestamp,
            deviceId,
            type: 'facial_recognition'
        };

    } catch (error) {
        throw error;
    }
};

// Verificar si existe huella registrada localmente
export const verificarHuellaLocal = async (empleadoId) => {
    try {
        const data = await SecureStore.getItemAsync(`fingerprint_${empleadoId}`);

        if (data) {
            const parsed = JSON.parse(data);
            return { exists: true, data: parsed };
        }

        return { exists: false };
    } catch (error) {
        return { exists: false };
    }
};

// Generar template biométrico (simulado - en producción usar SDK real)
const generateBiometricTemplate = async (data) => {
    try {
        // Crear un hash único basado en múltiples factores
        const dataString = JSON.stringify(data);

        // Generar un hash simulado usando algoritmo simple pero único
        // En producción esto vendría del SDK del sensor biométrico
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32bit integer
        }

        // Convertir hash a hexadecimal
        const hashHex = Math.abs(hash).toString(16).padStart(8, '0');

        // Agregar datos adicionales para mayor unicidad
        const salt = Math.random().toString(36).substring(2, 15);
        const timestamp = data.timestamp.toString(36);
        const devicePart = data.deviceId.substring(0, 10);

        // Crear template único combinando varios factores
        const templateParts = [
            hashHex,
            salt,
            timestamp,
            devicePart,
            data.type.substring(0, 4)
        ].join('_');

        // Generar más entropía
        const extraEntropy = Array.from({ length: 32 }, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join('');

        const finalTemplate = `${templateParts}_${extraEntropy}`;

        // Convertir a base64 para transmisión
        const base64Template = btoa(unescape(encodeURIComponent(finalTemplate)));


        return base64Template;

    } catch (error) {
        throw new Error('Error al generar template biométrico');
    }
};

// Obtener ID único del dispositivo
const getDeviceId = async () => {
    try {
        let deviceId = await SecureStore.getItemAsync('deviceId');

        if (!deviceId) {
            // Generar nuevo ID único para el dispositivo
            deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            await SecureStore.setItemAsync('deviceId', deviceId);
        }

        return deviceId;
    } catch (error) {
        return `device_fallback_${Date.now()}`;
    }
};

// Limpiar datos biométricos locales
export const limpiarDatosLocales = async (empleadoId) => {
    try {
        await SecureStore.deleteItemAsync(`fingerprint_${empleadoId}`);
        await SecureStore.deleteItemAsync(`facial_${empleadoId}`);
        return { success: true };
    } catch (error) {
        return { success: false };
    }
};