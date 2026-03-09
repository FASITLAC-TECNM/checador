
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import NetInfo from '@react-native-community/netinfo';

export const detectDeviceInfo = async () => {
  try {

    const deviceInfo = {
      model: Device.modelName || 'Desconocido',
      brand: Device.brand || 'Desconocido',
      os: Platform.OS === 'ios' ? `iOS ${Device.osVersion}` : `Android ${Device.osVersion}`,
      platform: Platform.OS,
      osVersion: Device.osVersion
    };


    const netInfo = await NetInfo.fetch();
    const ipAddress = netInfo.details?.ipAddress || '192.168.1.0';


    const today = new Date();
    const registrationDate = today.toISOString().split('T')[0];

    return {
      deviceInfo,
      ipAddress,
      registrationDate
    };
  } catch (error) {
    return null;
  }
};