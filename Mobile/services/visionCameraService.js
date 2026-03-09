
import { Camera } from 'react-native-vision-camera';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';







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
    return {
      granted: false,
      message: 'Error al solicitar permisos de cámara'
    };
  }
};


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
    return {
      available: false,
      message: 'Error al verificar la cámara'
    };
  }
};


export const processFaceData = (face) => {

  const leftEye = face.landmarks?.LEFT_EYE || face.leftEyePosition;
  const rightEye = face.landmarks?.RIGHT_EYE || face.rightEyePosition;
  const nose = face.landmarks?.NOSE_BASE || face.noseBasePosition;
  const mouth = face.landmarks?.MOUTH_BOTTOM || face.mouthPosition;
  const leftCheek = face.landmarks?.LEFT_CHEEK || face.leftCheekPosition;
  const rightCheek = face.landmarks?.RIGHT_CHEEK || face.rightCheekPosition;

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


export const validateFaceQuality = (faceData) => {
  const validations = {
    isValid: true,
    errors: [],
    warnings: []
  };


  if (faceData.leftEyeOpenProbability > 0 || faceData.rightEyeOpenProbability > 0) {
    if (faceData.leftEyeOpenProbability < 0.4 || faceData.rightEyeOpenProbability < 0.4) {
      validations.isValid = false;
      validations.errors.push('Mantén los ojos abiertos');
    }
  }


  const yawThreshold = 20;
  if (Math.abs(faceData.yawAngle) > yawThreshold) {
    validations.isValid = false;
    validations.errors.push('Mira directamente a la cámara');
  }


  const rollThreshold = 20;
  if (Math.abs(faceData.rollAngle) > rollThreshold) {
    validations.isValid = false;
    validations.errors.push('Mantén la cabeza recta');
  }


  const pitchThreshold = 15;
  if (Math.abs(faceData.pitchAngle) > pitchThreshold) {
    validations.warnings.push('Mantén la cabeza nivelada');
  }


  const minFaceSize = 100;
  if (faceData.bounds.width < minFaceSize || faceData.bounds.height < minFaceSize) {
    validations.isValid = false;
    validations.errors.push('Acércate más a la cámara');
  }


  const maxFaceSize = 600;
  if (faceData.bounds.width > maxFaceSize || faceData.bounds.height > maxFaceSize) {
    validations.warnings.push('Aléjate un poco de la cámara');
  }

  return validations;
};


export const generateFacialTemplate = async (faceData, photoUri, empleadoId) => {
  try {
    const timestamp = Date.now();
    const deviceId = await getDeviceId();


    const facialBiometric = {
      empleadoId,
      timestamp,
      deviceId,
      type: 'facial_vision_camera',


      features: {

        faceWidth: faceData.bounds.width,
        faceHeight: faceData.bounds.height,
        aspectRatio: faceData.bounds.width / faceData.bounds.height,


        rollAngle: faceData.rollAngle,
        yawAngle: faceData.yawAngle,
        pitchAngle: faceData.pitchAngle,


        smilingProbability: faceData.smilingProbability,


        leftEyeOpen: faceData.leftEyeOpenProbability,
        rightEyeOpen: faceData.rightEyeOpenProbability,


        landmarks: normalizeLandmarks(faceData.landmarks, faceData.bounds)
      },


      captureQuality: 'HIGH',
      securityLevel: 'HIGH',
      platform: Platform.OS
    };


    const templateString = JSON.stringify(facialBiometric);
    const template = await generateTemplateHash(templateString);


    await SecureStore.setItemAsync(
      `facial_vision_${empleadoId}`,
      JSON.stringify({
        timestamp,
        template: template.substring(0, 200),
        features: facialBiometric.features
      })
    );

    return {
      success: true,
      template,
      timestamp,
      deviceId,
      photoUri
    };

  } catch (error) {
    throw new Error('Error al generar template facial');
  }
};


const normalizeLandmarks = (landmarks, bounds) => {
  const normalized = {};

  Object.keys(landmarks).forEach((key) => {
    if (landmarks[key]) {
      normalized[key] = {
        x: (landmarks[key].x - bounds.x) / bounds.width,
        y: (landmarks[key].y - bounds.y) / bounds.height
      };
    }
  });

  return normalized;
};


const generateTemplateHash = async (data) => {
  try {

    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    const hashHex = Math.abs(hash).toString(16).padStart(8, '0');


    const salt = Math.random().toString(36).substring(2, 20);
    const timestamp = Date.now().toString(36);

    const templateParts = [
    'facial_vc',
    hashHex,
    salt,
    timestamp].
    join('_');


    const extraEntropy = Array.from({ length: 48 }, () =>
    Math.floor(Math.random() * 16).toString(16)
    ).join('');

    const finalTemplate = `${templateParts}_${extraEntropy}`;


    const base64Template = btoa(unescape(encodeURIComponent(finalTemplate)));

    return base64Template;

  } catch (error) {
    throw error;
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


export const clearLocalFacialData = async (empleadoId) => {
  try {
    await SecureStore.deleteItemAsync(`facial_vision_${empleadoId}`);
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};


export const checkLocalFacialData = async (empleadoId) => {
  try {
    const data = await SecureStore.getItemAsync(`facial_vision_${empleadoId}`);

    if (data) {
      const parsed = JSON.parse(data);
      return { exists: true, data: parsed };
    }

    return { exists: false };
  } catch (error) {
    return { exists: false };
  }
};