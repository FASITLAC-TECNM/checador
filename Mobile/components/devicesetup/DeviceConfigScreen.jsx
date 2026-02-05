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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { crearSolicitudMovil, reabrirSolicitudMovil, verificarCorreoEnEmpresa } from '../../services/solicitudMovilService';
import { detectDeviceInfo } from '../../services/deviceUtils';

const DEVICE_CONFIG = {
  title: "Configuración del Dispositivo",
  subtitle: "Paso 1 de 3",
  fields: [
    {
      id: "email",
      label: "Correo Electrónico",
      placeholder: "tu@email.com",
      icon: "mail-outline",
      type: "email",
      required: true,
      readonly: false,
      helpText: "Usa tu correo institucional"
    },
    {
      id: "registrationDate",
      label: "Fecha de Registro",
      placeholder: "YYYY-MM-DD",
      icon: "calendar-outline",
      type: "text",
      required: true,
      readonly: true,
      helpText: "Fecha automática del sistema"
    },
    {
      id: "macAddress",
      label: "Dirección MAC",
      placeholder: "00:00:00:00:00:00",
      icon: "hardware-chip-outline",
      type: "text",
      required: true,
      readonly: true,
      helpText: "Identificador único del dispositivo"
    },
    {
      id: "ipAddress",
      label: "Dirección IP",
      placeholder: "192.168.1.1",
      icon: "globe-outline",
      type: "text",
      required: true,
      readonly: true,
      helpText: "IP de la red actual"
    }
  ],
  deviceInfo: {
    title: "Información del Dispositivo Detectada"
  }
};

export const DeviceConfigScreen = ({ empresaId, empresaNombre, onNext, onPrevious, initialEmail, userData }) => {
  const insets = useSafeAreaInsets();
  const deviceConfig = DEVICE_CONFIG;
  
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
  const [solicitudExistente, setSolicitudExistente] = useState(null);
  
  // Estados para validación de correo
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [emailValidation, setEmailValidation] = useState({
    isValid: null,
    message: '',
    checked: false,
    usuario: null,
    empleadoId: null
  });

  // Efecto inicial: Detectar dispositivo y auto-llenar email
  useEffect(() => {
    initializeScreen();
  }, []);

  // Efecto secundario: Auto-validar email si viene pre-llenado
  useEffect(() => {
    if (formData.email && !emailValidation.checked && !isDetecting) {
      const timer = setTimeout(() => {
        handleEmailBlur();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.email, isDetecting]);

  const initializeScreen = async () => {
    try {
      setIsDetecting(true);
      
      // 1. Verificar solicitud rechazada existente
      const solicitudRechazadaId = await AsyncStorage.getItem('@solicitud_rechazada_id');
      const solicitudRechazadaToken = await AsyncStorage.getItem('@solicitud_rechazada_token');
      
      if (solicitudRechazadaId && solicitudRechazadaToken) {
        setSolicitudExistente({ id: solicitudRechazadaId, token: solicitudRechazadaToken });
      }
      
      // 2. Detectar información del dispositivo
      await detectDevice();
      
      // 3. Auto-llenar email desde userData, initialEmail o AsyncStorage
      let emailToUse = '';
      
      if (userData?.correo) {
        emailToUse = userData.correo;
      } else if (initialEmail) {
        emailToUse = initialEmail;
      } else {
        const savedEmail = await AsyncStorage.getItem('@user_email');
        if (savedEmail) {
          emailToUse = savedEmail;
        }
      }
      
      if (emailToUse) {
        setFormData(prev => ({ ...prev, email: emailToUse }));
      } else {
        // ❌ No se encontró email - esto es crítico
        Alert.alert(
          'Error de Configuración',
          'No se pudo obtener tu correo electrónico. Por favor, cierra sesión e intenta nuevamente.',
          [{ text: 'Entendido' }]
        );
      }
      
    } catch (error) {
      Alert.alert('Error', 'No se pudo inicializar la configuración del dispositivo');
    } finally {
      setIsDetecting(false);
    }
  };

  const detectDevice = async () => {
    try {

      const deviceData = await detectDeviceInfo();

      if (!deviceData) {
        throw new Error('No se pudo detectar la información del dispositivo');
      }

      setFormData(prev => ({
        ...prev,
        registrationDate: deviceData.registrationDate,
        macAddress: deviceData.macAddress,
        ipAddress: deviceData.ipAddress,
        deviceModel: deviceData.deviceInfo.model,
        os: deviceData.deviceInfo.os,
      }));


    } catch (error) {
      Alert.alert('Error', 'No se pudo detectar la información del dispositivo');
    }
  };

  const isValidEmailFormat = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailBlur = async () => {
    const emailTrimmed = formData.email.trim();
    
    if (!emailTrimmed) {
      setEmailValidation({
        isValid: null,
        message: '',
        checked: false,
        usuario: null,
        empleadoId: null
      });
      return;
    }

    if (!isValidEmailFormat(emailTrimmed)) {
      setEmailValidation({
        isValid: false,
        message: '✗ Formato de correo electrónico inválido',
        checked: true,
        usuario: null,
        empleadoId: null
      });
      return;
    }

    setIsValidatingEmail(true);
    
    try {
      const result = await verificarCorreoEnEmpresa(emailTrimmed, empresaId);
      
      
      // Marcar como válido si: existe Y activo Y (tiene usuario O está pendiente de validación)
      const esValido = result.existe && result.activo && (result.usuario || result.pendienteValidacion);
      
      if (esValido) {
        let mensaje = result.usuario 
          ? `✓ Correo verificado: ${result.usuario.nombre}`
          : `⚠️ ${result.mensaje || 'Correo pendiente de verificación'}`;
        
        setEmailValidation({
          isValid: true,
          message: mensaje,
          checked: true,
          usuario: result.usuario || { nombre: emailTrimmed.split('@')[0], correo: emailTrimmed },
          empleadoId: result.empleadoId
        });
      } else if (result.existe && !result.activo) {
        setEmailValidation({
          isValid: false,
          message: '✗ Este usuario está inactivo en la empresa',
          checked: true,
          usuario: null,
          empleadoId: null
        });
      } else {
        setEmailValidation({
          isValid: false,
          message: result.mensaje || `✗ Este correo no está registrado en ${empresaNombre}`,
          checked: true,
          usuario: null,
          empleadoId: null
        });
      }
    } catch (error) {
      
      setEmailValidation({
        isValid: false,
        message: '⚠️ No se pudo verificar el correo. Verifica tu conexión a internet.',
        checked: true,
        usuario: null,
        empleadoId: null
      });
    } finally {
      setIsValidatingEmail(false);
    }
  };

  const handleNext = async () => {
    const emailTrimmed = formData.email.trim().toLowerCase();
    
    if (!emailTrimmed) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    if (!emailValidation.checked || !emailValidation.isValid) {
      Alert.alert(
        'Validación Requerida',
        'Por favor verifica tu correo electrónico antes de continuar',
        [{ text: 'Validar ahora', onPress: handleEmailBlur }]
      );
      return;
    }

    if (!empresaId) {
      Alert.alert('Error', 'No se encontró el ID de la empresa');
      return;
    }

    setIsLoading(true);

    try {
      let response;

      if (solicitudExistente?.id) {
        
        const observaciones = `Reintento desde app móvil el ${formData.registrationDate}. Email: ${emailTrimmed}, SO: ${formData.os}`;
        response = await reabrirSolicitudMovil(solicitudExistente.id, observaciones);
        
        response.id = solicitudExistente.id;
        response.token_solicitud = solicitudExistente.token;
        
        await AsyncStorage.removeItem('@solicitud_rechazada_id');
        await AsyncStorage.removeItem('@solicitud_rechazada_token');
        
      } else {
        
        const solicitudData = {
          nombre: formData.deviceModel,
          correo: emailTrimmed,
          descripcion: `Dispositivo ${Platform.OS === 'ios' ? 'iOS' : 'Android'} - ${formData.deviceModel}`,
          ip: formData.ipAddress,
          mac: formData.macAddress,
          sistema_operativo: Platform.OS === 'ios' ? 'iOS' : 'Android',
          observaciones: `Registro desde app móvil el ${formData.registrationDate}. SO: ${formData.os}`,
          empresa_id: empresaId
        };

        response = await crearSolicitudMovil(solicitudData);
      }


      if (!response.token_solicitud) {
        throw new Error('No se recibió token de solicitud del servidor');
      }

      Alert.alert(
        solicitudExistente?.id ? '¡Solicitud Reabierta!' : '¡Solicitud Enviada!',
        solicitudExistente?.id 
          ? 'Tu solicitud ha sido reabierta y está pendiente de aprobación nuevamente.'
          : 'Tu solicitud ha sido enviada correctamente. Recibirás una notificación cuando sea aprobada.',
        [{ 
          text: 'Continuar', 
          onPress: () => {
            onNext({
              email: emailTrimmed,
              empresaId: empresaId,
              empresaNombre: empresaNombre,
              deviceInfo: {
                model: formData.deviceModel,
                os: formData.os,
                ip: formData.ipAddress,
                mac: formData.macAddress,
                registrationDate: formData.registrationDate
              },
              tokenSolicitud: response.token_solicitud,
              idSolicitud: response.id,
              nombreUsuario: emailValidation.usuario?.nombre || emailTrimmed.split('@')[0],
              empleadoId: emailValidation.empleadoId
            });
          }
        }]
      );

    } catch (error) {
      Alert.alert(
        'Error al Enviar',
        error.message || 'No se pudo enviar la solicitud. Por favor intenta nuevamente.',
        [
          { text: 'Reintentar', onPress: handleNext },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field) => {
    const isReadonly = field.readonly;
    const isEmailField = field.id === 'email';
    
    // ✅ El campo de email SIEMPRE es readonly (auto-detectado desde userData)
    const fieldIsReadonly = isReadonly || isEmailField;
    
    return (
      <View key={field.id} style={styles.fieldContainer}>
        <Text style={styles.label}>
          {field.label} {field.required && <Text style={styles.required}>*</Text>}
        </Text>
        <View style={[
          styles.inputWrapper, 
          fieldIsReadonly && styles.inputWrapperReadonly,
          isEmailField && emailValidation.checked && emailValidation.isValid && styles.inputWrapperValid,
          isEmailField && emailValidation.checked && !emailValidation.isValid && styles.inputWrapperInvalid
        ]}>
          <Ionicons
            name={field.icon}
            size={16}
            color={fieldIsReadonly ? '#9ca3af' : '#2563eb'}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, fieldIsReadonly && styles.inputReadonly]}
            placeholder={field.placeholder}
            placeholderTextColor="#9ca3af"
            value={formData[field.id]}
            onChangeText={(text) => setFormData(prev => ({ ...prev, [field.id]: text }))}
            keyboardType={field.type === 'email' ? 'email-address' : 'default'}
            autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
            editable={false} // ✅ TODOS los campos bloqueados (auto-detectados)
          />
          {fieldIsReadonly && (
            <Ionicons 
              name="checkmark-circle" 
              size={16} 
              color={isEmailField && emailValidation.isValid ? "#10b981" : "#10b981"} 
            />
          )}
          {isEmailField && isValidatingEmail && (
            <ActivityIndicator size="small" color="#2563eb" style={{ marginLeft: 8 }} />
          )}
        </View>
        
        {isEmailField && isValidatingEmail && (
          <Text style={styles.validatingText}>Verificando correo...</Text>
        )}
        {isEmailField && emailValidation.checked && emailValidation.message && (
          <Text style={[
            styles.validationMessage,
            emailValidation.isValid ? styles.validMessage : styles.invalidMessage
          ]}>
            {emailValidation.message}
          </Text>
        )}
        
        {isEmailField && !emailValidation.checked && (
          <Text style={styles.helpText}>
            ✓ Correo detectado automáticamente desde tu sesión
          </Text>
        )}
        
        {field.helpText && !isEmailField && (
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

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>{deviceConfig.title}</Text>
        <Text style={styles.headerSubtitle}>{deviceConfig.subtitle}</Text>
        
        <View style={styles.stepperContainer}>
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepActive}>
            <Text style={styles.stepActiveText}>3</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'android' ? 100 : 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {solicitudExistente && (
          <View style={styles.retryBadge}>
            <Ionicons name="refresh-circle" size={20} color="#f59e0b" />
            <Text style={styles.retryText}>Reintentando solicitud anterior</Text>
          </View>
        )}

        <View style={styles.empresaCard}>
          <Ionicons name="business" size={20} color="#2563eb" />
          <View style={styles.empresaInfo}>
            <Text style={styles.empresaLabel}>Empresa:</Text>
            <Text style={styles.empresaNombre}>{empresaNombre || empresaId}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          {deviceConfig.fields.map(renderField)}
        </View>

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

        <View style={styles.warningCard}>
          <Ionicons name="information-circle" size={20} color="#f59e0b" />
          <Text style={styles.warningText}>
            Esta información será enviada a tu administrador para aprobar el acceso de tu dispositivo.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom }]}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onPrevious}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={18} color="#6b7280" />
            <Text style={styles.backButtonText}>Anterior</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.nextButton, 
              (!emailValidation.isValid || isLoading || isValidatingEmail) && styles.nextButtonDisabled
            ]}
            onPress={handleNext}
            disabled={!emailValidation.isValid || isLoading || isValidatingEmail}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.nextButtonText, { marginLeft: 8 }]}>
                  {solicitudExistente ? 'Reabriendo...' : 'Enviando...'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {solicitudExistente ? 'Reabrir Solicitud' : 'Enviar Solicitud'}
                </Text>
                <Ionicons name="send" size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  stepComplete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActiveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#10b981',
    marginHorizontal: 6,
    maxWidth: 80,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  retryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  retryText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
    fontWeight: '600',
  },
  empresaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  empresaInfo: {
    flex: 1,
    marginLeft: 12,
  },
  empresaLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  empresaNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e40af',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
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
    paddingHorizontal: 12,
  },
  inputWrapperReadonly: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  inputWrapperValid: {
    borderColor: '#10b981',
    borderWidth: 2,
    backgroundColor: '#f0fdf4',
  },
  inputWrapperInvalid: {
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: '#374151',
  },
  inputReadonly: {
    color: '#6b7280',
  },
  helpText: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
    marginLeft: 2,
  },
  validatingText: {
    fontSize: 12,
    color: '#2563eb',
    marginTop: 6,
    marginLeft: 2,
  },
  validationMessage: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
  },
  validMessage: {
    color: '#10b981',
  },
  invalidMessage: {
    color: '#ef4444',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    marginLeft: 10,
    lineHeight: 18,
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});