import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from '../../config/onboardingConfig.json';

export const VerificationCodeScreen = ({ email, onNext, onPrevious }) => {
  const { verification } = config;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef([]);

  const handleCodeChange = (text, index) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < verification.codeLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const fullCode = code.join('');
    if (fullCode.length !== verification.codeLength) {
      alert('Por favor ingresa el código completo');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onNext({ verificationCode: fullCode });
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{verification.title}</Text>
        <Text style={styles.headerSubtitle}>{verification.subtitle}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name={verification.icon} size={50} color="#2563eb" />
        </View>

        {/* Email Card */}
        <View style={styles.emailCard}>
          <Text style={styles.emailMessage}>{verification.message}</Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {/* Code Input */}
        <Text style={styles.codeLabel}>Código de Verificación</Text>
        <View style={styles.codeContainer}>
          {Array.from({ length: verification.codeLength }).map((_, index) => (
            <TextInput
              key={index}
              ref={ref => inputRefs.current[index] = ref}
              style={styles.codeInput}
              maxLength={1}
              keyboardType="number-pad"
              value={code[index]}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
            />
          ))}
        </View>

        {/* Resend */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>{verification.resendText}</Text>
          <TouchableOpacity>
            <Text style={styles.resendButton}>{verification.resendButton}</Text>
          </TouchableOpacity>
        </View>
      </View>

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
          <View style={styles.stepLineInactive} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepInactiveText}>4</Text>
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
            style={[
              styles.nextButton,
              (code.join('').length !== verification.codeLength || isLoading) && styles.nextButtonDisabled
            ]}
            onPress={handleVerify}
            disabled={code.join('').length !== verification.codeLength || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>Verificar</Text>
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
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#eff6ff',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  emailCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  emailMessage: {
    fontSize: 12,
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: 6,
  },
  emailText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a8a',
    textAlign: 'center',
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  codeInput: {
    width: 45,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  resendButton: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepComplete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActiveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepInactive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepInactiveText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#10b981',
    marginHorizontal: 6,
  },
  stepLineInactive: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
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
    padding: 12,
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
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
});
