import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import NetInfo from '@react-native-community/netinfo';
import config from './config/onboardingConfig.json';
import { crearSolicitudMovil } from './services/solicitudMovilService';

export const DeviceConfigScreen = ({ onNext, onPrevious }) => {
  const { deviceConfig } = config;
  const [formData, setFormData] = useState({
    email: '',
    registrationDate: '',
    macAddress: '',
    ipAddress: '',
    deviceModel: '',
    os: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    detectDeviceInfo();
  }, []);

  const detectDeviceInfo = async () => {
    try {
      setIsDetecting(true);

      // Obtener información del dispositivo
      const deviceModel = Device.modelName || (Platform.OS === 'ios' ? 'iPhone' : 'Android Device');
      const osVersion = Device.osVersion || Platform.Version;
      const os = Platform.OS === 'ios' ? `iOS ${osVersion}` : `Android ${osVersion}`;

      // Obtener información de red
      let ipAddress = '192.168.1.0';
      try {
        const netInfo = await NetInfo.fetch();
        ipAddress = netInfo.details?.ipAddress || `192.168.1.${Math.floor(Math.random() * 255)}`;
      } catch (error) {
        console.log('No se pudo obtener IP real, usando simulada');
      }

      // Generar MAC simulada
      const macAddress = generateMacAddress();

      // Fecha actual
      const today = new Date();
      const registrationDate = today.toISOString().split('T')[0];

      setFormData(prev => ({
        ...prev,
        registrationDate,
        macAddress,
        ipAddress,
        deviceModel,
        os,
      }));

      setIsDetecting(false);
    } catch (error) {
      console.error('Error detectando información del dispositivo:', error);
      Alert.alert('Error', 'No se pudo detectar la información del dispositivo');
      setIsDetecting(false);
    }
  };

  const generateMacAddress = () => {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
      if (i > 0) mac += ':';
      mac += hex.charAt(Math.floor(Math.random() * 16));
      mac += hex.charAt(Math.floor(Math.random() * 16));
    }
    return mac;
  };

  const handleNext = async () => {
    // Validaciones
    if (!formData.email) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert('Error', 'Por favor ingresa un correo válido');
      return;
    }

    setIsLoading(true);

    try {
      console.log('📱 Enviando solicitud de dispositivo móvil...');

      // Preparar datos para el servidor
      const solicitudData = {
        nombre: formData.deviceModel,
        correo: formData.email,
        descripcion: `Dispositivo ${Platform.OS === 'ios' ? 'iOS' : 'Android'} - ${formData.deviceModel}`,
        ip: formData.ipAddress,
        mac: formData.macAddress,
        sistema_operativo: Platform.OS === 'ios' ? 'iOS' : 'Android',
        observaciones: `Registro desde app móvil el ${formData.registrationDate}. SO: ${formData.os}`
      };

      console.log('📤 Datos a enviar:', solicitudData);

      // Enviar solicitud al servidor
      const response = await crearSolicitudMovil(solicitudData);

      console.log('✅ Respuesta del servidor:', response);

      // Verificar que se recibió un token
      if (!response.token_solicitud) {
        throw new Error('No se recibió token de solicitud del servidor');
      }

      Alert.alert(
        '¡Solicitud Enviada!',
        'Tu solicitud ha sido enviada correctamente. Recibirás una notificación cuando sea aprobada.',
        [{ text: 'Continuar', onPress: () => {
          // Pasar los datos completos incluyendo el token
          onNext({
            email: formData.email,
            deviceInfo: {
              model: formData.deviceModel,
              os: formData.os,
              ip: formData.ipAddress,
              mac: formData.macAddress,
              registrationDate: formData.registrationDate
            },
            tokenSolicitud: response.token_solicitud,
            idSolicitud: response.id
          });
        }}]
      );

    } catch (error) {
      console.error('❌ Error al enviar solicitud:', error);
      Alert.alert(
        'Error al Enviar',
        error.message || 'No se pudo enviar la solicitud. Por favor intenta nuevamente.',
        [
          {
            text: 'Reintentar',
            onPress: handleNext
          },
          {
            text: 'Cancelar',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field) => {
    const isReadonly = field.readonly;
    
    return (
      <View key={field.id} style={styles.fieldContainer}>
        <Text style={styles.label}>
          {field.label} {field.required && <Text style={styles.required}>*</Text>}
        </Text>
        <View style={[styles.inputWrapper, isReadonly && styles.inputWrapperReadonly]}>
          <Ionicons
            name={field.icon}
            size={16}
            color={isReadonly ? '#9ca3af' : '#2563eb'}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, isReadonly && styles.inputReadonly]}
            placeholder={field.placeholder}
            placeholderTextColor="#9ca3af"
            value={formData[field.id]}
            onChangeText={(text) => setFormData(prev => ({ ...prev, [field.id]: text }))}
            keyboardType={field.type === 'email' ? 'email-address' : 'default'}
            autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
            editable={!isReadonly}
          />
          {isReadonly && (
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          )}
        </View>
        {field.helpText && (
          <Text style={styles.helpText}>{field.helpText}</Text>
        )}
      </View>
    );
  };

  if (isDetecting) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Detectando información del dispositivo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{deviceConfig.title}</Text>
        <Text style={styles.headerSubtitle}>{deviceConfig.subtitle}</Text>
      </View>

      {/* Form */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {deviceConfig.fields.map(renderField)}
        </View>

        {/* Device Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{deviceConfig.deviceInfo.title}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Modelo:</Text>
            <Text style={styles.infoValue}>{formData.deviceModel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SO:</Text>
            <Text style={styles.infoValue}>{formData.os}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plataforma:</Text>
            <Text style={styles.infoValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
          </View>
        </View>

        {/* Warning Card */}
        <View style={styles.warningCard}>
          <Ionicons name="information-circle" size={20} color="#f59e0b" />
          <Text style={styles.warningText}>
            Esta información será enviada a tu administrador para aprobar el acceso de tu dispositivo.
          </Text>
        </View>
      </ScrollView>

      {/* Footer with Stepper */}
      <View style={styles.footer}>
        <View style={styles.stepper}>
          <View style={styles.stepActive}>
            <Text style={styles.stepActiveText}>1</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepInactiveText}>2</Text>
          </View>
          <View style={styles.stepLineInactive} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepInactiveText}>3</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.nextButton, (!formData.email || isLoading) && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!formData.email || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={[styles.nextButtonText, { marginLeft: 8 }]}>Enviando...</Text>
            </>
          ) : (
            <>
              <Text style={styles.nextButtonText}>Enviar Solicitud</Text>
              <Ionicons name="send" size={16} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    padding: 12,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 90,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  fieldContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  required: {
    color: '#ef4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
  },
  inputWrapperReadonly: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  inputIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: 36,
    fontSize: 13,
    color: '#374151',
  },
  inputReadonly: {
    color: '#6b7280',
  },
  helpText: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
    marginLeft: 2,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1f2937',
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: '#92400e',
    marginLeft: 8,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActiveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepInactive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepInactiveText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#2563eb',
    marginHorizontal: 4,
  },
  stepLineInactive: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  nextButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 6,
  },
});