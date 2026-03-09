
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';






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


export const capturarHuellaDigital = async (empleadoId) => {
  try {


    const support = await checkBiometricSupport();
    if (!support.supported) {
      throw new Error(support.message);
    }

    if (!support.hasFingerprint) {
      throw new Error('Tu dispositivo no soporta lectura de huellas dactilares');
    }


    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Coloca tu dedo en el sensor',
      fallbackLabel: 'Usar código',
      disableDeviceFallback: false,
      cancelLabel: 'Cancelar'
    });


    if (!result.success) {
      throw new Error('Autenticación cancelada o fallida');
    }




    const timestamp = Date.now();
    const deviceId = await getDeviceId();
    const biometricData = {
      empleadoId,
      timestamp,
      deviceId,
      type: 'fingerprint',
      authSuccess: result.success,

      securityLevel: 'HIGH'
    };



    const template = await generateBiometricTemplate(biometricData);


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


export const capturarReconocimientoFacial = async (empleadoId) => {
  try {


    const support = await checkBiometricSupport();
    if (!support.supported) {
      throw new Error(support.message);
    }


    if (!support.hasFaceId) {
      throw new Error('Tu dispositivo no tiene Face ID o reconocimiento facial habilitado.\n\nPara Android: Activa el desbloqueo facial en Configuración > Seguridad.\nPara iOS: Configura Face ID en Ajustes.');
    }


    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Reconocimiento Facial',
      fallbackLabel: 'Usar PIN del dispositivo',
      disableDeviceFallback: false,
      cancelLabel: 'Cancelar'
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


const generateBiometricTemplate = async (data) => {
  try {

    const dataString = JSON.stringify(data);



    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }


    const hashHex = Math.abs(hash).toString(16).padStart(8, '0');


    const salt = Math.random().toString(36).substring(2, 15);
    const timestamp = data.timestamp.toString(36);
    const devicePart = data.deviceId.substring(0, 10);


    const templateParts = [
    hashHex,
    salt,
    timestamp,
    devicePart,
    data.type.substring(0, 4)].
    join('_');


    const extraEntropy = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
    ).join('');

    const finalTemplate = `${templateParts}_${extraEntropy}`;


    const base64Template = btoa(unescape(encodeURIComponent(finalTemplate)));


    return base64Template;

  } catch (error) {
    throw new Error('Error al generar template biométrico');
  }
};


const getDeviceId = async () => {
  try {
    let deviceId = await SecureStore.getItemAsync('deviceId');

    if (!deviceId) {

      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await SecureStore.setItemAsync('deviceId', deviceId);
    }

    return deviceId;
  } catch (error) {
    return `device_fallback_${Date.now()}`;
  }
};


export const limpiarDatosLocales = async (empleadoId) => {
  try {
    await SecureStore.deleteItemAsync(`fingerprint_${empleadoId}`);
    await SecureStore.deleteItemAsync(`facial_${empleadoId}`);
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};