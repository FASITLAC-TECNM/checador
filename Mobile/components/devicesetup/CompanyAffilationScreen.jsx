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
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from '../../config/onboardingConfig.json';

export const CompanyAffiliationScreen = ({ onNext, onPrevious }) => {
  const { affiliation } = config;
  const [companyCode, setCompanyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (!companyCode) {
      alert('Por favor ingresa el código de tu empresa');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onNext({ companyCode });
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{affiliation.title}</Text>
        <Text style={styles.headerSubtitle}>{affiliation.subtitle}</Text>
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
            <TextInput
              style={styles.input}
              placeholder={affiliation.placeholder}
              placeholderTextColor="#9ca3af"
              value={companyCode}
              onChangeText={(text) => setCompanyCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={15}
            />
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>{affiliation.helpText}</Text>
            <TouchableOpacity>
              <Text style={styles.supportText}>{affiliation.supportText}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.stepper}>
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={16} color="#fff" />
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

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onPrevious}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Anterior</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextButton, (!companyCode || isLoading) && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!companyCode || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
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
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 40,
  },
  iconContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#eff6ff',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  inputCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    color: '#1f2937',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  supportText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  footer: {
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
  stepComplete: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#10b981',
    marginHorizontal: 4,
  },
  stepLineInactive: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
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
