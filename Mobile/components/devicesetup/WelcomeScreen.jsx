import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
      icon: "phone-portrait-outline",
      title: "Registra tu Dispositivo",
      description: "Configura la información de tu dispositivo",
      color: "#2563eb"
    },
    {
      number: 2,
      icon: "hardware-chip-outline",
      title: "Haz tu solicitud",
      description: "Preparate para crear tu solicitud",
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
  note: "Este proceso es necesario solo la primera vez que uses la aplicación. Asegúrate de tener el código de tu empresa a la mano."
};

export const WelcomeScreen = ({ onNext }) => {
  const insets = useSafeAreaInsets();
  const welcome = WELCOME_CONFIG;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header Blanco */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.logoContainer}>
          <Ionicons name="shield-checkmark" size={48} color="#2563eb" />
        </View>
        <Text style={styles.title}>{welcome.title}</Text>
        <Text style={styles.subtitle}>{welcome.subtitle}</Text>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Steps Cards */}
        {welcome.steps.map((step) => (
          <View key={step.number} style={styles.stepCard}>
            <View style={[styles.iconCircle, { backgroundColor: `${step.color}15` }]}>
              <Ionicons name={step.icon} size={28} color={step.color} />
            </View>
            
            <View style={styles.stepContent}>
              <View style={styles.stepTitleRow}>
                <View style={[styles.stepBadge, { backgroundColor: step.color }]}>
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
          <View style={styles.alertIconContainer}>
            <Ionicons name="information-circle" size={22} color="#2563eb" />
          </View>
          <Text style={styles.alertText}>{welcome.note}</Text>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 16) : insets.bottom + 16 }]}>
        <TouchableOpacity 
          style={styles.startButton}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Comenzar Configuración</Text>
          <Ionicons name="arrow-forward" size={22} color="#fff" />
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
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logoContainer: {
    width: 88,
    height: 88,
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#dbeafe',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  alertCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  alertIconContainer: {
    marginTop: 1,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 19,
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  startButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});