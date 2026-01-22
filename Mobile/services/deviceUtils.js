// utils/deviceUtils.js
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import NetInfo from '@react-native-community/netinfo';

export const detectDeviceInfo = async () => {
  try {
    // Obtener información del dispositivo
    const deviceInfo = {
      model: Device.modelName || 'Desconocido',
      brand: Device.brand || 'Desconocido',
      os: Platform.OS === 'ios' ? `iOS ${Device.osVersion}` : `Android ${Device.osVersion}`,
      platform: Platform.OS,
      osVersion: Device.osVersion,
    };

    // Obtener información de red
    const netInfo = await NetInfo.fetch();
    const ipAddress = netInfo.details?.ipAddress || '192.168.1.0';

    // Generar MAC simulada (no disponible en dispositivos modernos)
    const macAddress = generateMacAddress();

    // Fecha actual
    const today = new Date();
    const registrationDate = today.toISOString().split('T')[0];

    return {
      deviceInfo,
      ipAddress,
      macAddress,
      registrationDate,
    };
  } catch (error) {
    console.error('Error detectando información del dispositivo:', error);
    return null;
  }
};

export const generateMacAddress = () => {
  const hex = '0123456789ABCDEF';
  let mac = '';
  for (let i = 0; i < 6; i++) {
    if (i > 0) mac += ':';
    mac += hex.charAt(Math.floor(Math.random() * 16));
    mac += hex.charAt(Math.floor(Math.random() * 16));
  }
  return mac;
};