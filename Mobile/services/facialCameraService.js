// services/facialCameraService.js
// Wrapper service que usa visionCameraService internamente
// Mantiene compatibilidad con código existente mientras usa Vision Camera

import * as visionCameraService from './visionCameraService';

/**
 * Servicio para captura facial - Ahora usando react-native-vision-camera
 * Este archivo mantiene la API existente pero delega a visionCameraService
 */

// Re-exportar funciones de visionCameraService
export const requestCameraPermission = visionCameraService.requestCameraPermission;
export const checkCameraAvailability = visionCameraService.checkCameraAvailability;
export const processFaceData = visionCameraService.processFaceData;
export const validateFaceQuality = visionCameraService.validateFaceQuality;
export const generateFacialTemplate = visionCameraService.generateFacialTemplate;
export const clearLocalFacialData = visionCameraService.clearLocalFacialData;
export const checkLocalFacialData = visionCameraService.checkLocalFacialData;
