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
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import config from '../../config/onboardingConfig.json';
import { verificarEmpresa } from '../../services/solicitudMovilService';

export const CompanyAffiliationScreen = ({ onNext, onPrevious }) => {
  const insets = useSafeAreaInsets();
  const { affiliation } = config;
  const [companyCode, setCompanyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    const trimmedCode = companyCode.trim();

    if (!trimmedCode) {
      Alert.alert('Error', 'Por favor ingresa el código de tu empresa');
      return;
    }

    // Validar longitud exacta de 8 caracteres
    if (trimmedCode.length !== 8) {
      Alert.alert(
        'Código Inválido', 
        'El código de empresa debe tener exactamente 8 caracteres.\nEjemplo: EMA00001'
      );
      return;
    }

    // Validar formato (3 letras + 5 números)
    const formatoValido = /^[A-Z]{3}\d{5}$/.test(trimmedCode);
    if (!formatoValido) {
      Alert.alert(
        'Formato Inválido',
        'El código debe tener el formato: 3 letras + 5 números\nEjemplo: EMA00001'
      );
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔍 Verificando empresa con código:', trimmedCode);

      const empresaInfo = await verificarEmpresa(trimmedCode);

      if (!empresaInfo.existe) {
        Alert.alert('Error', 'Código de empresa no válido');
        setIsLoading(false);
        return;
      }

      if (empresaInfo.activa === false) {
        Alert.alert('Error', 'Esta empresa no está activa');
        setIsLoading(false);
        return;
      }

      console.log('✅ Empresa verificada:', empresaInfo);

      onNext({
        empresaId: trimmedCode,
        empresaNombre: empresaInfo.nombre
      });

    } catch (error) {
      console.error('❌ Error verificando empresa:', error);
      Alert.alert(
        'Error',
        'No se pudo verificar el código de empresa. Por favor intenta nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header con Stepper */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>{affiliation.title}</Text>
        <Text style={styles.headerSubtitle}>{affiliation.subtitle}</Text>
        
        {/* Stepper en el Header */}
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

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={affiliation.icon} size={40} color="#2563eb" />
          </View>

          {/* Input Card */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Código de la Empresa</Text>
            <Text style={styles.formatHint}>Formato: 3 letras + 5 números (Ej: EMA00001)</Text>
            <TextInput
              style={styles.input}
              placeholder="EMA00001"
              placeholderTextColor="#9ca3af"
              value={companyCode}
              onChangeText={(text) => {
                const upperText = text.toUpperCase();
                // Limitar a 8 caracteres
                if (upperText.length <= 8) {
                  setCompanyCode(upperText);
                }
              }}
              autoCapitalize="characters"
              maxLength={8}
              editable={!isLoading}
            />
            {companyCode.length > 0 && (
              <Text style={[
                styles.charCounter,
                companyCode.length === 8 ? styles.charCounterValid : styles.charCounterInvalid
              ]}>
                {companyCode.length}/8 caracteres
              </Text>
            )}
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>{affiliation.helpText}</Text>
            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.supportText}>{affiliation.supportText}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer - Solo botones, sin stepper */}
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
            style={[styles.nextButton, (!companyCode || isLoading) && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!companyCode || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.nextButtonText, { marginLeft: 8 }]}>Verificando...</Text>
              </>
            ) : (
              <>
                <Text style={styles.nextButtonText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
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
  stepInactive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepInactiveText: {
    color: '#9ca3af',
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
  stepLineInactive: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 6,
    maxWidth: 80,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 40,
    paddingBottom: 100,
  },
  iconContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#eff6ff',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  inputCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textAlign: 'center',
  },
  formatHint: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    color: '#1f2937',
  },
  charCounter: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  charCounterValid: {
    color: '#10b981',
  },
  charCounterInvalid: {
    color: '#ef4444',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  supportText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
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