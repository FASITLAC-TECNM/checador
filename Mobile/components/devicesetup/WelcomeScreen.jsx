import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WELCOME_CONFIG = {
  title: "Bienvenido al Sistema de Checador",
  subtitle: "Configura tu dispositivo en 3 simples pasos",
  steps: [
    {
      number: 1,
      icon: "business-outline",
      title: "Valida tu empresa",
      description: "Prepara tu solicitud de empresa",
      color: "#2563eb"
    },
    {
      number: 2,
      icon: "phone-portrait-outline",
      title: "Registra tu Dispositivo",
      description: "Envia la información de tu dispositivo",
      color: "#2563eb"
    },
    {
      number: 3,
      icon: "checkmark-circle-outline",
      title: "Obtén Aprobación",
      description: "Espera la autorización del administrador",
      color: "#2563eb"
    }
  ],
  note: "Este proceso es necesario solo la primera vez que uses la aplicación. Asegúrate de tener el código de tu empresa a la mano y una conexión a internet."
};

export const WelcomeScreen = ({ onNext }) => {
  const insets = useSafeAreaInsets();
  const welcome = WELCOME_CONFIG;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

      {/* Header Azul */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 16 : insets.top + 8 }]}>
        <View style={styles.logoContainer}>
          <Ionicons name="shield-checkmark" size={32} color="#fff" />
        </View>
        <Text style={styles.title}>{welcome.title}</Text>
        <Text style={styles.subtitle}>{welcome.subtitle}</Text>
      </View>

      {/* Content — Static, no scroll */}
      <View style={styles.content}>
        {/* Steps Cards */}
        {welcome.steps.map((step) => (
          <View key={step.number} style={styles.stepCard}>
            <View style={styles.iconCircle}>
              <Ionicons name={step.icon} size={22} color="#2563eb" />
            </View>

            <View style={styles.stepContent}>
              <View style={styles.stepTitleRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{step.number}</Text>
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>
        ))}

        {/* Info Alert */}
        <View style={styles.alertCard}>
          <Ionicons name="information-circle" size={20} color="#2563eb" />
          <Text style={styles.alertText}>{welcome.note}</Text>
        </View>
      </View>

      {/* Footer Button */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 20) : insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Comenzar Configuración</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
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
  header: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#dbeafe',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f4',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  stepDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
  },
  alertCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginTop: 4,
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 17,
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  startButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
});