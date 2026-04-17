import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
  Modal,
  ScrollView
} from
  'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { crearSolicitudMovil, reabrirSolicitudMovil, verificarCorreoEnEmpresa } from '../../services/solicitudMovilService';
import { detectDeviceInfo } from '../../services/deviceUtils';

const DEVICE_CONFIG = {
  title: "Configuración del Dispositivo",
  subtitle: "Paso 2 de 3",
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
      placeholder: "AA:BB:CC:DD:EE:FF",
      icon: "hardware-chip-outline",
      type: "text",
      required: true,
      readonly: false,
      helpText: "Ingresa la dirección MAC de tu dispositivo\n(Formato: XX:XX:XX:XX:XX:XX)"
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
    }],

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
    os: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(true);
  const [solicitudExistente, setSolicitudExistente] = useState(null);
  const [showMacHelp, setShowMacHelp] = useState(false);


  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [emailValidation, setEmailValidation] = useState({
    isValid: null,
    message: '',
    checked: false,
    usuario: null,
    empleadoId: null
  });


  useEffect(() => {
    initializeScreen();
  }, []);


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

      const solicitudRechazadaId = await AsyncStorage.getItem('@solicitud_rechazada_id');
      const solicitudRechazadaToken = await AsyncStorage.getItem('@solicitud_rechazada_token');

      if (solicitudRechazadaId && solicitudRechazadaToken) {
        setSolicitudExistente({ id: solicitudRechazadaId, token: solicitudRechazadaToken });
      }

      await detectDevice();

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
        setFormData((prev) => ({ ...prev, email: emailToUse }));
      } else {
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

      setFormData((prev) => ({
        ...prev,
        registrationDate: deviceData.registrationDate,
        ipAddress: deviceData.ipAddress,
        deviceModel: deviceData.deviceInfo.model,
        os: deviceData.deviceInfo.os
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
      // Si el correo coincide con el del usuario autenticado, aceptar directamente sin llamada API
      if (userData?.correo && emailTrimmed === userData.correo.trim().toLowerCase()) {
        setEmailValidation({
          isValid: true,
          message: `Correo verificado: ${userData.nombre || emailTrimmed.split('@')[0]}`,
          checked: true,
          usuario: { id: userData.id, nombre: userData.nombre, correo: emailTrimmed },
          empleadoId: userData.empleado_id || null
        });
        setIsValidatingEmail(false);
        return;
      }

      // Usar token personal si está disponible para no usar el token-movil del storage
      const tokenParaVerificar = userData?.token || null;
      const result = await verificarCorreoEnEmpresa(emailTrimmed, empresaId, tokenParaVerificar);

      const esValido = result.existe && result.activo && (result.usuario || result.pendienteValidacion);

      if (esValido) {
        let mensaje = result.usuario ?
          `Correo verificado: ${result.usuario.nombre}` :
          `[Atención] ${result.mensaje || 'Correo pendiente de verificación'}`;
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
        message: 'No se pudo verificar el correo. Verifica tu conexión a internet.',
        checked: true,
        usuario: null,
        empleadoId: null
      });
    } finally {
      setIsValidatingEmail(false);
    }
  };

  const isValidMacFormat = (mac) => {
    const macRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
    return macRegex.test(mac);
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

    const macTrimmed = formData.macAddress.trim().toUpperCase();
    if (!macTrimmed) {
      Alert.alert('Error', 'Por favor ingresa la dirección MAC de tu dispositivo');
      return;
    }
    if (!isValidMacFormat(macTrimmed)) {
      Alert.alert('Formato Inválido', 'La dirección MAC debe tener el formato XX:XX:XX:XX:XX:XX (ejemplo: A1:B2:C3:D4:E5:F6)');
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
        solicitudExistente?.id ?
          'Tu solicitud ha sido reabierta y está pendiente de aprobación nuevamente.' :
          'Tu solicitud ha sido enviada correctamente. Recibirás una notificación cuando sea aprobada.',
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
          { text: 'Cancelar', style: 'cancel' }]

      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field) => {
    const isReadonly = field.readonly;
    const isEmailField = field.id === 'email';
    const isMacField = field.id === 'macAddress';



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
          isEmailField && emailValidation.checked && !emailValidation.isValid && styles.inputWrapperInvalid]
        }>
          <Ionicons
            name={field.icon}
            size={15}
            color={fieldIsReadonly ? '#9ca3af' : '#2563eb'}
            style={styles.inputIcon} />

          <TextInput
            style={[styles.input, fieldIsReadonly && styles.inputReadonly]}
            placeholder={field.placeholder}
            placeholderTextColor="#9ca3af"
            value={formData[field.id]}
            onChangeText={(text) => {
              if (isMacField) {

                const clean = text.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 12);
                let formatted = '';
                for (let i = 0; i < clean.length; i++) {
                  if (i > 0 && i % 2 === 0) formatted += ':';
                  formatted += clean[i];
                }
                setFormData((prev) => ({ ...prev, [field.id]: formatted }));
              } else {
                setFormData((prev) => ({ ...prev, [field.id]: text }));
              }
            }}
            keyboardType={isMacField ? 'default' : field.type === 'email' ? 'email-address' : 'default'}
            autoCapitalize={isMacField ? 'characters' : field.type === 'email' ? 'none' : 'sentences'}
            editable={isMacField ? true : false} />

          {fieldIsReadonly &&
            <Ionicons
              name="checkmark-circle"
              size={15}
              color="#10b981" />

          }
          {isEmailField && isValidatingEmail &&
            <ActivityIndicator size="small" color="#2563eb" style={{ marginLeft: 6 }} />
          }
        </View>

        {isEmailField && isValidatingEmail &&
          <Text style={styles.validatingText}>Verificando correo...</Text>
        }
        {isEmailField && emailValidation.checked && emailValidation.message &&
          <Text style={[
            styles.validationMessage,
            emailValidation.isValid ? styles.validMessage : styles.invalidMessage]
          }>
            {emailValidation.message}
          </Text>
        }

        {isEmailField && !emailValidation.checked &&
          <Text style={styles.helpText}>
            ✓ Correo detectado automáticamente desde tu sesión
          </Text>
        }

        {field.helpText && !isEmailField &&
          <Text style={styles.helpText}>{field.helpText}</Text>
        }

        { }
        {isMacField &&
          <TouchableOpacity
            style={styles.macHelpButton}
            onPress={() => setShowMacHelp(true)}
            activeOpacity={0.7}>

            <Ionicons name="help-circle-outline" size={16} color="#4f46e5" />
            <Text style={styles.macHelpButtonText}>¿Cómo encuentro mi dirección MAC Wi-Fi?</Text>
          </TouchableOpacity>
        }
      </View>);

  };

  if (isDetecting) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Detectando información del dispositivo...</Text>
      </View>);

  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

      { }
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 16 : insets.top + 8 }]}>
        <Text style={styles.headerTitle}>{deviceConfig.title}</Text>
        <Text style={styles.headerSubtitle}>{deviceConfig.subtitle}</Text>

        <View style={styles.stepperContainer}>
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepActive}>
            <Text style={styles.stepActiveText}>2</Text>
          </View>
          <View style={styles.stepLineInactive} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepInactiveText}>3</Text>
          </View>
        </View>
      </View>

      { }
      <View style={styles.contentArea}>
        {solicitudExistente &&
          <View style={styles.retryBadge}>
            <Ionicons name="refresh-circle" size={18} color="#f59e0b" />
            <Text style={styles.retryText}>Reintentando solicitud anterior</Text>
          </View>
        }

        <View style={styles.empresaCard}>
          <Ionicons name="business" size={18} color="#2563eb" />
          <View style={styles.empresaInfo}>
            <Text style={styles.empresaLabel}>Empresa:</Text>
            <Text style={styles.empresaNombre}>{empresaNombre || empresaId}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          {deviceConfig.fields.map(renderField)}
        </View>

        <View style={styles.deviceInfoRow}>
          <View style={styles.deviceInfoChip}>
            <Ionicons name="phone-portrait-outline" size={12} color="#2563eb" />
            <Text style={styles.deviceInfoChipText}>{formData.deviceModel}</Text>
          </View>
          <View style={styles.deviceInfoChip}>
            <Ionicons name="logo-android" size={12} color="#2563eb" />
            <Text style={styles.deviceInfoChipText}>{formData.os}</Text>
          </View>
          <View style={styles.deviceInfoChip}>
            <Ionicons name="layers-outline" size={12} color="#2563eb" />
            <Text style={styles.deviceInfoChipText}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
          </View>
        </View>
      </View>

      { }
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 16) : insets.bottom + 8 }]}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onPrevious}
            activeOpacity={0.8}
            disabled={isLoading}>

            <Ionicons name="arrow-back" size={18} color="#6b7280" />
            <Text style={styles.backButtonText}>Anterior</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.nextButton,
              (!emailValidation.isValid || isLoading || isValidatingEmail || !formData.macAddress.trim()) && styles.nextButtonDisabled]
            }
            onPress={handleNext}
            disabled={!emailValidation.isValid || isLoading || isValidatingEmail || !formData.macAddress.trim()}
            activeOpacity={0.8}>

            {isLoading ?
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.nextButtonText, { marginLeft: 8 }]}>
                  {solicitudExistente ? 'Reabriendo...' : 'Enviando...'}
                </Text>
              </> :

              <>
                <Text style={styles.nextButtonText}>
                  {solicitudExistente ? 'Reabrir Solicitud' : 'Enviar Solicitud'}
                </Text>
                <Ionicons name="send" size={14} color="#fff" />
              </>
            }
          </TouchableOpacity>
        </View>
      </View>

      { }
      <Modal
        visible={showMacHelp}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMacHelp(false)}>

        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <Ionicons name="hardware-chip" size={24} color="#2563eb" />
              </View>
              <Text style={styles.modalTitle}>Buscar MAC Wi-Fi</Text>
              <TouchableOpacity onPress={() => setShowMacHelp(false)} style={styles.closeModalButton}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {Platform.OS === 'android' ?
                <>
                  <View style={styles.stepItem}>
                    <Ionicons name="settings-outline" size={22} color="#4b5563" />
                    <Text style={styles.stepText}>Abre la aplicación de Configuración o Ajustes</Text>
                  </View>
                  <View style={styles.stepItem}>
                    <Ionicons name="information-circle-outline" size={22} color="#4b5563" />
                    <Text style={styles.stepText}>Desplázate hacia abajo y toca en "Acerca del teléfono"</Text>
                  </View>
                  <View style={styles.stepItem}>
                    <Ionicons name="list-outline" size={22} color="#4b5563" />
                    <Text style={styles.stepText}>Busca "Estado", "Información de hardware" o "Dirección MAC de Wi-Fi"</Text>
                  </View>
                </> :

                <>
                  <View style={styles.stepItem}>
                    <Ionicons name="settings-outline" size={22} color="#4b5563" />
                    <Text style={styles.stepText}>Abre la aplicación de Configuración</Text>
                  </View>
                  <View style={styles.stepItem}>
                    <Ionicons name="cog-outline" size={22} color="#4b5563" />
                    <Text style={styles.stepText}>Toca en "General"</Text>
                  </View>
                  <View style={styles.stepItem}>
                    <Ionicons name="information-circle-outline" size={22} color="#4b5563" />
                    <Text style={styles.stepText}>Toca en "Información"</Text>
                  </View>
                  <View style={styles.stepItem}>
                    <Ionicons name="wifi-outline" size={22} color="#4b5563" />
                    <Text style={styles.stepText}>Busca la fila "Dirección Wi-Fi" (esa es tu MAC)</Text>
                  </View>
                </>
              }

              <View style={styles.macFormatNote}>
                <Ionicons name="alert-circle-outline" size={16} color="#047857" />
                <Text style={styles.macFormatText}>El formato se ve como: A1:B2:C3:D4:E5:F6</Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              {Platform.OS === 'android' &&
                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  onPress={() => {
                    Linking.sendIntent('android.settings.DEVICE_INFO_SETTINGS').catch(() => {

                      Linking.sendIntent('android.settings.SETTINGS').catch(() => {
                        Alert.alert("Aviso", "No se pudo abrir la configuración automáticamente, por favor hazlo manualmente.");
                      });
                    });
                  }}>

                  <Ionicons name="open-outline" size={16} color="#fff" />
                  <Text style={styles.modalPrimaryButtonText}>Abrir Ajustes</Text>
                </TouchableOpacity>
              }

              <TouchableOpacity
                style={[styles.modalSecondaryButton, Platform.OS !== 'android' && { width: '100%' }]}
                onPress={() => setShowMacHelp(false)}>

                <Text style={styles.modalSecondaryButtonText}>Cerrar Ayuda</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280'
  },
  header: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingBottom: 16
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#dbeafe',
    marginBottom: 14
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  stepComplete: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepActiveText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: 'bold'
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#10b981',
    marginHorizontal: 8,
    maxWidth: 80,
    borderRadius: 2
  },
  stepInactive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepInactiveText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: 'bold'
  },
  stepLineInactive: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 8,
    maxWidth: 80,
    borderRadius: 2
  },
  contentArea: {
    flex: 1,
    padding: 14
  },
  retryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fde68a'
  },
  retryText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
    fontWeight: '600'
  },
  empresaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  empresaInfo: {
    flex: 1,
    marginLeft: 10
  },
  empresaLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 1
  },
  empresaNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af'
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f4'
  },
  fieldContainer: {
    marginBottom: 10
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4
  },
  required: {
    color: '#ef4444'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10
  },
  inputWrapperReadonly: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db'
  },
  inputWrapperValid: {
    borderColor: '#10b981',
    borderWidth: 2,
    backgroundColor: '#f0fdf4'
  },
  inputWrapperInvalid: {
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: '#fef2f2'
  },
  inputIcon: {
    marginRight: 6
  },
  input: {
    flex: 1,
    height: 38,
    fontSize: 13,
    color: '#374151'
  },
  inputReadonly: {
    color: '#6b7280'
  },
  helpText: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 3,
    marginLeft: 2
  },
  validatingText: {
    fontSize: 11,
    color: '#2563eb',
    marginTop: 4,
    marginLeft: 2
  },
  validationMessage: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2
  },
  validMessage: {
    color: '#10b981'
  },
  invalidMessage: {
    color: '#ef4444'
  },
  deviceInfoRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  deviceInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  deviceInfoChipText: {
    fontSize: 11,
    color: '#1e40af',
    fontWeight: '500'
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fde68a'
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: '#92400e',
    lineHeight: 15
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12
  },
  backButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600'
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4
  },
  nextButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6
  },
  macHelpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-start',
    borderRadius: 8
  },
  macHelpButtonText: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  modalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1
  },
  closeModalButton: {
    padding: 4
  },
  modalScroll: {
    maxHeight: 300
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20
  },
  macFormatNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0'
  },
  macFormatText: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '500',
    flex: 1
  },
  modalActions: {
    gap: 10,
    marginTop: 10
  },
  modalPrimaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  modalPrimaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  modalSecondaryButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  modalSecondaryButtonText: {
    color: '#4b5563',
    fontSize: 15,
    fontWeight: '700'
  }
});