import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import config from './config/onboardingConfig.json';

export const WelcomeScreen = ({ onNext }) => {
  const { welcome } = config;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1e40af', '#2563eb']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo y Título */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="shield-checkmark" size={36} color="#2563eb" />
            </View>
            <Text style={styles.title}>{welcome.title}</Text>
            <Text style={styles.subtitle}>{welcome.subtitle}</Text>
          </View>

          {/* Pasos */}
          <View style={styles.stepsContainer}>
            {welcome.steps.map((step) => (
              <View key={step.number} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.number}</Text>
                </View>
                <View style={styles.stepContent}>
                  <View style={styles.stepHeader}>
                    <Ionicons name={step.icon} size={18} color="#fff" />
                    <Text style={styles.stepTitle}>{step.title}</Text>
                  </View>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Nota */}
          <View style={styles.noteCard}>
            <Ionicons name="information-circle" size={16} color="#60a5fa" />
            <Text style={styles.noteText}>{welcome.note}</Text>
          </View>
        </ScrollView>

        {/* Botón */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={onNext}
          activeOpacity={0.9}
        >
          <Text style={styles.startButtonText}>Comenzar</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#fff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#93c5fd',
    textAlign: 'center',
  },
  stepsContainer: {
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  stepDescription: {
    fontSize: 11,
    color: '#93c5fd',
    lineHeight: 16,
  },
  noteCard: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    color: '#fff',
    marginLeft: 8,
    lineHeight: 16,
  },
  startButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#1e3a8a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
});