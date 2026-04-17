import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  TouchableWithoutFeedback } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verificarEmpresa } from '../../services/solicitudMovilService';
import * as Network from 'expo-network';
import syncManager from '../../services/offline/syncManager.mjs';

const AFFILIATION_CONFIG = {
  title: "Afiliación a la Empresa",
  subtitle: "Paso 1 de 3",
  icon: "business",
  helpText: "¿No tienes el código?",
  supportText: "Contacta a tu administrador"
};

export const CompanyAffiliationScreen = ({ onNext, onPrevious, initialEmpresaIdentificador }) => {
  const insets = useSafeAreaInsets();
  const affiliation = AFFILIATION_CONFIG;
  const [companyCode, setCompanyCode] = useState(initialEmpresaIdentificador || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedCompanyName, setVerifiedCompanyName] = useState('');
  const isPreFilled = !!(initialEmpresaIdentificador && companyCode === initialEmpresaIdentificador);

  const handleNext = async () => {
    const trimmedCode = companyCode.trim();

    if (!trimmedCode) {
      Alert.alert('Error', 'Por favor ingresa el código de tu empresa');
      return;
    }

    setIsLoading(true);

    try {
      (function () {})(' Verificando empresa:', trimmedCode);

      let currentIp = '127.0.0.1';
      try {
        currentIp = await Network.getIpAddressAsync();
      } catch (e) {
        (function () {})('No se pudo obtener la IP local', e);
      }

      const empresaInfo = await verificarEmpresa(trimmedCode, currentIp);

      (function () {})(' Resultado verificación:', {
        ...empresaInfo,
        ipDetectada: currentIp
      });

      if (!empresaInfo.existe) {
        Alert.alert(
          'Empresa no encontrada',
          'El código de empresa ingresado no existe. Verifica con tu administrador.'
        );
        setIsLoading(false);
        return;
      }

      if (empresaInfo.activa === false) {
        Alert.alert(
          'Empresa Inactiva',
          'Esta empresa no está activa en el sistema. Contacta a tu administrador.'
        );
        setIsLoading(false);
        return;
      }

      if (empresaInfo.fueraDeRed) {
        (function () {})('️ Dispositivo bloqueado: IP fuera de red permitida', {
          ipLocal: currentIp,
          alertasRed: empresaInfo.alertasRed
        });

        Alert.alert(
          'Fuera de Red',
          'Tu dispositivo no se encuentra en una red permitida por la empresa. Conéctate a la red Wi-Fi autorizada e inténtalo de nuevo.'
        );
        setIsLoading(false);
        return;
      }

      (function () {})(' Empresa y red válidas, continuando...');

      if (empresaInfo.token) {
        console.log('Token movil configurado en syncManager:', empresaInfo.token.substring(0, 15) + '...');
        syncManager.setAuthToken(empresaInfo.token);
      }

      setIsVerified(true);
      setVerifiedCompanyName(empresaInfo.nombre);
      setIsLoading(false);

      setTimeout(() => {
        onNext({
          empresaId: empresaInfo.id,
          empresaCodigo: trimmedCode,
          empresaNombre: empresaInfo.nombre
        });
      }, 1500);

    } catch (error) {
      (function () {})(' Error al verificar empresa:', error);

      Alert.alert(
        'Error de Conexión',
        error.message || 'No se pudo verificar el código de empresa. Por favor intenta nuevamente.'
      );
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

      {}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 16 : insets.top + 8 }]}>
        <Text style={styles.headerTitle}>{affiliation.title}</Text>
        <Text style={styles.headerSubtitle}>{affiliation.subtitle}</Text>

        {}
        <View style={styles.stepperContainer}>
          <View style={styles.stepActive}>
            <Text style={styles.stepActiveText}>1</Text>
          </View>
          <View style={styles.stepLineInactive} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepInactiveText}>2</Text>
          </View>
          <View style={styles.stepLineInactive} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepInactiveText}>3</Text>
          </View>
        </View>
      </View>

      {}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.content}>
            {}
            <View style={styles.iconContainer}>
              <Ionicons name={affiliation.icon} size={44} color="#2563eb" />
            </View>

            {}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Identificador de la Empresa</Text>
              <Text style={styles.formatHint}>Ingresa el código único proporcionado por tu empresa.</Text>

              <TextInput
                style={[styles.input, isVerified && styles.inputVerified]}
                placeholder="Identificador"
                placeholderTextColor="#9ca3af"
                value={companyCode}
                onChangeText={(text) => {
                  setCompanyCode(text.replace(/\s/g, ''));
                  setIsVerified(false);
                }}
                autoCapitalize="none"
                editable={!isLoading && !isVerified && !initialEmpresaIdentificador} />
              
              {isVerified &&
              <View style={styles.verifiedContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.verifiedText}>{verifiedCompanyName}</Text>
                </View>
              }
            </View>

            {}
            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>{affiliation.helpText}</Text>
              <TouchableOpacity disabled={isLoading}>
                <Text style={styles.supportText}>{affiliation.supportText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {}
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 20) : insets.bottom + 12 }]}>
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
            style={[styles.nextButton, (!companyCode || isLoading || isVerified) && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!companyCode || isLoading || isVerified}
            activeOpacity={0.8}>
            
            {isLoading ?
            <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.nextButtonText, { marginLeft: 8 }]}>Verificando...</Text>
              </> :
            isVerified ?
            <>
                <Text style={styles.nextButtonText}>Ingresando</Text>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </> :

            <>
                <Text style={styles.nextButtonText}>Verificar</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
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
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#10b981',
    marginHorizontal: 8,
    maxWidth: 80,
    borderRadius: 2
  },
  stepLineInactive: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 8,
    maxWidth: 80,
    borderRadius: 2
  },
  keyboardAvoid: {
    flex: 1
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconContainer: {
    width: 76,
    height: 76,
    backgroundColor: '#eff6ff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  inputCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f4'
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textAlign: 'center'
  },
  formatHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 14,
    fontStyle: 'italic'
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 16,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    color: '#1f2937'
  },
  inputVerified: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4'
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6
  },
  verifiedText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 14
  },
  helpContainer: {
    alignItems: 'center'
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4
  },
  supportText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb'
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
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
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  autoFilledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 6
  },
  autoFilledText: {
    fontSize: 11,
    color: '#1d4ed8',
    fontWeight: '600',
    flexShrink: 1
  }
});