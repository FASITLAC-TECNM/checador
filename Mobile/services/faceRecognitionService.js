



import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');








export const processFaceImage = async (imageUri) => {
  try {

    const formData = new FormData();


    const fileName = imageUri.split('/').pop();
    const fileType = fileName.split('.').pop();

    formData.append('image', {
      uri: imageUri,
      type: `image/${fileType}`,
      name: fileName
    });


    const response = await fetch(`${API_URL}/credenciales/facial/process-mobile`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error HTTP: ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (!result.success || !result.descriptor) {
      throw new Error(result.message || 'No se pudo extraer el descriptor facial');
    }

    return {
      success: true,
      descriptorBase64: result.descriptor,
      detectionInfo: result.detection
    };

  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error al procesar la imagen'
    };
  }
};











export const registrarDescriptorFacial = async (empleadoId, descriptorBase64, token) => {
  try {
    const response = await fetch(`${API_URL}/credenciales/facial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        empleado_id: String(empleadoId).trim(),
        facial: descriptorBase64
      })
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

    return {
      success: true,
      data: {
        id_credencial: result.id,
        descriptor_size: descriptorBase64.length,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error al registrar descriptor facial'
    };
  }
};








export const identificarPorFacial = async (descriptorBase64) => {
  try {
    const response = await fetch(`${API_URL}/credenciales/facial/identify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        facial: descriptorBase64
      })
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

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.message || 'Rostro no reconocido en el sistema'
      };
    }

    const { empleado, matchScore } = result.data;

    return {
      success: true,
      usuario: empleado,
      matchScore: matchScore || 100
    };

  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error al identificar rostro'
    };
  }
};







export const captureAndIdentify = async (imageUri) => {
  try {

    const processResult = await processFaceImage(imageUri);

    if (!processResult.success) {
      return {
        success: false,
        error: processResult.error
      };
    }


    const identifyResult = await identificarPorFacial(processResult.descriptorBase64);

    return identifyResult;

  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error en el proceso de identificación'
    };
  }
};









export const captureAndRegister = async (imageUri, empleadoId, token) => {
  try {

    const processResult = await processFaceImage(imageUri);

    if (!processResult.success) {
      return {
        success: false,
        error: processResult.error
      };
    }


    const registerResult = await registrarDescriptorFacial(
      empleadoId,
      processResult.descriptorBase64,
      token
    );

    return registerResult;

  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error en el proceso de registro'
    };
  }
};