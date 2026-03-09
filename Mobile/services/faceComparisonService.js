



import * as SecureStore from 'expo-secure-store';








export const extractFaceFeatures = (faceData) => {
  try {
    const features = [];



    const leftEye = faceData.leftEyePosition || faceData.landmarks?.LEFT_EYE;
    const rightEye = faceData.rightEyePosition || faceData.landmarks?.RIGHT_EYE;
    const nose = faceData.noseBasePosition || faceData.landmarks?.NOSE_BASE;
    const mouth = faceData.mouthPosition || faceData.landmarks?.MOUTH_BOTTOM;
    const leftCheek = faceData.leftCheekPosition || faceData.landmarks?.LEFT_CHEEK;
    const rightCheek = faceData.rightCheekPosition || faceData.landmarks?.RIGHT_CHEEK;


    const faceWidth = faceData.bounds.width;
    const faceHeight = faceData.bounds.height;
    const aspectRatio = faceWidth / faceHeight;
    features.push(aspectRatio);


    features.push(normalizeAngle(faceData.rollAngle));
    features.push(normalizeAngle(faceData.yawAngle));
    features.push(normalizeAngle(faceData.pitchAngle || 0));


    if (leftEye && rightEye) {

      const eyeDistance = calculateDistance(leftEye, rightEye) / faceWidth;
      features.push(eyeDistance);


      const eyeCenter = {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2
      };


      if (nose) {
        const leftEyeToNose = calculateDistance(leftEye, nose) / faceWidth;
        const rightEyeToNose = calculateDistance(rightEye, nose) / faceWidth;
        features.push(leftEyeToNose, rightEyeToNose);

        const eyeCenterToNose = calculateDistance(eyeCenter, nose) / faceHeight;
        features.push(eyeCenterToNose);
      }


      if (mouth) {
        const leftEyeToMouth = calculateDistance(leftEye, mouth) / faceWidth;
        const rightEyeToMouth = calculateDistance(rightEye, mouth) / faceWidth;
        features.push(leftEyeToMouth, rightEyeToMouth);

        if (nose) {
          const noseToMouth = calculateDistance(nose, mouth) / faceHeight;
          features.push(noseToMouth);
        }
      }


      if (leftCheek) {
        const leftEyeToCheek = calculateDistance(leftEye, leftCheek) / faceWidth;
        features.push(leftEyeToCheek);
      }

      if (rightCheek) {
        const rightEyeToCheek = calculateDistance(rightEye, rightCheek) / faceWidth;
        features.push(rightEyeToCheek);
      }
    }


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




const calculateDistance = (point1, point2) => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};




const normalizeAngle = (angle) => {

  return angle / 180.0;
};









export const calculateSimilarity = (features1, features2) => {
  try {
    if (features1.length !== features2.length) {

      const minLength = Math.min(features1.length, features2.length);
      features1 = features1.slice(0, minLength);
      features2 = features2.slice(0, minLength);
    }


    let sumSquaredDiff = 0;
    for (let i = 0; i < features1.length; i++) {
      const diff = features1[i] - features2[i];
      sumSquaredDiff += diff * diff;
    }

    const distance = Math.sqrt(sumSquaredDiff);


    const maxDistance = Math.sqrt(features1.length);
    const normalizedDistance = distance / maxDistance;


    const similarity = Math.max(0, 1 - normalizedDistance);


    const similarityPercent = similarity * 100;

    return similarityPercent;
  } catch (error) {
    return 0;
  }
};









export const saveFaceFeatures = async (empleadoId, features, photoUri = null) => {
  try {
    const faceData = {
      empleadoId,
      features,
      timestamp: Date.now(),
      photoUri,
      version: '1.0'
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








export const verifyFace = async (empleadoId, currentFaceData) => {
  try {

    const savedResult = await getFaceFeatures(empleadoId);

    if (!savedResult.success) {
      return {
        success: false,
        verified: false,
        error: savedResult.error
      };
    }


    const currentFeatures = extractFaceFeatures(currentFaceData);


    const similarity = calculateSimilarity(
      currentFeatures,
      savedResult.data.features
    );


    const SIMILARITY_THRESHOLD = 65;

    const verified = similarity >= SIMILARITY_THRESHOLD;

    return {
      success: true,
      verified,
      similarity,
      threshold: SIMILARITY_THRESHOLD,
      message: verified ?
      'Rostro verificado exitosamente' :
      'El rostro no coincide con el registrado'
    };

  } catch (error) {
    return {
      success: false,
      verified: false,
      error: error.message || 'Error al verificar rostro'
    };
  }
};







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







export const hasFaceFeatures = async (empleadoId) => {
  try {
    const data = await SecureStore.getItemAsync(`face_features_${empleadoId}`);
    return data !== null;
  } catch (error) {
    return false;
  }
};