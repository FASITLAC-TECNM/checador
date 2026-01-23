// services/biometric.service.js
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * Servicio para captura y gestión de datos biométricos
 */

// Verificar compatibilidad del dispositivo
export const checkBiometricSupport = async () => {
    try {
        console.log('[Biometric Service] Verificando soporte biométrico...');
        
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        console.log('[Biometric Service] ¿Tiene hardware biométrico?', hasHardware);
        
        if (!hasHardware) {
            return { 
                supported: false, 
                message: 'Tu dispositivo no tiene sensor biométrico' 
            };
        }

        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        console.log('[Biometric Service] ¿Tiene huellas registradas?', isEnrolled);
        
        if (!isEnrolled) {
            return { 
                supported: false, 
                message: 'No tienes huellas registradas en tu dispositivo. Ve a Ajustes > Seguridad para registrarlas.' 
            };
        }

        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        console.log('[Biometric Service] Tipos de autenticación soportados:', supportedTypes);

        return { 
            supported: true, 
            types: supportedTypes,
            hasFingerprint: supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
            hasFaceId: supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
        };
    } catch (error) {
        console.error('[Biometric Service] Error verificando soporte:', error);
        return { supported: false, message: 'Error al verificar soporte biométrico' };
    }
};

// Capturar huella dactilar
export const capturarHuellaDigital = async (empleadoId) => {
    try {
        console.log('[Biometric Service] Iniciando captura de huella para empleado:', empleadoId);
        
        // Verificar soporte
        const support = await checkBiometricSupport();
        if (!support.supported) {
            throw new Error(support.message);
        }

        if (!support.hasFingerprint) {
            throw new Error('Tu dispositivo no soporta lectura de huellas dactilares');
        }

        // Autenticar con huella
        console.log('[Biometric Service] Solicitando autenticación biométrica...');
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: '🔐 Coloca tu dedo en el sensor',
            fallbackLabel: 'Usar código',
            disableDeviceFallback: false,
            cancelLabel: 'Cancelar',
        });

        console.log('[Biometric Service] Resultado autenticación:', result);

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

        console.log('[Biometric Service] Datos biométricos generados:', biometricData);

        // Crear un hash único representativo
        const template = await generateBiometricTemplate(biometricData);
        console.log('[Biometric Service] Template generado (primeros 50 chars):', template.substring(0, 50) + '...');

        // Guardar localmente de forma segura
        await SecureStore.setItemAsync(
            `fingerprint_${empleadoId}`,
            JSON.stringify({ timestamp, template: template.substring(0, 100) })
        );
        console.log('[Biometric Service] ✓ Template guardado localmente de forma segura');

        return {
            success: true,
            template,
            timestamp,
            deviceId
        };

    } catch (error) {
        console.error('[Biometric Service] Error capturando huella:', error);
        throw error;
    }
};

// Capturar reconocimiento facial
export const capturarReconocimientoFacial = async (empleadoId) => {
    try {
        console.log('[Biometric Service] Iniciando captura facial para empleado:', empleadoId);
        
        const support = await checkBiometricSupport();
        if (!support.supported) {
            throw new Error(support.message);
        }

        if (!support.hasFaceId) {
            throw new Error('Tu dispositivo no soporta reconocimiento facial biométrico. Usa la cámara manual.');
        }

        console.log('[Biometric Service] Solicitando autenticación facial...');
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: '🔐 Mira a la cámara',
            fallbackLabel: 'Usar código',
            disableDeviceFallback: false,
            cancelLabel: 'Cancelar',
        });

        console.log('[Biometric Service] Resultado autenticación facial:', result);

        if (!result.success) {
            throw new Error('Autenticación facial cancelada o fallida');
        }

        const timestamp = Date.now();
        const deviceId = await getDeviceId();
        const facialData = {
            empleadoId,
            timestamp,
            deviceId,
            type: 'face',
            authSuccess: result.success,
            securityLevel: 'HIGH'
        };

        const template = await generateBiometricTemplate(facialData);
        console.log('[Biometric Service] Template facial generado');

        await SecureStore.setItemAsync(
            `facial_${empleadoId}`,
            JSON.stringify({ timestamp, template: template.substring(0, 100) })
        );

        return {
            success: true,
            template,
            timestamp,
            deviceId
        };

    } catch (error) {
        console.error('[Biometric Service] Error capturando facial:', error);
        throw error;
    }
};

// Verificar si existe huella registrada localmente
export const verificarHuellaLocal = async (empleadoId) => {
    try {
        console.log('[Biometric Service] Verificando huella local para empleado:', empleadoId);
        const data = await SecureStore.getItemAsync(`fingerprint_${empleadoId}`);
        
        if (data) {
            const parsed = JSON.parse(data);
            console.log('[Biometric Service] ✓ Huella local encontrada, registrada:', new Date(parsed.timestamp));
            return { exists: true, data: parsed };
        }
        
        console.log('[Biometric Service] No hay huella local registrada');
        return { exists: false };
    } catch (error) {
        console.error('[Biometric Service] Error verificando huella local:', error);
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
        
        console.log('[Biometric Service] Template generado exitosamente, tamaño:', base64Template.length);
        
        return base64Template;
        
    } catch (error) {
        console.error('[Biometric Service] Error generando template:', error);
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
            console.log('[Biometric Service] Nuevo Device ID generado:', deviceId);
        }
        
        return deviceId;
    } catch (error) {
        console.error('[Biometric Service] Error obteniendo device ID:', error);
        return `device_fallback_${Date.now()}`;
    }
};

// Limpiar datos biométricos locales
export const limpiarDatosLocales = async (empleadoId) => {
    try {
        console.log('[Biometric Service] Limpiando datos locales para empleado:', empleadoId);
        await SecureStore.deleteItemAsync(`fingerprint_${empleadoId}`);
        await SecureStore.deleteItemAsync(`facial_${empleadoId}`);
        console.log('[Biometric Service] ✓ Datos locales eliminados');
        return { success: true };
    } catch (error) {
        console.error('[Biometric Service] Error limpiando datos:', error);
        return { success: false };
    }
};