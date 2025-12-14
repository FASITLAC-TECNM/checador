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
import config from '../../config/onboardingConfig.json';

export const WelcomeScreen = ({ onNext }) => {
  const { welcome } = config;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1e3a8a', '#1e40af', '#2563eb']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.logoContainer}>
              <Ionicons name="shield-checkmark" size={50} color="#2563eb" />
            </View>
            <Text style={styles.title}>{welcome.title}</Text>
            <Text style={styles.subtitle}>{welcome.subtitle}</Text>
          </View>

          {/* Steps Grid */}
          <View style={styles.stepsGrid}>
            {welcome.steps.map((step) => (
              <View key={step.number} style={styles.stepCard}>
                <View style={[styles.stepNumber, { backgroundColor: step.color }]}>
                  <Text style={styles.stepNumberText}>{step.number}</Text>
                </View>
                <View style={styles.stepIconContainer}>
                  <Ionicons name={step.icon} size={32} color="#fff" />
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            ))}
          </View>

          {/* Note */}
          <View style={styles.noteCard}>
            <Ionicons name="information-circle" size={20} color="#f59e0b" />
            <Text style={styles.noteText}>{welcome.note}</Text>
          </View>
        </ScrollView>

        {/* Start Button */}
        <TouchableOpacity 
          style={styles.startButton}
          onPress={onNext}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#fff', '#f3f4f6']}
            style={styles.startButtonGradient}
          >
            <Text style={styles.startButtonText}>Comenzar Configuración</Text>
            <Ionicons name="arrow-forward" size={24} color="#2563eb" />
          </LinearGradient>
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
  headerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#93c5fd',
    textAlign: 'center',
  },
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stepCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stepIconContainer: {
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 11,
    color: '#93c5fd',
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
    marginLeft: 10,
    lineHeight: 18,
  },
  startButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginRight: 10,
  },
});